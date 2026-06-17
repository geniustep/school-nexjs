import {
  FEE_PLAN_LEVEL_ERROR_CODES,
  feePlanLevelErrorMessageKey,
  resolveFeePlanLevelErrorCode,
  type FeePlanLevelErrorCode,
} from './fee-plan-level-scope';

export const FEE_PLAN_BUSINESS_ERROR_CODES = [
  'fee_plan_duplicate_line',
  ...FEE_PLAN_LEVEL_ERROR_CODES,
] as const;

export type FeePlanBusinessErrorCode = (typeof FEE_PLAN_BUSINESS_ERROR_CODES)[number];

export function feePlanErrorMessageKey(code?: string): string | null {
  if (code === 'fee_plan_duplicate_line') {
    return 'admin.finance.feePlansWorkspace.errors.duplicateLineScope';
  }
  if (code === 'fee_plan_reset_forbidden_in_use') {
    return 'admin.finance.feePlansWorkspace.lifecycleErrors.fee_plan_reset_forbidden_in_use';
  }
  if (code === 'fee_plan_restore_forbidden') {
    return 'admin.finance.feePlansWorkspace.lifecycleErrors.fee_plan_restore_forbidden';
  }
  if (code === 'fee_plan_in_use') {
    return 'admin.finance.feePlansWorkspace.lifecycleErrors.fee_plan_in_use';
  }
  if (code === 'fee_plan_delete_forbidden_state') {
    return 'admin.finance.feePlansWorkspace.lifecycleErrors.fee_plan_delete_forbidden_state';
  }
  const levelCode = resolveFeePlanLevelErrorCode(code);
  if (levelCode) return feePlanLevelErrorMessageKey(levelCode);
  return null;
}

export { type FeePlanLevelErrorCode };
