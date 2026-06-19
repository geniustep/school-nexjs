import type {
  EnrollmentPlanLine,
  EnrollmentFinancialSummary,
  FeePlanCustomizationReason,
  StudentCreateFinanceDiscountPayload,
  StudentCreateFinanceFormState,
  StudentCreateFinanceOneTimeLinePayload,
  StudentCreateFinancePayload,
  StudentCreateFinancePeriodPayload,
} from '@/types/student-enrollment-finance';

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

  push('monthly_installment_amount', summary?.monthly_installment_amount);
  push('expected_total', summary?.expected_total);
  return rows;
}

function parseOptionalAmount(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function buildDiscountPayloads(
  financeState: StudentCreateFinanceFormState,
): StudentCreateFinanceDiscountPayload[] {
  const discounts: StudentCreateFinanceDiscountPayload[] = [];

  if (financeState.planDiscount.enabled && financeState.planDiscount.type) {
    const value = parseOptionalAmount(financeState.planDiscount.value);
    if (value != null && financeState.planDiscount.reason) {
      discounts.push({
        scope: 'plan',
        type: financeState.planDiscount.type,
        value,
        reason: financeState.planDiscount.reason,
      });
    }
  }

  for (const [lineId, discount] of Object.entries(financeState.lineDiscounts)) {
    if (!discount.enabled || !discount.type) continue;
    const value = parseOptionalAmount(discount.value);
    if (value == null || !discount.reason) continue;
    discounts.push({
      scope: 'line',
      line_id: Number(lineId),
      type: discount.type,
      value,
      reason: discount.reason,
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

  const periods: StudentCreateFinancePeriodPayload[] = suggestPeriods.map((period) => {
    const override = financeState.periodOverrides[period.period_key];
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
  payload.periods = periods;

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
