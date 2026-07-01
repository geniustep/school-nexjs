import { describe, expect, it } from 'vitest';
import type { AdmissionDetail } from '@/types/admission';
import {
  canReopenAdmission,
  isAdmissionRejected,
  resolveRejectionReason,
  shouldBlockStudentConversion,
} from '@/features/admin/admissions/utils/admission-rejection';

function makeDetail(overrides: Partial<AdmissionDetail> = {}): AdmissionDetail {
  return {
    id: 1,
    state: 'lost',
    student_name: 'Test',
    allowed_actions: {},
    ...overrides,
  };
}

describe('isAdmissionRejected', () => {
  it('returns true when rejection.is_rejected is true', () => {
    expect(
      isAdmissionRejected({
        rejection: { is_rejected: true, reason: 'Incomplete file' },
      }),
    ).toBe(true);
  });

  it('returns false for lost state without administrative rejection', () => {
    expect(
      isAdmissionRejected(
        makeDetail({
          state: 'lost',
          decision: { decision: null, decision_date: null, decision_user: null, decision_notes: null, conditions: null },
        }),
      ),
    ).toBe(false);
  });

  it('falls back to decision=rejected when rejection block is absent', () => {
    expect(
      isAdmissionRejected({
        decision: {
          decision: 'rejected',
          decision_date: '2026-01-01',
          decision_user: null,
          decision_notes: 'Missing documents',
          conditions: null,
        },
      }),
    ).toBe(true);
  });
});

describe('resolveRejectionReason', () => {
  it('prefers rejection.reason then lost_reason then decision_notes', () => {
    expect(
      resolveRejectionReason({
        rejection: { is_rejected: true, reason: 'Primary' },
        lost_reason: 'Secondary',
        decision: {
          decision: 'rejected',
          decision_date: null,
          decision_user: null,
          decision_notes: 'Tertiary',
          conditions: null,
        },
      }),
    ).toBe('Primary');

    expect(
      resolveRejectionReason({
        lost_reason: 'Lost reason',
        decision: {
          decision: 'rejected',
          decision_date: null,
          decision_user: null,
          decision_notes: 'Notes',
          conditions: null,
        },
      }),
    ).toBe('Lost reason');
  });
});

describe('canReopenAdmission', () => {
  it('returns true when allowed_actions contains reopen', () => {
    expect(canReopenAdmission(makeDetail({ allowed_actions: { reopen: true } }))).toBe(true);
  });

  it('returns true when can_reopen flag is set', () => {
    expect(canReopenAdmission(makeDetail({ can_reopen: true }))).toBe(true);
  });
});

describe('shouldBlockStudentConversion', () => {
  it('blocks terminal applications without a linked student', () => {
    expect(
      shouldBlockStudentConversion(
        makeDetail({
          is_terminal: true,
          allowed_actions: { link_student: true, get_prefill: true },
        }),
      ),
    ).toBe(true);
  });

  it('blocks when link_student action is missing', () => {
    expect(
      shouldBlockStudentConversion(
        makeDetail({
          is_terminal: false,
          can_link_student: true,
          allowed_actions: { get_prefill: true },
        }),
      ),
    ).toBe(true);
  });

  it('does not block when linked student already exists', () => {
    expect(
      shouldBlockStudentConversion(
        makeDetail({
          is_terminal: true,
          student_id: 42,
          registration_flow_state: 'linked',
          allowed_actions: {},
        }),
      ),
    ).toBe(false);
  });
});
