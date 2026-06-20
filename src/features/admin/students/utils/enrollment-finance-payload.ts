import type {
  EnrollmentPlanLine,
  EnrollmentFinancialSummary,
  FeePlanCustomizationReason,
  FeePlanSuggestResult,
  StudentCreateFinanceDiscountPayload,
  StudentCreateFinanceFormState,
  StudentCreateFinanceOneTimeLinePayload,
  StudentCreateFinancePayload,
  StudentCreateFinancePeriodPayload,
} from '@/types/student-enrollment-finance';
import { parseDiscountPayloadValue } from './normalize-discount-percent';

const EMPTY_DISCOUNT: StudentCreateFinanceFormState['planDiscount'] = {
  enabled: false,
  type: '',
  value: '',
  reason: '',
};

export function enrollmentPlanLinePricingModeKey(
  line: Pick<EnrollmentPlanLine, 'frequency' | 'pricing_mode' | 'is_one_time'>,
): string {
  if (line.pricing_mode === 'recurring_unit_price') {
    return 'admin.student360.create.finance.pricingModes.recurring_unit_price';
  }
  if (line.frequency === 'one_time' || line.is_one_time) {
    return 'admin.student360.create.finance.pricingModes.one_time';
  }
  return 'admin.student360.create.finance.pricingModes.total_amount_installments';
}

export function enrollmentPlanLineAmountParts(line: EnrollmentPlanLine): {
  primary: number | null;
  installmentAmount: number | null;
  installmentCount: number | null;
  totalAmount: number | null;
} {
  const installmentCount = line.installment_count ?? null;
  const installmentAmount =
    line.installment_amount ?? line.monthly_installment_amount ?? null;
  const totalAmount =
    line.total_amount ??
    line.suggested_total ??
    line.original_total ??
    line.amount ??
    line.base_amount ??
    null;

  if (line.pricing_mode === 'recurring_unit_price') {
    return {
      primary: line.amount ?? line.base_amount ?? installmentAmount,
      installmentAmount,
      installmentCount,
      totalAmount,
    };
  }

  if (line.frequency === 'one_time' || line.is_one_time) {
    return {
      primary: totalAmount,
      installmentAmount: null,
      installmentCount: null,
      totalAmount,
    };
  }

  return {
    primary: totalAmount,
    installmentAmount,
    installmentCount,
    totalAmount,
  };
}

export function computeExpectedMonthlyDueFromPlanLines(
  lines: EnrollmentPlanLine[] | null | undefined,
): number | null {
  if (!lines?.length) return null;

  let total = 0;
  let found = false;

  for (const line of lines) {
    if (line.is_one_time || line.frequency === 'one_time') continue;

    if (line.pricing_mode === 'recurring_unit_price') {
      const unit =
        line.amount ??
        line.base_amount ??
        line.installment_amount ??
        line.monthly_installment_amount ??
        null;
      if (unit != null && Number.isFinite(unit)) {
        total += unit;
        found = true;
      }
      continue;
    }

    if (line.frequency === 'monthly' || line.is_monthly) {
      const parts = enrollmentPlanLineAmountParts(line);
      const monthly = parts.installmentAmount ?? parts.primary;
      if (monthly != null && Number.isFinite(monthly)) {
        total += monthly;
        found = true;
      }
    }
  }

  return found ? total : null;
}

export function resolveExpectedMonthlyDueAmount(
  summary: EnrollmentFinancialSummary | null | undefined,
  lines?: EnrollmentPlanLine[],
): number | null {
  const computed = computeExpectedMonthlyDueFromPlanLines(lines);
  if (computed != null) return computed;

  const fromSummary =
    summary?.monthly_due_total ??
    summary?.monthly_installment_amount ??
    summary?.suggested_monthly_total ??
    null;
  return fromSummary != null && Number.isFinite(fromSummary) ? fromSummary : null;
}

export function financialSummaryRows(
  summary: EnrollmentFinancialSummary | null | undefined,
  lines?: EnrollmentPlanLine[],
): Array<{ key: string; value: number }> {
  if (!summary && (!lines || lines.length === 0)) return [];
  const rows: Array<{ key: string; value: number }> = [];
  const push = (key: string, value: number | null | undefined) => {
    if (value != null && Number.isFinite(value)) rows.push({ key, value });
  };

  push('one_time_total', summary?.one_time_total);

  if (lines && lines.length > 0) {
    let installmentTotal = 0;
    let recurringTotal = 0;
    for (const line of lines) {
      if (line.is_one_time || line.frequency === 'one_time') continue;
      const total = line.suggested_total ?? line.total_amount ?? line.amount ?? 0;
      if (line.pricing_mode === 'recurring_unit_price') recurringTotal += total;
      else installmentTotal += total;
    }
    push('installment_total', installmentTotal);
    push('recurring_periodic_total', recurringTotal);
  } else {
    push(
      'installment_total',
      summary?.suggested_monthly_total ?? summary?.plan_monthly_total ?? summary?.original_monthly_total,
    );
    push('recurring_periodic_total', summary?.recurring_periodic_total);
  }

  push('monthly_installment_amount', resolveExpectedMonthlyDueAmount(summary, lines));
  push('expected_total', summary?.expected_total);
  return rows;
}

