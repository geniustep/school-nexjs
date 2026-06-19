import type {
  EnrollmentPlanPreviewResult,
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';
import { financialSummaryRows } from './enrollment-finance-payload';

export type EnrollmentFinanceSaveBlockReason =
  | 'ok'
  | 'reason_required'
  | 'preview_loading'
  | 'preview_error'
  | 'preview_incomplete';

export type EnrollmentReviewCustomizationKind =
  | 'plan_discount'
  | 'line_discount'
  | 'one_time_excluded'
  | 'one_time_modified'
  | 'period_excluded'
  | 'period_modified';

export interface EnrollmentReviewCustomizationItem {
  kind: EnrollmentReviewCustomizationKind;
  label: string;
}

export interface EnrollmentFinanceReviewModel {
  planId: number;
  planName: string;
  customized: boolean;
  customizationReason: string;
  summaryRows: Array<{ key: string; value: number }>;
  originalTotal: number | null;
  discountTotal: number | null;
  finalTotal: number | null;
  monthlyInstallment: number | null;
  customizationItems: EnrollmentReviewCustomizationItem[];
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function lineName(suggest: FeePlanSuggestResult, lineId: number): string {
  return (
    suggest.plan_lines?.find((line) => line.line_id === lineId)?.fee_type_name ??
    String(lineId)
  );
}

function periodLabel(suggest: FeePlanSuggestResult, periodKey: string): string {
  return (
    suggest.suggested_periods.find((period) => period.period_key === periodKey)?.label ??
    periodKey
  );
}

function discountLabel(
  type: string,
  value: string,
  reason: string,
  lineLabel?: string,
): string {
  const valueText = type === 'percent' ? `${value}%` : value;
  const target = lineLabel ? `${lineLabel} — ` : '';
  return `${target}${valueText} (${reason})`;
}

export function listEnrollmentReviewCustomizationItems(
  suggest: FeePlanSuggestResult,
  financeState: StudentCreateFinanceFormState,
): EnrollmentReviewCustomizationItem[] {
  const items: EnrollmentReviewCustomizationItem[] = [];

  if (financeState.planDiscount.enabled && financeState.planDiscount.type) {
    const value = financeState.planDiscount.value.trim();
    const reason = financeState.planDiscount.reason;
    if (value && reason) {
      items.push({
        kind: 'plan_discount',
        label: discountLabel(financeState.planDiscount.type, value, reason),
      });
    }
  }

  for (const [lineId, discount] of Object.entries(financeState.lineDiscounts)) {
    if (!discount.enabled || !discount.type) continue;
    const value = discount.value.trim();
    const reason = discount.reason;
    if (!value || !reason) continue;
    items.push({
      kind: 'line_discount',
      label: discountLabel(discount.type, value, reason, lineName(suggest, Number(lineId))),
    });
  }

  for (const [lineId, oneTime] of Object.entries(financeState.oneTimeLines)) {
    const label = lineName(suggest, Number(lineId));
    if (!oneTime.selected) {
      items.push({ kind: 'one_time_excluded', label });
      continue;
    }
    const hasAmount = parseAmount(oneTime.amountOverride) != null;
    const hasDue = Boolean(oneTime.dueDateOverride.trim());
    if (hasAmount || hasDue) {
      items.push({
        kind: 'one_time_modified',
        label: `${label}${hasAmount ? ` — ${oneTime.amountOverride}` : ''}${hasDue ? ` — ${oneTime.dueDateOverride}` : ''}`,
      });
    }
  }

  for (const period of suggest.suggested_periods) {
    const override = financeState.periodOverrides[period.period_key];
    if (!override) continue;
    const label = periodLabel(suggest, period.period_key);
    if (!override.selected) {
      items.push({ kind: 'period_excluded', label });
      continue;
    }
    const hasAmount = parseAmount(override.amountOverride) != null;
    const hasDue =
      Boolean(override.dueDateOverride.trim()) &&
      override.dueDateOverride.trim() !== period.due_date;
    if (hasAmount || hasDue) {
      items.push({
        kind: 'period_modified',
        label: `${label}${hasAmount ? ` — ${override.amountOverride}` : ''}${hasDue ? ` — ${override.dueDateOverride}` : ''}`,
      });
    }
  }

  return items;
}

export function buildEnrollmentFinanceReviewModel(
  suggest: FeePlanSuggestResult,
  financeState: StudentCreateFinanceFormState,
  preview: EnrollmentPlanPreviewResult | null,
): EnrollmentFinanceReviewModel {
  const planLines = suggest.plan_lines ?? [];
  const summaryRows = financialSummaryRows(suggest.financial_summary, planLines);
  const customized = financeState.customizePlan;

  let originalTotal: number | null = null;
  let discountTotal: number | null = null;
  let finalTotal: number | null = null;
  let monthlyInstallment: number | null = suggest.financial_summary?.monthly_installment_amount ?? null;

  if (customized && preview) {
    originalTotal = preview.original_total ?? null;
    discountTotal = preview.discount_total ?? null;
    finalTotal = preview.final_total ?? null;
    monthlyInstallment = preview.monthly_due_total ?? monthlyInstallment;
  } else if (!customized) {
    finalTotal = suggest.financial_summary?.expected_total ?? suggest.total_due ?? null;
    monthlyInstallment = suggest.financial_summary?.monthly_installment_amount ?? null;
  }

  return {
    planId: financeState.selectedFeePlanId ?? suggest.fee_plan_id,
    planName: suggest.fee_plan_name,
    customized,
    customizationReason: financeState.customizationReason,
    summaryRows,
    originalTotal,
    discountTotal,
    finalTotal,
    monthlyInstallment,
    customizationItems: customized
      ? listEnrollmentReviewCustomizationItems(suggest, financeState)
      : [],
  };
}

export function validateEnrollmentFinanceSave(input: {
  customizePlan: boolean;
  customizationReason: string;
  previewLoading: boolean;
  previewError: string | null;
  preview: EnrollmentPlanPreviewResult | null;
}): EnrollmentFinanceSaveBlockReason {
  if (!input.customizePlan) return 'ok';
  if (!input.customizationReason.trim()) return 'reason_required';
  if (input.previewLoading) return 'preview_loading';
  if (input.previewError) return 'preview_error';
  if (input.preview?.final_total == null) return 'preview_incomplete';
  return 'ok';
}
