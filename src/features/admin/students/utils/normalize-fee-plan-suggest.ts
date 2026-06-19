import type { Ref } from '@/types/api';
import type { StudentFinanceCurrency } from '@/types/student-finance';
import type {
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
  if (!record) return null;
  const name = asString(record.name) ?? '';
  const symbol = asString(record.symbol) ?? '';
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

  return {
    ok: true,
    fee_plan_id: feePlanId,
    fee_plan_name: feePlanName,
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
    total_due: asNumber(record.total_due) ?? asNumber(record.total_amount),
    currency: readCurrency(record.currency),
    allowed_actions: {
      ...allowedActions,
      customize_periods: allowedActions?.customize_periods ?? customizePlanAllowed,
      customize_amounts: allowedActions?.customize_amounts ?? customizePlanAllowed,
      customize_due_dates: allowedActions?.customize_due_dates ?? customizePlanAllowed,
      notes: allowedActions?.notes ?? customizePlanAllowed,
    },
  };
}
