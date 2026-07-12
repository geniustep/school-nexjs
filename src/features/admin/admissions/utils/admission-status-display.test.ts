import { describe, expect, it } from 'vitest';
import { normalizeAdmissionDecision } from './normalize-admission-decision';
import {
  admissionOutcomeFilterLabelKey,
  buildAdmissionOutcomeFilterQuery,
  formatOfferStateLabelKey,
  resolveAdmissionPrimaryDisplay,
  resolveAdmissionStatusBadges,
  resolveFamilyBatchMixedSummary,
  resolveIsSchoolRejected,
  resolveRegistrationStatus,
  statusWarningLabelKey,
} from './admission-status-display';
import { normalizeAdmissionDetail, normalizeAdmissionListItem } from './normalize-admission-record';
import { isAdmissionRejected } from './admission-rejection';
import type { AdmissionDetail, AdmissionListItem } from '@/types/admission';

function baseList(overrides: Partial<AdmissionListItem> = {}): AdmissionListItem {
  return {
    id: 1,
    student_name: 'Child',
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
    ...overrides,
  };
}

describe('normalizeAdmissionDecision', () => {
  it('normalizes flat decision fields from Odoo', () => {
    const decision = normalizeAdmissionDecision({
      decision: 'accepted',
      decision_date: '2026-06-20',
      decision_notes: 'Ok',
      decision_user: { id: 2, name: 'Admin' },
      conditions: 'docs',
    });
    expect(decision).toEqual({
      decision: 'accepted',
      decision_date: '2026-06-20',
      decision_notes: 'Ok',
      decision_user: { id: 2, name: 'Admin' },
      conditions: 'docs',
    });
  });

  it('returns null for decision=false', () => {
    expect(normalizeAdmissionDecision({ decision: false })).toBeNull();
  });

  it('keeps nested decision object as fallback', () => {
    const decision = normalizeAdmissionDecision({
      decision: {
        decision: 'waitlisted',
        decision_date: '2026-01-01',
        decision_user: null,
        decision_notes: null,
        conditions: null,
      },
    });
    expect(decision?.decision).toBe('waitlisted');
    expect(decision?.decision_date).toBe('2026-01-01');
  });
});

describe('registration / rejection display', () => {
  it('shows awaiting registration label', () => {
    const primary = resolveAdmissionPrimaryDisplay(
      baseList({
        state: 'accepted',
        registration_status: 'awaiting_registration',
        decision: 'accepted',
      }),
    );
    expect(primary.kind).toBe('awaiting_registration');
    expect(primary.labelKey).toContain('awaiting_registration');
  });

  it('gives registered priority when student is linked', () => {
    const primary = resolveAdmissionPrimaryDisplay(
      baseList({
        state: 'accepted',
        student_id: 99,
        registration_status: 'registered',
        is_school_rejected: false,
      }),
    );
    expect(primary.kind).toBe('registered');
  });

  it('shows ready_for_registration when state is confirmed and not registered', () => {
    const primary = resolveAdmissionPrimaryDisplay(
      baseList({
        state: 'confirmed',
        registration_status: 'awaiting_registration',
        decision: 'accepted',
      }),
    );
    expect(primary.kind).toBe('ready_for_registration');
    expect(primary.labelKey).toContain('ready_for_registration');
  });

  it('shows school rejected from is_school_rejected', () => {
    const primary = resolveAdmissionPrimaryDisplay(
      baseList({
        state: 'lost',
        is_school_rejected: true,
        decision: 'rejected',
        registration_status: 'not_applicable',
      }),
    );
    expect(primary.kind).toBe('school_rejected');
  });

  it('does not treat lost without rejection as school rejected', () => {
    expect(
      resolveIsSchoolRejected(
        baseList({ state: 'lost', decision: false, is_school_rejected: false }),
      ),
    ).toBe(false);
    expect(
      isAdmissionRejected({
        state: 'lost',
        decision: null,
        is_school_rejected: false,
        rejection: { is_rejected: false },
      } as AdmissionDetail),
    ).toBe(false);
  });

  it('does not treat offer declined as school rejection', () => {
    expect(
      resolveIsSchoolRejected(
        baseList({
          state: 'lost',
          offer_state: 'declined',
          decision: 'accepted',
          is_school_rejected: false,
        }),
      ),
    ).toBe(false);
    const badges = resolveAdmissionStatusBadges(
      baseList({
        state: 'lost',
        offer_state: 'declined',
        decision: 'accepted',
        registration_status: 'not_applicable',
      }),
    );
    expect(badges.some((b) => b.key === 'offer:declined')).toBe(true);
    expect(badges.some((b) => b.key === 'primary:school_rejected')).toBe(false);
  });

  it('translates declined and expired offer keys', () => {
    expect(formatOfferStateLabelKey('declined')).toBe('admin.admissions.offerStates.declined');
    expect(formatOfferStateLabelKey('expired')).toBe('admin.admissions.offerStates.expired');
  });
});

