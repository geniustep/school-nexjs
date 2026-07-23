import { describe, expect, it } from 'vitest';
import type { FamilyBatchApplicationSummary } from '@/types/admission';
import {
  canShowFamilyBatchSelectiveConversion,
  isFamilyBatchModernContractPresent,
  listEligibleFamilyBatchApplicationIds,
  parseFamilyBatchConvertRequestBody,
  resolveFamilyBatchConvertEligibility,
} from './family-batch-selective-conversion';
import {
  FamilyBatchConvertIdempotencySession,
  fingerprintConvertApplicationIds,
  sortConvertApplicationIds,
} from './family-batch-selective-conversion-idempotency';
import {
  familyBatchConvertAppStatusLabelKey,
  familyBatchConvertSummaryKey,
  isFamilyBatchConvertIdempotencyConflict,
  isFamilyBatchConvertNetworkUncertainty,
  normalizeFamilyBatchConvertResult,
  resolveFamilyBatchConvertUiOutcome,
} from './family-batch-selective-conversion-errors';
import {
  detectFamilyBatchModernContractPresent,
  normalizeFamilyBatchApplication,
} from './normalize-admission-record';
import { endpoints } from '@/lib/api/endpoints';

function app(
  overrides: Partial<FamilyBatchApplicationSummary> & { id: number; student_name: string },
): FamilyBatchApplicationSummary {
  return {
    state: 'confirmed',
    ...overrides,
  };
}

/** Real Family Batch summary shape from Odoo 242 (modern fields absent). */
function familyBatchSummaryReadyApp(
  overrides: Partial<FamilyBatchApplicationSummary> & { id: number; student_name: string },
): FamilyBatchApplicationSummary {
  const { id, student_name, state, student_id, registration_readiness, ...rest } = overrides;
  const wire: Record<string, unknown> = {
    id,
    student_name,
    state: state ?? 'confirmed',
    registration_readiness: registration_readiness ?? 'ready',
    student_id: student_id ?? null,
    ...rest,
  };
  // Simulate wire payload: omit modern keys entirely when not supplied by the caller.
  if (!Object.prototype.hasOwnProperty.call(overrides, 'modern_allowed_actions')) {
    delete wire.modern_allowed_actions;
  }
  if (!Object.prototype.hasOwnProperty.call(overrides, 'application_status')) {
    delete wire.application_status;
  }
  if (!Object.prototype.hasOwnProperty.call(overrides, 'primary_next_action')) {
    delete wire.primary_next_action;
  }
  return normalizeFamilyBatchApplication(wire as unknown as FamilyBatchApplicationSummary);
}

