import { describe, expect, it } from 'vitest';
import type { ApiResponse } from '@/types/api';
import type { StudentFinanceAssignPlanBody } from '@/types/student-finance-assign-plan';
import {
  AssignPlanIdempotencyRegistry,
  AssignPlanIdempotencySession,
  buildAssignPlanAttemptFingerprint,
  classifyAssignPlanIdempotencyOutcome,
  createAssignPlanIdempotencyKey,
  isValidAssignPlanIdempotencyKey,
  readIdempotentReplayFlag,
  shouldClearAssignPlanIdempotencyKey,
  withAssignPlanIdempotencyKey,
} from './assign-plan-idempotency';
import { feePlanAssignErrorMessageKey } from '@/features/admin/finance/fee-plan-assign-errors';

function baseBody(
  overrides?: Partial<StudentFinanceAssignPlanBody>,
): StudentFinanceAssignPlanBody {
  return {
    fee_plan_id: 10,
    academic_year_id: 5,
    activation_mode: 'draft',
    customize_plan: false,
    discounts: [],
    selected_optional_line_ids: [],
    ...overrides,
  };
}

describe('assign-plan idempotency key generation', () => {
  it('builds a valid key with student id and uuid fragment only', () => {
    const key = createAssignPlanIdempotencyKey(123);
    expect(key.startsWith('assign-plan-123-')).toBe(true);
    expect(isValidAssignPlanIdempotencyKey(key)).toBe(true);
    expect(key.length).toBeLessThanOrEqual(128);
    expect(key).not.toMatch(/@|phone|اسم|email/i);
  });

  it('creates distinct keys for new logical attempts', () => {
    const a = createAssignPlanIdempotencyKey(1);
    const b = createAssignPlanIdempotencyKey(1);
    expect(a).not.toBe(b);
  });

  it('rejects invalid characters and overlong keys', () => {
    expect(isValidAssignPlanIdempotencyKey('bad key with spaces')).toBe(false);
    expect(isValidAssignPlanIdempotencyKey(`x${'a'.repeat(128)}`)).toBe(false);
  });
});

describe('assign-plan attempt fingerprint', () => {
  it('stays stable when optional line order differs', () => {
    const a = buildAssignPlanAttemptFingerprint(
      7,
      baseBody({ selected_optional_line_ids: [3, 1, 2] }),
    );
    const b = buildAssignPlanAttemptFingerprint(
      7,
      baseBody({ selected_optional_line_ids: [1, 2, 3] }),
    );
    expect(a).toBe(b);
  });

  it('changes when fee_plan_id / academic_year_id / activation_mode change', () => {
    const base = buildAssignPlanAttemptFingerprint(7, baseBody());
    expect(buildAssignPlanAttemptFingerprint(7, baseBody({ fee_plan_id: 99 }))).not.toBe(base);
    expect(
      buildAssignPlanAttemptFingerprint(7, baseBody({ academic_year_id: 99 })),
    ).not.toBe(base);
    expect(
      buildAssignPlanAttemptFingerprint(7, baseBody({ activation_mode: 'activate' })),
    ).not.toBe(base);
  });

  it('changes when student_id changes', () => {
    const body = baseBody();
    expect(buildAssignPlanAttemptFingerprint(1, body)).not.toBe(
      buildAssignPlanAttemptFingerprint(2, body),
    );
  });

  it('changes when customization discounts change', () => {
    const without = buildAssignPlanAttemptFingerprint(7, baseBody({ customize_plan: true }));
    const withDiscount = buildAssignPlanAttemptFingerprint(
      7,
      baseBody({
        customize_plan: true,
        customization_reason: 'scholarship',
        discounts: [
          {
            scope: 'plan',
            type: 'percent',
            value: 10,
            reason: 'scholarship',
          },
        ],
      }),
    );
    expect(without).not.toBe(withDiscount);
  });
});

describe('AssignPlanIdempotencySession', () => {
  it('reuses the same key for the same fingerprint and student', () => {
    const session = new AssignPlanIdempotencySession();
    const fp = buildAssignPlanAttemptFingerprint(9, baseBody());
    const first = session.ensureKey(9, fp);
    const second = session.ensureKey(9, fp);
    expect(first).toBe(second);
  });

  it('issues a new key when the fingerprint or student changes', () => {
    const session = new AssignPlanIdempotencySession();
    const first = session.ensureKey(9, buildAssignPlanAttemptFingerprint(9, baseBody()));
    const afterPlanChange = session.ensureKey(
      9,
      buildAssignPlanAttemptFingerprint(9, baseBody({ fee_plan_id: 44 })),
    );
    expect(afterPlanChange).not.toBe(first);
    const afterStudentChange = session.ensureKey(
      10,
      buildAssignPlanAttemptFingerprint(10, baseBody({ fee_plan_id: 44 })),
    );
    expect(afterStudentChange).not.toBe(afterPlanChange);
  });

  it('clears on reset so the next ensure creates a new attempt', () => {
    const session = new AssignPlanIdempotencySession();
    const fp = buildAssignPlanAttemptFingerprint(3, baseBody());
    const first = session.ensureKey(3, fp);
    session.reset();
    const second = session.ensureKey(3, fp);
    expect(second).not.toBe(first);
  });
});

