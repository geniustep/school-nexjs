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
  const levelCode = resolveFeePlanLevelErrorCode(code);
  if (levelCode) return feePlanLevelErrorMessageKey(levelCode);
  return null;
}

export { type FeePlanLevelErrorCode };
