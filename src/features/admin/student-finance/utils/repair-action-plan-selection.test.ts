import { describe, expect, it } from 'vitest';
import {
  actionRequiresPlanSelection,
  buildRepairActionPayload,
  resolvePlanSelectionMode,
} from './repair-action-plan-selection';
import {
  KEEP_FEE_PLAN_ACTION,
  REMOVE_DUPLICATE_PLAN_ACTION,
} from '../types/finance-repair';

describe('repair-action-plan-selection', () => {
  it('resolves plan selection mode per action code', () => {
    expect(resolvePlanSelectionMode(KEEP_FEE_PLAN_ACTION)).toBe('keep');
    expect(resolvePlanSelectionMode(REMOVE_DUPLICATE_PLAN_ACTION)).toBe('cancel');
    expect(resolvePlanSelectionMode('regularize_agreement_after_cleanup')).toBe('none');
  });

  it('requires plan selection for keep/cancel actions only', () => {
    expect(actionRequiresPlanSelection('keep')).toBe(true);
    expect(actionRequiresPlanSelection('cancel')).toBe(true);
    expect(actionRequiresPlanSelection('none')).toBe(false);
  });

  it('builds keep_plan_id payload for keep action', () => {
    expect(buildRepairActionPayload(KEEP_FEE_PLAN_ACTION, 2587)).toEqual({ keep_plan_id: 2587 });
  });

  it('builds target_plan_id payload for remove duplicate action', () => {
    expect(buildRepairActionPayload(REMOVE_DUPLICATE_PLAN_ACTION, 2461)).toEqual({
      target_plan_id: 2461,
    });
  });

  it('returns empty payload when no plan is selected', () => {
    expect(buildRepairActionPayload(KEEP_FEE_PLAN_ACTION, null)).toEqual({});
  });
});