describe('AssignPlanIdempotencyRegistry', () => {
  it('isolates keys per localId + studentId', () => {
    const registry = new AssignPlanIdempotencyRegistry();
    const fp = buildAssignPlanAttemptFingerprint(1, baseBody());
    const a = registry.ensureKey(1, fp, 'child-a');
    const b = registry.ensureKey(1, fp, 'child-b');
    expect(a).not.toBe(b);
    expect(registry.ensureKey(1, fp, 'child-a')).toBe(a);
  });
});

describe('assign-plan idempotency response classification', () => {
  it('treats success without idempotent_replay as first/legacy success', () => {
    const res: ApiResponse<unknown> = {
      success: true,
      data: { agreement_id: 1 },
      meta: {},
    };
    expect(classifyAssignPlanIdempotencyOutcome(res)).toEqual({
      kind: 'first_success',
      idempotentReplay: false,
    });
    expect(readIdempotentReplayFlag(res.data)).toBeUndefined();
  });

  it('classifies replay, conflict, in-progress, invalid key, and mismatch', () => {
    expect(
      classifyAssignPlanIdempotencyOutcome({
        success: true,
        data: { agreement_id: 2, idempotent_replay: true },
        meta: {},
      }).kind,
    ).toBe('replay');

    expect(
      classifyAssignPlanIdempotencyOutcome({
        success: false,
        error: { code: 'assign_plan_idempotency_conflict', message: 'x' },
        meta: {},
      }).kind,
    ).toBe('payload_conflict');

    expect(
      classifyAssignPlanIdempotencyOutcome({
        success: false,
        error: { code: 'assign_plan_idempotency_in_progress', message: 'x' },
        meta: {},
      }).kind,
    ).toBe('in_progress');

    expect(
      classifyAssignPlanIdempotencyOutcome({
        success: false,
        error: { code: 'assign_plan_idempotency_key_invalid', message: 'x' },
        meta: {},
      }).kind,
    ).toBe('invalid_key');

    expect(
      classifyAssignPlanIdempotencyOutcome({
        success: false,
        error: { code: 'assign_plan_idempotency_key_mismatch', message: 'x' },
        meta: {},
      }).kind,
    ).toBe('key_mismatch');
  });

  it('clears the key on success/replay/conflict/invalid/mismatch but not in-progress', () => {
    expect(
      shouldClearAssignPlanIdempotencyKey({
        kind: 'first_success',
        idempotentReplay: false,
      }),
    ).toBe(true);
    expect(
      shouldClearAssignPlanIdempotencyKey({ kind: 'replay', idempotentReplay: true }),
    ).toBe(true);
    expect(shouldClearAssignPlanIdempotencyKey({ kind: 'payload_conflict' })).toBe(true);
    expect(shouldClearAssignPlanIdempotencyKey({ kind: 'in_progress' })).toBe(false);
  });

  it('maps contract errors to finance assignErrors i18n keys', () => {
    expect(feePlanAssignErrorMessageKey('assign_plan_idempotency_conflict')).toBe(
      'admin.finance.assignErrors.idempotencyConflict',
    );
    expect(feePlanAssignErrorMessageKey('assign_plan_idempotency_in_progress')).toBe(
      'admin.finance.assignErrors.idempotencyInProgress',
    );
    expect(feePlanAssignErrorMessageKey('fee_plan_already_assigned')).toContain(
      'admin.finance.assignErrors',
    );
  });
});

describe('withAssignPlanIdempotencyKey', () => {
  it('attaches a single body key without inventing a second source', () => {
    const body = withAssignPlanIdempotencyKey(
      baseBody(),
      'assign-plan-1-550e8400-e29b-41d4-a716-446655440000',
    );
    expect(body.idempotency_key).toBe(
      'assign-plan-1-550e8400-e29b-41d4-a716-446655440000',
    );
    expect(body.activation_mode).toBe('draft');
  });
});
