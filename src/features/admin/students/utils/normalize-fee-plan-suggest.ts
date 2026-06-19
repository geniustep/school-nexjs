import type { Ref } from '@/types/api';
import type { StudentFinanceCurrency } from '@/types/student-finance';
import type {
  EligibleFeePlan,
  EnrollmentCustomizationContract,
  EnrollmentFinancialSummary,
  EnrollmentPlanLine,
  EnrollmentPlanPreviewResult,
  FeePlanExcludedPeriod,
  FeePlanSuggestAllowedActions,
  FeePlanSuggestResult,
  FeePlanSuggestedPeriod,
} from '@/types/student-enrollment-finance';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

function readRef(value: unknown): Ref | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asNumber(record.id);
  if (id == null) return null;
  return {
    id,
    name: asString(record.name) ?? asString(record.display_name) ?? '',
  };
}

function readCurrency(value: unknown): StudentFinanceCurrency | null {
  const record = asRecord(value);
  if (!record) {
    const code = asString(value);
    return code ? { name: code, symbol: code } : null;
  }
  const name = asString(record.name) ?? asString(record.code) ?? '';
  const symbol = asString(record.symbol) ?? name;
  if (!name && !symbol) return null;
  return {
    name,
    symbol,
    position: asString(record.position) as StudentFinanceCurrency['position'],
  };
}

function readPeriod(value: unknown): FeePlanSuggestedPeriod | null {
  const record = asRecord(value);
  if (!record) return null;
  const periodKey = asString(record.period_key) ?? asString(record.key);
  const dueDate = asString(record.due_date);
  if (!periodKey || !dueDate) return null;
  return {
    period_key: periodKey,
    label:
      asString(record.label) ??
      asString(record.month_label) ??
      asString(record.name) ??
      periodKey,
    due_date: dueDate,
    amount: asNumber(record.amount),
    selected: asBoolean(record.selected) ?? true,
    allow_amount_override: asBoolean(record.allow_amount_override),
    allow_due_date_override: asBoolean(record.allow_due_date_override),
  };
}

function readExcludedPeriod(value: unknown): FeePlanExcludedPeriod | null {
  const record = asRecord(value);
  if (!record) {
    const label = asString(value);
    return label ? { period_key: label, label } : null;
  }
  const periodKey = asString(record.period_key) ?? asString(record.key) ?? asString(record.label);
  const label = asString(record.label) ?? asString(record.month_label) ?? periodKey;
  if (!periodKey || !label) return null;
  return { period_key: periodKey, label };
}

function readAllowedActions(value: unknown): FeePlanSuggestAllowedActions | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    skip_finance: asBoolean(record.skip_finance),
    customize_amounts: asBoolean(record.customize_amounts),
    customize_due_dates: asBoolean(record.customize_due_dates),
    customize_periods: asBoolean(record.customize_periods),
    customize_plan: asBoolean(record.customize_plan),
    select_other_plan: asBoolean(record.select_other_plan),
    notes: asBoolean(record.notes),
  };
}

function readPeriodList(value: unknown): FeePlanSuggestedPeriod[] {
  if (!Array.isArray(value)) return [];
  return value.map(readPeriod).filter((p): p is FeePlanSuggestedPeriod => p != null);
}

function readExcludedList(value: unknown): FeePlanExcludedPeriod[] {
  if (!Array.isArray(value)) return [];
  return value.map(readExcludedPeriod).filter((p): p is FeePlanExcludedPeriod => p != null);
}

function readEligiblePlan(value: unknown): EligibleFeePlan | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asNumber(record.id);
  const name = asString(record.name);
  if (id == null || !name) return null;
  const summaryRecord = asRecord(record.summary);
  return {
    id,
    name,
    is_default_for_level: asBoolean(record.is_default_for_level),
    is_selected: asBoolean(record.is_selected),
    summary: summaryRecord
      ? {
          expected_total: asNumber(summaryRecord.expected_total),
          monthly_due_total: asNumber(summaryRecord.monthly_due_total),
          one_time_total: asNumber(summaryRecord.one_time_total),
        }
      : undefined,
  };
}

