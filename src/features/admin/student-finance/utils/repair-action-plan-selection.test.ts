import { describe, expect, it } from 'vitest';
import {
  actionRequiresAnyPlanSelection,
  actionRequiresDualPlanSelection,
  actionRequiresPlanSelection,
  buildRepairActionPayload,
  isAdoptSelectionValid,
  resolvePlanSelectionMode,
} from './repair-action-plan-selection';
import {
  ADOPT_CORRECT_SCHEDULE_ACTION,
  KEEP_FEE_PLAN_ACTION,
  REMOVE_DUPLICATE_PLAN_ACTION,
} from '../types/finance-repair';

describe('repair-action-plan-selection', () => {
  it('resolves plan selection mode per action code', () => {
    expect(resolvePlanSelectionMode(KEEP_FEE_PLAN_ACTION)).toBe('keep');
    expect(resolvePlanSelectionMode(REMOVE_DUPLICATE_PLAN_ACTION)).toBe('cancel');
    expect(resolvePlanSelectionMode(ADOPT_CORRECT_SCHEDULE_ACTION)).toBe('adopt');
    expect(resolvePlanSelectionMode('regularize_agreement_after_cleanup')).toBe('none');
  });

  it('classifies single vs dual vs any plan selection', () => {
    expect(actionRequiresPlanSelection('keep')).toBe(true);
    expect(actionRequiresPlanSelection('cancel')).toBe(true);
    expect(actionRequiresPlanSelection('adopt')).toBe(false);
    expect(actionRequiresDualPlanSelection('adopt')).toBe(true);
    expect(actionRequiresDualPlanSelection('keep')).toBe(false);
    expect(actionRequiresAnyPlanSelection('adopt')).toBe(true);
    expect(actionRequiresAnyPlanSelection('keep')).toBe(true);
    expect(actionRequiresAnyPlanSelection('none')).toBe(false);
  });

  it('builds keep_plan_id payload for keep action', () => {
    expect(buildRepairActionPayload(KEEP_FEE_PLAN_ACTION, { primaryPlanId: 2587 })).toEqual({
      keep_plan_id: 2587,
    });
  });

  it('builds target_plan_id payload for remove duplicate action', () => {
    expect(buildRepairActionPayload(REMOVE_DUPLICATE_PLAN_ACTION, { primaryPlanId: 2461 })).toEqual({
      target_plan_id: 2461,
    });
  });

  it('builds official_plan_id + source_schedule_plan_id for adopt action', () => {
    expect(
      buildRepairActionPayload(ADOPT_CORRECT_SCHEDULE_ACTION, {
        primaryPlanId: 2461,
        sourceSchedulePlanId: 2587,
      }),
    ).toEqual({ official_plan_id: 2461, source_schedule_plan_id: 2587 });
  });

  it('returns empty payload when adopt selection is incomplete', () => {
    expect(
      buildRepairActionPayload(ADOPT_CORRECT_SCHEDULE_ACTION, { primaryPlanId: 2461 }),
    ).toEqual({});
  });

  it('returns empty payload when adopt selection uses the same plan twice', () => {
    expect(
      buildRepairActionPayload(ADOPT_CORRECT_SCHEDULE_ACTION, {
        primaryPlanId: 2461,
        sourceSchedulePlanId: 2461,
      }),
    ).toEqual({});
  });

  it('validates adopt selection requires two distinct plans', () => {
    expect(isAdoptSelectionValid({ primaryPlanId: 2461, sourceSchedulePlanId: 2587 })).toBe(true);
    expect(isAdoptSelectionValid({ primaryPlanId: 2461, sourceSchedulePlanId: 2461 })).toBe(false);
    expect(isAdoptSelectionValid({ primaryPlanId: null, sourceSchedulePlanId: 2587 })).toBe(false);
    expect(isAdoptSelectionValid({ primaryPlanId: 2461, sourceSchedulePlanId: null })).toBe(false);
  });

  it('returns empty payload when no plan is selected', () => {
    expect(buildRepairActionPayload(KEEP_FEE_PLAN_ACTION, { primaryPlanId: null })).toEqual({});
  });
});