describe('server-side outcome filters', () => {
  it('builds awaiting_registration query', () => {
    expect(buildAdmissionOutcomeFilterQuery('awaiting_registration')).toEqual({
      registration_status: 'awaiting_registration',
    });
  });

  it('builds registered query', () => {
    expect(buildAdmissionOutcomeFilterQuery('registered')).toEqual({
      registration_status: 'registered',
    });
  });

  it('builds school rejected via decision=rejected', () => {
    expect(buildAdmissionOutcomeFilterQuery('school_rejected')).toEqual({
      decision: 'rejected',
    });
  });

  it('builds family declined and expired offer queries', () => {
    expect(buildAdmissionOutcomeFilterQuery('family_declined')).toEqual({
      offer_state: 'declined',
    });
    expect(buildAdmissionOutcomeFilterQuery('expired_offer')).toEqual({
      offer_state: 'expired',
    });
  });

  it('does not invent no_response filter', () => {
    expect(admissionOutcomeFilterLabelKey('' as never)).toBeNull();
    expect(Object.keys(buildAdmissionOutcomeFilterQuery(''))).toHaveLength(0);
  });
});

describe('detail normalize + warnings + family', () => {
  it('detail normalize exposes real flat decision', () => {
    const detail = normalizeAdmissionDetail({
      id: 62,
      student_name: 'X',
      state: 'confirmed',
      decision: 'accepted',
      decision_date: '2026-06-20',
      decision_notes: 'Stabil QA',
      decision_user: { id: 2, name: 'Administrator' },
      allowed_actions: ['decide', 'link_student'],
      rejection: { is_rejected: false },
    } as unknown as AdmissionDetail);

    expect(detail.decision).toEqual(
      expect.objectContaining({
        decision: 'accepted',
        decision_date: '2026-06-20',
        decision_notes: 'Stabil QA',
      }),
    );
    expect(detail.allowed_actions.link_student).toBe(true);
  });

  it('awaiting message path uses awaiting registration status', () => {
    const item = normalizeAdmissionListItem(
      baseList({
        state: 'accepted',
        decision: 'accepted',
        registration_status: 'awaiting_registration',
        student_id: false,
      }),
    );
    expect(resolveRegistrationStatus(item).status).toBe('awaiting_registration');
  });

  it('keeps converted_at and status warnings without mutating state', () => {
    const detail = normalizeAdmissionDetail({
      id: 1,
      student_name: 'X',
      state: 'accepted',
      decision: 'accepted',
      converted_at: '2026-06-20 21:45:18',
      status_warnings: ['registration_linked_without_student'],
      student_id: false,
      registration_flow_state: 'linked',
      allowed_actions: {},
    } as unknown as AdmissionDetail);

    expect(detail.converted_at).toBe('2026-06-20 21:45:18');
    expect(detail.status_warnings).toEqual(['registration_linked_without_student']);
    expect(detail.state).toBe('accepted');
    expect(statusWarningLabelKey('registration_linked_without_student')).toContain(
      'registration_linked_without_student',
    );
  });

  it('family children keep independent registration statuses', () => {
    const a = normalizeAdmissionListItem(
      baseList({
        id: 1,
        registration_status: 'awaiting_registration',
        decision: 'accepted',
        state: 'accepted',
      }),
    );
    const b = normalizeAdmissionListItem(
      baseList({
        id: 2,
        registration_status: 'registered',
        student_id: 10,
        state: 'accepted',
      }),
    );
    expect(resolveRegistrationStatus(a).status).toBe('awaiting_registration');
    expect(resolveRegistrationStatus(b).status).toBe('registered');
    expect(resolveFamilyBatchMixedSummary([a, b])).toBe('mixed');
    expect(resolveFamilyBatchMixedSummary([a, a])).toBe('uniform');
  });
});