function readPlanLine(value: unknown): EnrollmentPlanLine | null {
  const record = asRecord(value);
  if (!record) return null;
  const lineId = asNumber(record.line_id) ?? asNumber(record.id);
  const feeTypeName = asString(record.fee_type_name) ?? asString(record.name);
  if (lineId == null || !feeTypeName) return null;
  return {
    line_id: lineId,
    fee_type_id: asNumber(record.fee_type_id),
    fee_type_name: feeTypeName,
    frequency: asString(record.frequency),
    base_amount: asNumber(record.base_amount),
    amount: asNumber(record.amount),
    currency: asString(record.currency),
    installment_count: asNumber(record.installment_count),
    installment_amount:
      asNumber(record.installment_amount) ?? asNumber(record.monthly_installment_amount),
    total_amount: asNumber(record.total_amount),
    monthly_installment_amount: asNumber(record.monthly_installment_amount),
    is_mandatory: asBoolean(record.is_mandatory),
    is_monthly: asBoolean(record.is_monthly),
    is_one_time: asBoolean(record.is_one_time),
    is_optional: asBoolean(record.is_optional),
    pricing_mode: asString(record.pricing_mode),
    due_date: asString(record.due_date),
    original_total: asNumber(record.original_total),
    suggested_total: asNumber(record.suggested_total),
  };
}

function readFinancialSummary(value: unknown): EnrollmentFinancialSummary | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    currency: readCurrency(record.currency) ?? asString(record.currency),
    one_time_total: asNumber(record.one_time_total),
    original_monthly_total: asNumber(record.original_monthly_total),
    suggested_monthly_total: asNumber(record.suggested_monthly_total),
    plan_monthly_total: asNumber(record.plan_monthly_total),
    monthly_total: asNumber(record.monthly_total),
    monthly_due_total: asNumber(record.monthly_due_total),
    monthly_installment_amount: asNumber(record.monthly_installment_amount),
    original_monthly_installments_count: asNumber(record.original_monthly_installments_count),
    suggested_monthly_installments_count: asNumber(record.suggested_monthly_installments_count),
    monthly_installments_count: asNumber(record.monthly_installments_count),
    expected_total: asNumber(record.expected_total),
    recurring_periodic_total: asNumber(record.recurring_periodic_total),
  };
}

