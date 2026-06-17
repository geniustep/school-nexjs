import { normalizeFeePlanLines } from '@/lib/utils/fee-plan-line-normalize';
import type { FeePlan, FeeType } from '@/types/finance';
import {
  feePlanLevelScopeSummaryFromPlan,
  normalizeFeePlanLevelIds,
  type FeePlanLevelScopeSummaryLabels,
  type FeePlanScopeCycleGroup,
} from './fee-plan-level-scope';
import {
  createEmptyFeePlanFormValues,
  newDraftLine,
  type FeePlanFormValues,
} from './fee-plan-types';
import { feePlanFrequencyFromApi } from './fee-plan-frequency';
import { normalizePricingMode } from './fee-plan-pricing';

export function feePlanLineCount(plan: FeePlan): number {
  return plan.lines?.length ?? 0;
}

export function feePlanLevelScopeLabel(
  plan: FeePlan,
  groups: FeePlanScopeCycleGroup[],
  labels: FeePlanLevelScopeSummaryLabels,
): string {
  return feePlanLevelScopeSummaryFromPlan(plan, groups, labels);
}

export function formValuesFromFeePlan(plan: FeePlan, feeTypes: FeeType[]): FeePlanFormValues {
  const base = createEmptyFeePlanFormValues();
  base.name = plan.name ?? '';
  base.code = plan.code ?? '';
  base.notes = plan.notes ?? '';
  base.academicYearId = plan.academic_year_id ? String(plan.academic_year_id) : '';
  base.levelIds = normalizeFeePlanLevelIds(plan);

  const normalizedLines = normalizeFeePlanLines(plan.lines ?? []);
  base.lines = normalizedLines.map((line, index) => {
    const feeType = feeTypes.find((ft) => ft.id === line.fee_type_id);
    const draft = newDraftLine(`line-${line.id ?? index}`);
    if (line.id) draft.lineId = line.id;
    draft.feeTypeId = line.fee_type_id ?? feeType?.id ?? 0;
    draft.label = line.description && typeof line.description === 'string' ? line.description : line.name ?? '';
    draft.amount = line.amount;
    draft.pricingMode = normalizePricingMode(line.pricing_mode) ?? undefined;
    draft.frequency = feePlanFrequencyFromApi(line.frequency);
    if (Array.isArray(line.level_ids) && line.level_ids.length > 0) {
      draft.levelScopeMode = 'specific';
      draft.levelIds = line.level_ids;
    } else {
      draft.levelScopeMode = 'all_plan_levels';
      draft.levelIds = [];
    }
    draft.isOptional = line.is_optional === true;
    draft.installmentCount = line.installment_count ?? 1;
    if (line.installment_schedule?.length) {
      draft.scheduleMode = 'explicit';
      draft.installmentSchedule = line.installment_schedule.map((row) => ({ ...row }));
    } else if (line.due_rule === 'on_assignment') {
      draft.scheduleMode = 'on_assignment';
    } else if (line.due_date) {
      draft.scheduleMode = 'fixed_date';
      draft.dueDate = line.due_date;
    }
    return draft;
  });

  return base;
}
