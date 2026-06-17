import { feePlanFrequencyFromApi } from '@/features/admin/finance/fee-plans/fee-plan-frequency';
import type { FeePlanScopeCycleGroup } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { normalizeFeePlanLevelIds } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import type { FeePlan, FeePlanLine, FeePlanPricingMode } from '@/types/finance';
import {
  computePlanFinancialBreakdown,
  isLegacyRecurringDisplay,
  resolveLinePricing,
  resolvePricingModeForDisplay,
  type FeePlanLineExpectedTotal,
} from './fee-plan-pricing';

export interface FeePlanFinancialSummary {
  lineCount: number;
  requiredCount: number;
  optionalCount: number;
  oneTimeRequiredTotal: number;
  oneTimeOptionalTotal: number;
  monthlyRequiredTotal: number;
  monthlyOptionalTotal: number;
  annualEstimate: number | null;
  annualFormulaKey: string | null;
  annualFormulaValues: Record<string, string | number> | null;
  maxInstallmentCount: number;
  maxMonthlyInstallmentCount: number;
}

export type FeePlanLineWarningKey =
  | 'monthlySingleInstallment'
  | 'tuitionOptional'
  | 'oneTimeMultiInstallment';

export interface FeePlanLineDisplay {
  line: FeePlanLine;
  feeName: string;
  scopeLabelKey: 'allPlanLevels' | 'specificLevels';
  scopeNames: string[];
  frequencyUi: string;
  frequencyApi: string;
  isOptional: boolean;
  installmentCount: number;
  dueLabelKey: 'onAssignment' | 'fixedDate' | 'explicitSchedule' | 'none';
  dueDate?: string | null;
  pricing: FeePlanLineExpectedTotal;
  pricingMode: FeePlanPricingMode | null;
  lineExpectedTotal: number;
  installmentAmount: number | null;
  warnings: FeePlanLineWarningKey[];
}

function isMonthlyFrequency(frequency: string): boolean {
  return frequency === 'monthly';
}

function isOneTimeFrequency(frequency: string): boolean {
  return frequency === 'once' || frequency === 'one_time';
}

function lineFrequency(line: FeePlanLine): string {
  return feePlanFrequencyFromApi(line.frequency);
}

