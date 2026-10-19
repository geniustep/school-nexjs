/** Client-only reader of the Odoo Executive Finance V2 payload. Never coerce unavailable to zero. */
export type ExecutiveFinancePeriodScope = 'current_month' | 'academic_year';
export interface ExecutiveFinanceMetric {
  available: boolean;
  amount: number | null;
  reason_code: string | null;
  basis?: string | null;
}
export interface ExecutiveFinanceAccountsMetric {
  available: boolean;
  count: number | null;
  reason_code: string | null;
}
export interface ExecutiveFinanceCohortMetric {
  available: boolean;
  due_amount: number | null;
  recognized_collected_amount: number | null;
  remaining_on_due_cohort: number | null;
  collection_rate: number | null;
  reason_code: string | null;
}
export interface ExecutiveFinanceIndicators {
  period_net_due: ExecutiveFinanceMetric;
  period_actual_collections: ExecutiveFinanceMetric;
  due_cohort_performance: ExecutiveFinanceCohortMetric;
  remaining_balance: ExecutiveFinanceMetric;
  overdue_outstanding: ExecutiveFinanceMetric;
  overdue_billing_accounts_count: ExecutiveFinanceAccountsMetric;
}
export interface ExecutiveFinancePeriod {
  scope: ExecutiveFinancePeriodScope;
  available: boolean;
  date_from: string | null;
  date_to: string | null;
  as_of_date: string | null;
  reason_code: string | null;
}
export interface ExecutiveFinanceV2 {
  version: string;
  source: string;
  meta: {
    school_id: number | null;
    academic_year_id: number | null;
    academic_year_name: string | null;
    period: ExecutiveFinancePeriod;
    currency: { name: string; symbol: string | null; decimal_places: number | null } | null;
    generated_at: string | null;
  };
  indicators: ExecutiveFinanceIndicators | null;
  comparison_previous_period: {
    available: boolean;
    reason_code: string | null;
    period: ExecutiveFinancePeriod | null;
    indicators: ExecutiveFinanceIndicators | null;
  } | null;
  unavailable_metrics: {
    paid_expenses: { available: boolean; reason_code: string | null } | null;
  };
}
function record(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
}
function number(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function str(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}
export function readFinanceV2Metric(raw: unknown): ExecutiveFinanceMetric {
  const r = record(raw);
  const n = number(r?.amount);
  const available = r?.available === true && n !== null;
  return {
    available,
    amount: available ? n : null,
    reason_code: available ? null : str(r?.reason_code) ?? 'metric_unavailable',
    ...(str(r?.basis) ? { basis: str(r?.basis) } : {}),
  };
}
function accounts(raw: unknown): ExecutiveFinanceAccountsMetric {
  const r = record(raw);
  const n = number(r?.count);
  const available = r?.available === true && n !== null;
  return { available, count: available ? n : null,
    reason_code: available ? null : str(r?.reason_code) ?? 'metric_unavailable' };
}
function cohort(raw: unknown): ExecutiveFinanceCohortMetric {
  const r = record(raw);
  const due = number(r?.due_amount), collected = number(r?.recognized_collected_amount);
  const remaining = number(r?.remaining_on_due_cohort), rate = number(r?.collection_rate);
  const available = r?.available === true && [due, collected, remaining, rate].every(v => v !== null);
  return { available, due_amount: available ? due : null,
    recognized_collected_amount: available ? collected : null,
    remaining_on_due_cohort: available ? remaining : null,
    collection_rate: available ? rate : null,
    reason_code: available ? null : str(r?.reason_code) ?? 'metric_unavailable' };
}
function scope(v: unknown): ExecutiveFinancePeriodScope | null {
  return v === 'current_month' || v === 'academic_year' ? v : null;
}
function period(raw: unknown): ExecutiveFinancePeriod | null {
  const r = record(raw), s = scope(r?.scope);
  if (!r || !s) return null;
  const dateFrom = str(r.date_from), dateTo = str(r.date_to);
  return { scope: s, available: r.available !== false && !!dateFrom && !!dateTo,
    date_from: dateFrom, date_to: dateTo, as_of_date: str(r.as_of_date),
    reason_code: str(r.reason_code) };
}
function indicators(raw: unknown): ExecutiveFinanceIndicators | null {
  const r = record(raw);
  if (!r) return null;
  return {
    period_net_due: readFinanceV2Metric(r.period_net_due),
    period_actual_collections: readFinanceV2Metric(r.period_actual_collections),
    due_cohort_performance: cohort(r.due_cohort_performance),
    remaining_balance: readFinanceV2Metric(r.remaining_balance),
    overdue_outstanding: readFinanceV2Metric(r.overdue_outstanding),
    overdue_billing_accounts_count: accounts(r.overdue_billing_accounts_count),
  };
}
/** Returns null for old runtimes or RBAC-redacted payloads. */
export function readExecutiveFinanceV2(raw: unknown): ExecutiveFinanceV2 | null {
  const r = record(raw);
  if (!r || str(r.version) !== 'executive-finance-v2') return null;
  const m = record(r.meta), p = period(m?.period);
  if (!m || !p) return null;
  const currency = record(m.currency), comparisonRaw = record(r.comparison_previous_period);
  const comparisonPeriod = comparisonRaw ? period(comparisonRaw.period) : null;
  const comparisonIndicators = comparisonRaw?.available === true ? indicators(comparisonRaw.indicators) : null;
  const comparisonAvailable = comparisonRaw?.available === true && comparisonPeriod?.available === true && comparisonIndicators !== null;
  const unavailable = record(r.unavailable_metrics);
  const paidExpenses = record(unavailable?.paid_expenses);
  return {
    version: 'executive-finance-v2', source: str(r.source) ?? '',
    meta: {
      school_id: number(m.school_id), academic_year_id: number(m.academic_year_id),
      academic_year_name: str(m.academic_year_name), period: p,
      currency: currency && str(currency.name) ? {
        name: str(currency.name)!, symbol: str(currency.symbol), decimal_places: number(currency.decimal_places),
      } : null,
      generated_at: str(m.generated_at),
    },
    indicators: p.available ? indicators(r.indicators) : null,
    comparison_previous_period: comparisonRaw ? {
      available: comparisonAvailable,
      reason_code: comparisonAvailable ? null : str(comparisonRaw.reason_code) ?? 'comparison_unavailable',
      period: comparisonPeriod,
      indicators: comparisonAvailable ? comparisonIndicators : null,
    } : null,
    unavailable_metrics: { paid_expenses: paidExpenses ? {
      available: false, reason_code: str(paidExpenses.reason_code) ?? 'expense_payment_cycle_not_implemented',
    } : null },
  };
}

export function financeV2Query(scopeValue: ExecutiveFinancePeriodScope): { finance_period_scope: ExecutiveFinancePeriodScope } {
  return { finance_period_scope: scopeValue };
}
