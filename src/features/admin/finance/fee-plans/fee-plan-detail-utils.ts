import { feePlanFrequencyFromApi } from '@/features/admin/finance/fee-plans/fee-plan-frequency';
import type { FeePlanScopeCycleGroup } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { normalizeFeePlanLevelIds } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { feePlanState } from '@/lib/utils/finance';
import type { FeePlan, FeePlanLine } from '@/types/finance';

export const FEE_PLAN_ACTIONS = [
  'view',
  'edit',
  'confirm',
  'archive',
  'restore',
  'delete',
  'duplicate',
  'reset_to_draft',
  'assign',
  'view_beneficiaries',
] as const;

export type FeePlanAction = (typeof FEE_PLAN_ACTIONS)[number];

export interface FeePlanUsageSummary {
  student_count?: number;
  agreement_count?: number;
  student_fee_count?: number;
}

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
}

export type FeePlanLineWarningKey =
  | 'monthlySingleInstallment'
  | 'tuitionOptional';

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
  lineExpectedTotal: number | null;
  warnings: FeePlanLineWarningKey[];
}

function normalizeAllowedActions(raw: unknown): FeePlanAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((a): a is FeePlanAction =>
    typeof a === 'string' && (FEE_PLAN_ACTIONS as readonly string[]).includes(a),
  );
}

export function feePlanAllowedActions(plan: FeePlan): FeePlanAction[] {
  const fromApi = normalizeAllowedActions((plan as FeePlan & { allowed_actions?: unknown }).allowed_actions);
  if (fromApi.length) return fromApi;

  const state = feePlanState(plan);
  const actions: FeePlanAction[] = ['view'];
  if (state === 'draft') {
    actions.push('edit', 'confirm', 'archive', 'delete');
  } else if (state === 'confirmed') {
    actions.push('assign', 'view_beneficiaries', 'archive', 'reset_to_draft', 'duplicate');
  } else if (state === 'archived') {
    actions.push('restore', 'duplicate');
  }
  return actions;
}

export function feePlanAllowsAction(plan: FeePlan, action: FeePlanAction): boolean {
  return feePlanAllowedActions(plan).includes(action);
}

export function feePlanUsageSummary(plan: FeePlan): FeePlanUsageSummary | null {
  const usage = (plan as FeePlan & { usage?: FeePlanUsageSummary }).usage;
  if (!usage || typeof usage !== 'object') return null;
  const hasAny =
    usage.student_count != null || usage.agreement_count != null || usage.student_fee_count != null;
  return hasAny ? usage : null;
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
  let monthlyPeriods: number | null = null;

  for (const line of lines) {
    const amount = Number(line.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const freq = lineFrequency(line);
    const installments = line.installment_count ?? line.installment_schedule?.length ?? 1;
    maxInstallmentCount = Math.max(maxInstallmentCount, installments);

    if (line.is_optional) optionalCount += 1;
    else requiredCount += 1;

    if (isOneTimeFrequency(freq)) {
      if (line.is_optional) oneTimeOptionalTotal += amount;
      else oneTimeRequiredTotal += amount;
    } else if (isMonthlyFrequency(freq)) {
      if (line.is_optional) monthlyOptionalTotal += amount;
      else monthlyRequiredTotal += amount;
      if (installments > 1) {
        monthlyPeriods =
          monthlyPeriods == null ? installments : Math.max(monthlyPeriods, installments);
      }
    }
  }

  let annualEstimate: number | null = null;
  let annualFormulaKey: string | null = null;
  let annualFormulaValues: Record<string, string | number> | null = null;

  if (monthlyPeriods != null && monthlyPeriods > 1) {
    const monthlySum = monthlyRequiredTotal + monthlyOptionalTotal;
    annualEstimate = oneTimeRequiredTotal + oneTimeOptionalTotal + monthlySum * monthlyPeriods;
    annualFormulaKey = 'admin.finance.feePlansWorkspace.detailAnnualFormula';
    annualFormulaValues = {
      oneTime: oneTimeRequiredTotal + oneTimeOptionalTotal,
      monthly: monthlySum,
      periods: monthlyPeriods,
      total: annualEstimate,
    };
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
  const installmentCount = line.installment_count ?? line.installment_schedule?.length ?? 1;
  const warnings: FeePlanLineWarningKey[] = [];

  if (isMonthlyFrequency(frequencyUi) && installmentCount <= 1) {
    warnings.push('monthlySingleInstallment');
  }
  const category = line.fee_type?.category?.toLowerCase();
  if (category === 'tuition' && line.is_optional) {
    warnings.push('tuitionOptional');
  }

  let dueLabelKey: FeePlanLineDisplay['dueLabelKey'] = 'none';
  if (line.due_rule === 'on_assignment') dueLabelKey = 'onAssignment';
  else if (line.installment_schedule?.length) dueLabelKey = 'explicitSchedule';
  else if (line.due_date) dueLabelKey = 'fixedDate';

  let lineExpectedTotal: number | null = null;
  if (isOneTimeFrequency(frequencyUi)) {
    lineExpectedTotal = Number(line.amount);
  } else if (isMonthlyFrequency(frequencyUi) && installmentCount > 1) {
    lineExpectedTotal = Number(line.amount) * installmentCount;
  }

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
    lineExpectedTotal,
    warnings,
  };
}