export function computeFeePlanFinancialSummary(lines: FeePlanLine[]): FeePlanFinancialSummary {
  let requiredCount = 0;
  let optionalCount = 0;
  let oneTimeRequiredTotal = 0;
  let oneTimeOptionalTotal = 0;
  let monthlyRequiredTotal = 0;
  let monthlyOptionalTotal = 0;
  let maxInstallmentCount = 0;
  let maxMonthlyInstallmentCount = 0;

  for (const line of lines) {
    const amount = Number(line.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const freq = lineFrequency(line);
    const pricing = resolveLinePricing(line);
    const installments = pricing.installmentCount;
    maxInstallmentCount = Math.max(maxInstallmentCount, installments);
    if (isMonthlyFrequency(freq) || isLegacyRecurringDisplay(line, pricing, freq)) {
      maxMonthlyInstallmentCount = Math.max(maxMonthlyInstallmentCount, installments);
    }

    if (line.is_optional) optionalCount += 1;
    else requiredCount += 1;

    if (isLegacyRecurringDisplay(line, pricing, freq)) {
      if (line.is_optional) monthlyOptionalTotal += pricing.unitAmount;
      else monthlyRequiredTotal += pricing.unitAmount;
    } else if (line.is_optional) {
      oneTimeOptionalTotal += pricing.expectedTotal;
    } else {
      oneTimeRequiredTotal += pricing.expectedTotal;
    }
  }

  const breakdown = computePlanFinancialBreakdown(lines);
  let annualEstimate: number | null = null;
  let annualFormulaKey: string | null = null;
  let annualFormulaValues: Record<string, string | number> | null = null;

  if (breakdown.recurringPeriodCount != null && breakdown.recurringPeriodCount > 1) {
    annualEstimate = breakdown.expectedTotal;
    annualFormulaKey = 'admin.finance.feePlansWorkspace.detailAnnualFormula';
    annualFormulaValues = {
      oneTime: breakdown.oneTimeTotal,
      monthly: breakdown.recurringUnitTotal,
      periods: breakdown.recurringPeriodCount,
      total: breakdown.expectedTotal,
    };
  } else {
    const hasPeriodicLine = lines.some((line) => {
      const freq = lineFrequency(line);
      return freq === 'monthly' || freq === 'term';
    });
    if (!hasPeriodicLine && breakdown.expectedTotal > 0) {
      annualEstimate = breakdown.expectedTotal;
    }
  }

  return {
    lineCount: lines.length,
    requiredCount,
    optionalCount,
    oneTimeRequiredTotal,
    oneTimeOptionalTotal,
    monthlyRequiredTotal,
    monthlyOptionalTotal,
    annualEstimate,
    annualFormulaKey,
    annualFormulaValues,
    maxInstallmentCount,
    maxMonthlyInstallmentCount,
  };
}

export function resolveLineScopeNames(
  line: FeePlanLine,
  planLevelIds: number[],
  scopeGroups: FeePlanScopeCycleGroup[],
): { mode: 'allPlanLevels' | 'specificLevels'; names: string[] } {
  const lineLevelIds = Array.isArray(line.level_ids) ? line.level_ids : [];
  if (!lineLevelIds.length) {
    return { mode: 'allPlanLevels', names: [] };
  }
  const allLevels = scopeGroups.flatMap((g) => g.levels);
  const names = lineLevelIds
    .map((id) => allLevels.find((l) => l.schoolLevelId === id)?.name)
    .filter((n): n is string => Boolean(n));
  return { mode: 'specificLevels', names };
}

export function buildFeePlanLineDisplay(
  line: FeePlanLine,
  plan: FeePlan,
  scopeGroups: FeePlanScopeCycleGroup[],
): FeePlanLineDisplay {
  const planLevelIds = normalizeFeePlanLevelIds(plan);
  const scope = resolveLineScopeNames(line, planLevelIds, scopeGroups);
  const frequencyApi = line.frequency ?? '';
  const frequencyUi = feePlanFrequencyFromApi(frequencyApi);
  const pricing = resolveLinePricing(line);
  const pricingMode = resolvePricingModeForDisplay(line, pricing);
  const installmentCount = pricing.installmentCount;
  const warnings: FeePlanLineWarningKey[] = [];

  if (isMonthlyFrequency(frequencyUi) && installmentCount <= 1 && pricingMode === 'recurring_unit_price') {
    warnings.push('monthlySingleInstallment');
  }
  if (isOneTimeFrequency(frequencyUi) && installmentCount > 1) {
    warnings.push('oneTimeMultiInstallment');
  }
  const category = line.fee_type?.category?.toLowerCase();
  if (category === 'tuition' && line.is_optional) {
    warnings.push('tuitionOptional');
  }

  let dueLabelKey: FeePlanLineDisplay['dueLabelKey'] = 'none';
  if (line.due_rule === 'on_assignment') dueLabelKey = 'onAssignment';
  else if (line.installment_schedule?.length) dueLabelKey = 'explicitSchedule';
  else if (line.due_date) dueLabelKey = 'fixedDate';

  return {
    line,
    feeName: line.fee_type?.name ?? line.fee_type_name ?? line.name ?? '',
    scopeLabelKey: scope.mode,
    scopeNames: scope.names,
    frequencyUi,
    frequencyApi,
    isOptional: line.is_optional === true,
    installmentCount,
    dueLabelKey,
    dueDate: line.due_date,
    pricing,
    pricingMode,
    lineExpectedTotal: pricing.expectedTotal,
    installmentAmount: pricing.installmentAmount,
    warnings,
  };
}
