import { describe, expect, it } from 'vitest';
import { resolveFeePlanEditAction } from './fee-plan-edit-action';
import type { FeePlan } from '@/types/finance';

function plan(overrides: Partial<FeePlan> = {}): FeePlan {
  return {
    id: 1,
    code: 'PLAN',
    name: 'Plan',
    school_id: 1,
    state: 'draft',
    allowed_actions: {},
    ...overrides,
  };
}

describe('resolveFeePlanEditAction', () => {
  it('shows direct edit for draft plans with edit permission', () => {
    expect(
      resolveFeePlanEditAction(
        plan({ state: 'draft', allowed_actions: { edit: true } }),
        true,
      ).type,
    ).toBe('direct_edit');
  });

  it('shows reset_then_edit for confirmed unused plans', () => {
    expect(
      resolveFeePlanEditAction(
        plan({
          state: 'confirmed',
          allowed_actions: { reset_to_draft: true, edit: false },
          usage: { is_used: false, assigned_student_count: 0 },
        }),
        true,
      ).type,
    ).toBe('reset_then_edit');
  });

  it('shows duplicate_for_edit for confirmed used plans', () => {
    expect(
      resolveFeePlanEditAction(
        plan({
          state: 'confirmed',
          allowed_actions: { duplicate: true, edit: false, reset_to_draft: false },
          usage: { is_used: true, agreement_count: 2 },
        }),
        true,
      ).type,
    ).toBe('duplicate_for_edit');
  });

  it('blocks direct edit for confirmed used plans without duplicate', () => {
    expect(
      resolveFeePlanEditAction(
        plan({
          state: 'confirmed',
          allowed_actions: { edit: true, duplicate: false },
          usage: { is_used: true, agreement_count: 1 },
        }),
        true,
      ).type,
    ).toBe('none');
  });

  it('returns none when user cannot manage', () => {
    expect(
      resolveFeePlanEditAction(plan({ state: 'draft', allowed_actions: { edit: true } }), false).type,
    ).toBe('none');
  });
});