function parseOptionalAmount(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function resolveDiscountReason(
  lineReason: string | undefined,
  customizationReason: string,
): string {
  const specific = lineReason?.trim();
  if (specific) return specific;
  return customizationReason.trim();
}

export function formatCustomizationReason(
  reason: string | null | undefined,
  t: (key: string) => string,
): string {
  const key = reason?.trim();
  if (!key) return '';
  const i18nKey = `admin.student360.create.finance.reasons.${key}`;
  const translated = t(i18nKey);
  return translated !== i18nKey ? translated : key.replace(/_/g, ' ');
}

function buildDiscountPayloads(
  financeState: StudentCreateFinanceFormState,
): StudentCreateFinanceDiscountPayload[] {
  const discounts: StudentCreateFinanceDiscountPayload[] = [];
  const generalReason = financeState.customizationReason.trim();

  if (financeState.planDiscount.enabled && financeState.planDiscount.type) {
    const value = parseDiscountPayloadValue(
      financeState.planDiscount.type,
      financeState.planDiscount.value,
    );
    const reason = resolveDiscountReason(financeState.planDiscount.reason, generalReason);
    if (value != null && reason) {
      discounts.push({
        scope: 'plan',
        type: financeState.planDiscount.type,
        value,
        reason: reason as FeePlanCustomizationReason,
      });
    }
  }

  for (const [lineId, discount] of Object.entries(financeState.lineDiscounts)) {
    if (!discount.enabled || !discount.type) continue;
    const value = parseDiscountPayloadValue(discount.type, discount.value);
    if (value == null) continue;
    const reason = resolveDiscountReason(discount.reason, generalReason);
    if (!reason) continue;
    discounts.push({
      scope: 'line',
      line_id: Number(lineId),
      type: discount.type,
      value,
      reason: reason as FeePlanCustomizationReason,
    });
  }

  return discounts;
}

function buildOneTimeLinePayloads(
  financeState: StudentCreateFinanceFormState,
): StudentCreateFinanceOneTimeLinePayload[] {
  return Object.entries(financeState.oneTimeLines).map(([lineId, line]) => ({
    line_id: Number(lineId),
    selected: line.selected,
    amount_override: parseOptionalAmount(line.amountOverride) ?? null,
    due_date_override: line.dueDateOverride.trim() || null,
  }));
}

export function resolveFinanceSuggestedPeriods(
  suggest: Pick<FeePlanSuggestResult, 'suggested_periods'>,
): FeePlanSuggestResult['suggested_periods'] {
  return suggest.suggested_periods ?? [];
}

export function ensureFinancePeriodOverrides(
  suggestPeriods: Array<{ period_key: string; selected?: boolean }>,
  periodOverrides: StudentCreateFinanceFormState['periodOverrides'],
): StudentCreateFinanceFormState['periodOverrides'] {
  const next = { ...periodOverrides };
  for (const period of suggestPeriods) {
    if (next[period.period_key]) continue;
    next[period.period_key] = {
      selected: period.selected !== false,
      amountOverride: '',
      dueDateOverride: '',
    };
  }
  return next;
}

export function buildFinancePeriodPayloads(
  suggestPeriods: Array<{ period_key: string; selected?: boolean }>,
  periodOverrides: StudentCreateFinanceFormState['periodOverrides'],
): StudentCreateFinancePeriodPayload[] {
  const normalizedOverrides = ensureFinancePeriodOverrides(suggestPeriods, periodOverrides);
  return suggestPeriods.map((period) => {
    const override = normalizedOverrides[period.period_key];
    const selected = override?.selected ?? period.selected !== false;
    const amountOverride = override ? parseOptionalAmount(override.amountOverride) : null;
    const dueDateOverride = override?.dueDateOverride?.trim() || null;
    return {
      period_key: period.period_key,
      selected,
      amount_override: amountOverride === undefined ? null : amountOverride,
      due_date_override: dueDateOverride,
    };
  });
}

export function hasValidCustomizedFinancePeriods(
  suggestPeriods: Array<{ period_key: string; selected?: boolean }>,
  periodOverrides: StudentCreateFinanceFormState['periodOverrides'],
): boolean {
  if (suggestPeriods.length === 0) return false;
  return buildFinancePeriodPayloads(suggestPeriods, periodOverrides).some((period) => period.selected);
}

export function buildStudentCreateFinancePayload(
  feePlanId: number,
  suggestPeriods: Array<{ period_key: string; selected?: boolean }>,
  financeState: StudentCreateFinanceFormState,
): StudentCreateFinancePayload {
  const payload: StudentCreateFinancePayload = {
    fee_plan_id: feePlanId,
    customize_plan: financeState.customizePlan,
  };

  if (!financeState.customizePlan) return payload;

  if (financeState.customizationReason) {
    payload.customization_reason = financeState.customizationReason;
  }
  const notes = financeState.customizationNotes.trim();
  if (notes) payload.customization_notes = notes;

  payload.periods = buildFinancePeriodPayloads(
    suggestPeriods,
    ensureFinancePeriodOverrides(suggestPeriods, financeState.periodOverrides),
  );

  const discounts = buildDiscountPayloads(financeState);
  if (discounts.length > 0) payload.discounts = discounts;

  const oneTimeLines = buildOneTimeLinePayloads(financeState);
  if (oneTimeLines.length > 0) payload.one_time_lines = oneTimeLines;

  return payload;
}

export function financeCustomizationReasonOptions(): FeePlanCustomizationReason[] {
  return [
    'late_enrollment',
    'scholarship',
    'special_discount',
    'family_agreement',
    'expected_withdrawal',
    'manual_adjustment',
    'other',
  ];
}

export function emptyFinanceDiscountState(): StudentCreateFinanceFormState['planDiscount'] {
  return { ...EMPTY_DISCOUNT };
}