function readCustomizationContract(value: unknown): EnrollmentCustomizationContract | null {
  const record = asRecord(value);
  if (!record) return null;
  const oneTimeLines = Array.isArray(record.one_time_lines)
    ? record.one_time_lines
        .map((item) => {
          const line = asRecord(item);
          if (!line) return null;
          const lineId = asNumber(line.line_id);
          if (lineId == null) return null;
          return {
            line_id: lineId,
            selected: asBoolean(line.selected),
            amount_override: asNumber(line.amount_override) ?? null,
            due_date_override: asString(line.due_date_override) ?? null,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : undefined;

  return {
    periods_apply_to: asString(record.periods_apply_to),
    one_time_lines: oneTimeLines,
    supports_plan_discount: asBoolean(record.supports_plan_discount),
    supports_line_discount: asBoolean(record.supports_line_discount),
    supports_period_discount: asBoolean(record.supports_period_discount),
    discount_types: Array.isArray(record.discount_types)
      ? (record.discount_types.filter((v) => v === 'percent' || v === 'fixed_amount') as (
          | 'percent'
          | 'fixed_amount'
        )[])
      : undefined,
    discount_scopes: Array.isArray(record.discount_scopes)
      ? (record.discount_scopes.filter((v) => v === 'plan' || v === 'line' || v === 'period') as (
          | 'plan'
          | 'line'
          | 'period'
        )[])
      : undefined,
    requires_reason: asBoolean(record.requires_reason),
  };
}

export function readEnrollmentPlanPreview(value: unknown): EnrollmentPlanPreviewResult | null {
  const record = asRecord(value);
  if (!record) return null;
  const lines = Array.isArray(record.lines)
    ? record.lines
        .map((item) => {
          const line = asRecord(item);
          if (!line) return null;
          const lineId = asNumber(line.line_id);
          if (lineId == null) return null;
          return {
            line_id: lineId,
            fee_type_name: asString(line.fee_type_name),
            base_amount: asNumber(line.base_amount),
            final_installment_amount: asNumber(line.final_installment_amount),
            final_total: asNumber(line.final_total),
            discount_percent: asNumber(line.discount_percent),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : undefined;

  return {
    original_total: asNumber(record.original_total),
    discount_total: asNumber(record.discount_total),
    final_total: asNumber(record.final_total),
    monthly_due_total: asNumber(record.monthly_due_total),
    one_time_total: asNumber(record.one_time_total),
    lines,
  };
}

export function resolveFeePlanSuggestErrorCode(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;
  if (record.ok === false) {
    const nested = asRecord(record.error);
    return asString(nested?.code) ?? asString(record.error_code) ?? asString(record.code) ?? null;
  }
  return null;
}

export function normalizeFeePlanSuggestResponse(payload: unknown): FeePlanSuggestResult | null {
  const record = asRecord(payload);
  if (!record || record.ok === false) return null;

  const feePlan = asRecord(record.fee_plan) ?? asRecord(record.plan);
  const billingCalendar = asRecord(record.billing_calendar);
  const feePlanId = asNumber(record.fee_plan_id) ?? asNumber(feePlan?.id);
  const feePlanName = asString(record.fee_plan_name) ?? asString(feePlan?.name);
  if (feePlanId == null || !feePlanName) return null;

  const suggestedPeriods = readPeriodList(record.suggested_periods);
  if (suggestedPeriods.length === 0) {
    const fallback =
      readPeriodList(record.periods).length > 0
        ? readPeriodList(record.periods)
        : readPeriodList(record.included_periods);
    suggestedPeriods.push(...fallback);
  }

  const allowedActions = readAllowedActions(record.allowed_actions);
  const customizePlanAllowed = asBoolean(asRecord(record.allowed_actions)?.customize_plan);
  const financialSummary = readFinancialSummary(record.financial_summary);
  const currency =
    readCurrency(record.currency) ??
    (typeof financialSummary?.currency === 'object' && financialSummary.currency
      ? financialSummary.currency
      : typeof financialSummary?.currency === 'string'
        ? readCurrency({ name: financialSummary.currency, symbol: financialSummary.currency })
        : null);

  return {
    ok: true,
    fee_plan_id: feePlanId,
    fee_plan_name: feePlanName,
    is_default_for_level: asBoolean(feePlan?.is_default_for_level),
    academic_year: readRef(record.academic_year) ?? (feePlan?.academic_year_id != null
      ? { id: asNumber(feePlan.academic_year_id) as number, name: '' }
      : null),
    level: readRef(record.level) ?? (feePlan?.level_id != null
      ? { id: asNumber(feePlan.level_id) as number, name: '' }
      : null),
    season_name:
      asString(record.season_name) ??
      asString(record.season) ??
      asString(asRecord(record.season)?.name),
    performance_start:
      asString(record.performance_start) ??
      asString(record.billing_start) ??
      asString(record.start_date) ??
      asString(billingCalendar?.start_date),
    performance_end:
      asString(record.performance_end) ??
      asString(record.billing_end) ??
      asString(record.end_date) ??
      asString(billingCalendar?.end_date),
    due_day:
      asNumber(record.due_day) ??
      asNumber(record.due_day_of_month) ??
      asNumber(billingCalendar?.default_due_day),
    suggested_period_count:
      asNumber(record.suggested_period_count) ?? (suggestedPeriods.length || null),
    suggested_periods: suggestedPeriods,
    excluded_periods: readExcludedList(record.excluded_periods),
    total_due:
      asNumber(record.total_due) ??
      asNumber(record.total_amount) ??
      financialSummary?.expected_total,
    currency,
    allowed_actions: {
      ...allowedActions,
      customize_periods: allowedActions?.customize_periods ?? customizePlanAllowed,
      customize_amounts: allowedActions?.customize_amounts ?? customizePlanAllowed,
      customize_due_dates: allowedActions?.customize_due_dates ?? customizePlanAllowed,
      customize_plan: allowedActions?.customize_plan ?? customizePlanAllowed,
      notes: allowedActions?.notes ?? customizePlanAllowed,
    },
    eligible_plans: Array.isArray(record.eligible_plans)
      ? record.eligible_plans
          .map(readEligiblePlan)
          .filter((plan): plan is EligibleFeePlan => plan != null)
      : undefined,
    plan_lines: Array.isArray(record.plan_lines)
      ? record.plan_lines.map(readPlanLine).filter((line): line is EnrollmentPlanLine => line != null)
      : undefined,
    financial_summary: financialSummary,
    customization_contract: readCustomizationContract(record.customization_contract),
    preview: readEnrollmentPlanPreview(record.preview),
  };
}