describe('family-batch selective conversion eligibility', () => {
  it('allows selecting eligible convert_to_student applications', () => {
    const eligible = app({
      id: 1,
      student_name: 'أيمن',
      application_status: 'ready_for_registration',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      primary_next_action: 'convert_to_student',
      modern_contract_present: true,
    });
    expect(resolveFamilyBatchConvertEligibility(eligible)).toEqual({
      selectable: true,
      reason: 'eligible',
    });
  });

  it('blocks already registered and ineligible applications', () => {
    const registered = app({
      id: 2,
      student_name: 'ليلى',
      application_status: 'registered',
      student_id: 88,
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      modern_contract_present: true,
    });
    expect(resolveFamilyBatchConvertEligibility(registered).reason).toBe('already_registered');
    expect(resolveFamilyBatchConvertEligibility(registered).selectable).toBe(false);

    const denied = app({
      id: 3,
      student_name: 'سامي',
      application_status: 'accepted',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: false }],
      modern_contract_present: true,
      conversion_eligible: false,
      conversion_ineligible_reason: 'Incomplete documents',
    });
    const deniedEligibility = resolveFamilyBatchConvertEligibility(denied);
    expect(deniedEligibility.selectable).toBe(false);
    expect(deniedEligibility.reason).toBe('ineligible');
    expect(deniedEligibility.detailMessage).toBe('Incomplete documents');
  });

  it('treats real Family Batch summary (ready, modern fields absent) as eligible after normalize', () => {
    const normalized = familyBatchSummaryReadyApp({
      id: 6413,
      student_name: 'تلميذ اختبار مؤهل',
      name: 'ADM/2026/06416',
    });
    expect(normalized.modern_allowed_actions).toEqual([]);
    expect(normalized.modern_contract_present).toBe(false);
    expect(isFamilyBatchModernContractPresent(normalized)).toBe(false);
    expect(resolveFamilyBatchConvertEligibility(normalized)).toEqual({
      selectable: true,
      reason: 'eligible',
    });
  });

  it('does not treat normalized empty modern_allowed_actions as modern-contract presence', () => {
    const raw = {
      id: 10,
      student_name: 'x',
      state: 'confirmed',
      registration_readiness: 'ready',
      student_id: null,
    };
    expect(detectFamilyBatchModernContractPresent(raw)).toBe(false);
    const once = normalizeFamilyBatchApplication(raw as FamilyBatchApplicationSummary);
    const twice = normalizeFamilyBatchApplication(once);
    expect(once.modern_contract_present).toBe(false);
    expect(twice.modern_contract_present).toBe(false);
    expect(isFamilyBatchModernContractPresent(twice)).toBe(false);
    expect(resolveFamilyBatchConvertEligibility(twice).selectable).toBe(true);
  });

  it('blocks readiness fallback when modern_allowed_actions is explicitly empty', () => {
    const explicitEmpty = app({
      id: 11,
      student_name: 'y',
      registration_readiness: 'ready',
      student_id: null,
      modern_allowed_actions: [],
      modern_contract_present: true,
    });
    expect(isFamilyBatchModernContractPresent(explicitEmpty)).toBe(true);
    expect(resolveFamilyBatchConvertEligibility(explicitEmpty)).toEqual({
      selectable: false,
      reason: 'ineligible',
      detailMessage: null,
    });
  });

  it('allows modern convert_to_student permission and blocks explicit modern deny', () => {
    const allowed = app({
      id: 12,
      student_name: 'a',
      application_status: 'ready_for_registration',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      modern_contract_present: true,
    });
    expect(resolveFamilyBatchConvertEligibility(allowed).selectable).toBe(true);

    const denied = app({
      id: 13,
      student_name: 'b',
      application_status: 'ready_for_registration',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: false }],
      registration_readiness: 'ready',
      modern_contract_present: true,
    });
    expect(resolveFamilyBatchConvertEligibility(denied).selectable).toBe(false);
    expect(resolveFamilyBatchConvertEligibility(denied).reason).toBe('ineligible');
  });

  it('rejects non-ready readiness when modern contract is absent', () => {
    const notReady = familyBatchSummaryReadyApp({
      id: 14,
      student_name: 'c',
      registration_readiness: 'blocked',
    });
    expect(notReady.modern_contract_present).toBe(false);
    expect(resolveFamilyBatchConvertEligibility(notReady).selectable).toBe(false);
    expect(resolveFamilyBatchConvertEligibility(notReady).reason).toBe('not_ready');
  });

  it('rejects applications with student_id or registered status', () => {
    const withStudent = familyBatchSummaryReadyApp({
      id: 15,
      student_name: 'd',
      student_id: 501,
    });
    expect(resolveFamilyBatchConvertEligibility(withStudent).reason).toBe('already_registered');

    const registered = app({
      id: 16,
      student_name: 'e',
      application_status: 'registered',
      modern_contract_present: true,
    });
    expect(resolveFamilyBatchConvertEligibility(registered).reason).toBe('already_registered');
  });

  it('select-all eligible returns only convertible ids sorted', () => {
    const rows = [
      app({
        id: 30,
        student_name: 'a',
        application_status: 'ready_for_registration',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
        modern_contract_present: true,
      }),
      app({
        id: 10,
        student_name: 'b',
        application_status: 'registered',
        student_id: 1,
        modern_contract_present: true,
      }),
      app({
        id: 20,
        student_name: 'c',
        application_status: 'ready_for_registration',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
        modern_contract_present: true,
      }),
      app({
        id: 40,
        student_name: 'd',
        application_status: 'new',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: false }],
        modern_contract_present: true,
      }),
    ];
    expect(listEligibleFamilyBatchApplicationIds(rows)).toEqual([20, 30]);
    expect(canShowFamilyBatchSelectiveConversion(rows)).toBe(true);
    expect(canShowFamilyBatchSelectiveConversion([rows[1], rows[3]])).toBe(false);
  });

  it('marks both ready summary apps eligible without modern fields', () => {
    const rows = [
      familyBatchSummaryReadyApp({ id: 6413, student_name: 'مؤهل' }),
      familyBatchSummaryReadyApp({ id: 6414, student_name: 'غير مختار' }),
    ];
    expect(listEligibleFamilyBatchApplicationIds(rows)).toEqual([6413, 6414]);
    expect(canShowFamilyBatchSelectiveConversion(rows)).toBe(true);
  });
});

