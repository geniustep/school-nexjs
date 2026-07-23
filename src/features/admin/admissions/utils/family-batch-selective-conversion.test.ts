import { describe, expect, it } from 'vitest';
import type { FamilyBatchApplicationSummary } from '@/types/admission';
import {
  canShowFamilyBatchSelectiveConversion,
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
import { endpoints } from '@/lib/api/endpoints';

function app(
  overrides: Partial<FamilyBatchApplicationSummary> & { id: number; student_name: string },
): FamilyBatchApplicationSummary {
  return {
    state: 'confirmed',
    ...overrides,
  };
}

describe('family-batch selective conversion eligibility', () => {
  it('allows selecting eligible convert_to_student applications', () => {
    const eligible = app({
      id: 1,
      student_name: 'أيمن',
      application_status: 'ready_for_registration',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      primary_next_action: 'convert_to_student',
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
    });
    expect(resolveFamilyBatchConvertEligibility(registered).reason).toBe('already_registered');
    expect(resolveFamilyBatchConvertEligibility(registered).selectable).toBe(false);

    const denied = app({
      id: 3,
      student_name: 'سامي',
      application_status: 'accepted',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: false }],
      conversion_eligible: false,
      conversion_ineligible_reason: 'Incomplete documents',
    });
    const deniedEligibility = resolveFamilyBatchConvertEligibility(denied);
    expect(deniedEligibility.selectable).toBe(false);
    expect(deniedEligibility.reason).toBe('ineligible');
    expect(deniedEligibility.detailMessage).toBe('Incomplete documents');
  });

  it('select-all eligible returns only convertible ids sorted', () => {
    const rows = [
      app({
        id: 30,
        student_name: 'a',
        application_status: 'ready_for_registration',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      }),
      app({
        id: 10,
        student_name: 'b',
        application_status: 'registered',
        student_id: 1,
      }),
      app({
        id: 20,
        student_name: 'c',
        application_status: 'ready_for_registration',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      }),
      app({
        id: 40,
        student_name: 'd',
        application_status: 'new',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: false }],
      }),
    ];
    expect(listEligibleFamilyBatchApplicationIds(rows)).toEqual([20, 30]);
    expect(canShowFamilyBatchSelectiveConversion(rows)).toBe(true);
    expect(canShowFamilyBatchSelectiveConversion([rows[1], rows[3]])).toBe(false);
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
