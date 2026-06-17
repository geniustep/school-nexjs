import { describe, expect, it } from 'vitest';
import {
  feePlanAllowsAction,
  feePlanIsUsed,
  feePlanUsageForDisplay,
  normalizeFeePlan,
  normalizeFeePlanAllowedActions,
  normalizeFeePlanUsage,
  suggestDuplicatePlanName,
} from '@/features/admin/finance/fee-plans/normalize-fee-plan';
import type { FeePlan } from '@/types/finance';

describe('normalizeFeePlanUsage', () => {
  it('preserves all usage counters from API', () => {
    expect(
      normalizeFeePlanUsage({
        agreement_count: 2,
        student_fee_count: 5,
        installment_count: 10,
        collection_count: 1,
        receipt_count: 3,
        assigned_student_count: 4,
        is_used: true,
      }),
    ).toEqual({
      agreement_count: 2,
      student_fee_count: 5,
      installment_count: 10,
      collection_count: 1,
      receipt_count: 3,
      assigned_student_count: 4,
      student_count: 4,
      is_used: true,
    });
  });
});

describe('normalizeFeePlanAllowedActions', () => {
  it('normalizes object contract from API', () => {
    expect(
      normalizeFeePlanAllowedActions({
        view: true,
        edit: false,
        duplicate: true,
        reset_to_draft: false,
        delete: false,
      }),
    ).toEqual({
      view: true,
      edit: false,
      duplicate: true,
      reset_to_draft: false,
      delete: false,
    });
  });

  it('supports legacy string array', () => {
    expect(normalizeFeePlanAllowedActions(['view', 'edit', 'confirm'])).toEqual({
      view: true,
      edit: true,
      confirm: true,
    });
  });
});

describe('feePlanAllowsAction', () => {
  const plan: FeePlan = {
    id: 1,
    code: 'PLAN',
    name: 'Plan',
    school_id: 1,
    allowed_actions: {
      view: true,
      edit: true,
      duplicate: true,
      reset_to_draft: false,
      delete: true,
    },
  };

  it('returns true only for explicitly allowed actions', () => {
    expect(feePlanAllowsAction(plan, 'duplicate')).toBe(true);
    expect(feePlanAllowsAction(plan, 'reset_to_draft')).toBe(false);
  });

  it('does not infer actions from state when contract missing', () => {
    expect(feePlanAllowsAction({ allowed_actions: undefined }, 'edit')).toBe(false);
    expect(feePlanAllowsAction({ allowed_actions: undefined }, 'assign')).toBe(false);
  });
});

describe('normalizeFeePlan', () => {
  it('merges usage and allowed_actions on detail payload', () => {
    const plan = normalizeFeePlan({
      id: 99,
      code: 'qa-plan',
      name: 'QA Plan',
      school_id: 3,
      state: 'draft',
      usage: { is_used: false, assigned_student_count: 0 },
      allowed_actions: { edit: true, delete: true, duplicate: true },
      lines: [],
    });
    expect(plan?.usage?.is_used).toBe(false);
    expect(plan?.allowed_actions?.edit).toBe(true);
    expect(plan?.allowed_actions?.delete).toBe(true);
  });
});

describe('feePlanIsUsed', () => {
  it('detects used plans from is_used flag', () => {
    expect(feePlanIsUsed({ is_used: true })).toBe(true);
  });

  it('detects used plans from non-zero counters', () => {
    expect(feePlanIsUsed({ agreement_count: 1 })).toBe(true);
  });

  it('treats empty usage as unused', () => {
    expect(feePlanIsUsed({ is_used: false, assigned_student_count: 0 })).toBe(false);
  });
});

describe('feePlanUsageForDisplay', () => {
  it('returns usage object for display section', () => {
    const plan = {
      id: 1,
      code: 'x',
      name: 'x',
      school_id: 1,
      usage: { is_used: false, assigned_student_count: 0 },
    } satisfies FeePlan;
    expect(feePlanUsageForDisplay(plan)).toEqual({
      is_used: false,
      assigned_student_count: 0,
    });
  });
});

describe('suggestDuplicatePlanName', () => {
  it('prefixes Arabic copy label once', () => {
    expect(suggestDuplicatePlanName('خطة رسوم')).toBe('نسخة من خطة رسوم');
    expect(suggestDuplicatePlanName('نسخة من خطة رسوم')).toBe('نسخة من خطة رسوم');
  });
});