describe('family-batch selective conversion idempotency', () => {
  it('keeps the same key for the same selection and changes on selection change', () => {
    const session = new FamilyBatchConvertIdempotencySession();
    const key1 = session.ensureKey([103, 101]);
    const key2 = session.ensureKey([101, 103]);
    expect(key1).toBe(key2);
    expect(fingerprintConvertApplicationIds([103, 101])).toBe('101,103');
    expect(sortConvertApplicationIds([103, 101])).toEqual([101, 103]);

    session.reset();
    const key3 = session.ensureKey([101]);
    expect(key3).not.toBe(key1);
    const key4 = session.ensureKey([101, 103]);
    expect(key4).not.toBe(key3);
  });
});

describe('family-batch selective conversion results', () => {
  it('normalizes counters and maps outcomes without relying on message text', () => {
    const result = normalizeFamilyBatchConvertResult({
      batch_id: 55,
      status: 'partially_completed',
      applications: [
        { application_id: 101, status: 'succeeded', student_id: 9, message: 'ok' },
        { application_id: 102, status: 'failed', student_id: null, message: 'nope' },
        { application_id: 103, status: 'already_registered', student_id: 11 },
        { application_id: 104, status: 'replayed', student_id: 12, replayed: true },
      ],
    });
    expect(result?.status).toBe('partially_completed');
    expect(resolveFamilyBatchConvertUiOutcome(result)).toBe('partially_completed');
    expect(familyBatchConvertSummaryKey('partially_completed')).toContain('partiallyCompleted');
    expect(familyBatchConvertAppStatusLabelKey('already_registered')).toContain('alreadyRegistered');
    expect(familyBatchConvertAppStatusLabelKey('replayed')).toContain('replayed');
  });

  it('detects idempotency conflict and network uncertainty', () => {
    expect(
      isFamilyBatchConvertIdempotencyConflict({
        code: 'idempotency_conflict',
        message: 'x',
        details: { status: 409 },
      }),
    ).toBe(true);
    expect(
      isFamilyBatchConvertNetworkUncertainty({
        code: 'network_error',
        message: 'x',
        details: { status: 0 },
      }, 0),
    ).toBe(true);
  });
});

describe('family-batch selective conversion request validation', () => {
  it('requires idempotency_key and non-empty unique application_ids', () => {
    expect(parseFamilyBatchConvertRequestBody(null).ok).toBe(false);
    expect(parseFamilyBatchConvertRequestBody({ idempotency_key: '', application_ids: [1] }).ok).toBe(
      false,
    );
    expect(parseFamilyBatchConvertRequestBody({ idempotency_key: 'k', application_ids: [] }).ok).toBe(
      false,
    );
  });
});

describe('family-batch selective conversion endpoint contract', () => {
  it('uses collective convert-to-students and does not point at batch-registration', () => {
    expect(endpoints.admin.admissionFamilyBatchConvertToStudents(55)).toBe(
      '/admin/admissions/family-batches/55/convert-to-students',
    );
    expect(endpoints.admin.studentsBatchRegistration).toBe('/admin/students/batch-registration');
    expect(endpoints.admin.admissionFamilyBatchConvertToStudents(1)).not.toBe(
      endpoints.admin.studentsBatchRegistration,
    );
    expect(endpoints.admin.admissionActions(9)).toBe('/admin/admissions/9/actions');
  });
});
