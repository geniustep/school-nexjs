import { feePlanFrequencyFromApi } from '@/features/admin/finance/fee-plans/fee-plan-frequency';
import { normalizeFeePlanLevelIds } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { feePlanState } from '@/lib/utils/finance';
import type { FeePlan, FeePlanLine } from '@/types/finance';

export type FeePlanAssignBlockReason =
  | 'not_confirmed'
  | 'archived'
  | 'no_lines'
  | 'frequency_installment_conflict';

export type FeePlanAssignWarningReason = 'name_year_mismatch';

export interface FeePlanAssignValidation {
  canAssign: boolean;
  blockReasons: FeePlanAssignBlockReason[];
  warnings: FeePlanAssignWarningReason[];
  inconsistentLines: FeePlanLine[];
}

export function lineHasFrequencyInstallmentConflict(line: FeePlanLine): boolean {
  const freq = feePlanFrequencyFromApi(line.frequency);
  const installments = line.installment_count ?? line.installment_schedule?.length ?? 1;
  return (freq === 'once' || freq === 'one_time') && installments > 1;
}

export function detectPlanNameYearMismatch(plan: FeePlan, academicYearName: string): boolean {
  if (!plan.name?.trim() || !academicYearName.trim()) return false;
  const normalizedYear = academicYearName.replace(/\s+/g, '').toLowerCase();
  const normalizedName = plan.name.replace(/\s+/g, '').toLowerCase();
  if (normalizedName.includes(normalizedYear)) return false;
  const yearTokens = academicYearName.match(/\d{4}/g);
  if (!yearTokens?.length) return false;
  return !yearTokens.some((token) => normalizedName.includes(token));
}

export function validateFeePlanForAssignment(
  plan: FeePlan,
  academicYearName: string,
): FeePlanAssignValidation {
  const state = feePlanState(plan);
  const lines = plan.lines ?? [];
  const inconsistentLines = lines.filter(lineHasFrequencyInstallmentConflict);
  const blockReasons: FeePlanAssignBlockReason[] = [];

  if (state !== 'confirmed') blockReasons.push('not_confirmed');
  if (state === 'archived') blockReasons.push('archived');
  if (!lines.length) blockReasons.push('no_lines');
  if (inconsistentLines.length) blockReasons.push('frequency_installment_conflict');

  const warnings: FeePlanAssignWarningReason[] = [];
  if (detectPlanNameYearMismatch(plan, academicYearName)) {
    warnings.push('name_year_mismatch');
  }

  return {
    canAssign: blockReasons.length === 0,
    blockReasons,
    warnings,
    inconsistentLines,
  };
}

export function planLevelIdsForFilter(plan: FeePlan): number[] {
  return normalizeFeePlanLevelIds(plan);
}
