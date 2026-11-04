/** Read-only Odoo contractual services analytics V1. The backend owns every financial total. */
export type ObligationScope = 'current_verified_month' | 'selected_month' | 'school_year_to_date' | 'school_year';
export type ServiceSelection = number[] | null;
export type ObligationService = {
  service_id: number; service_name: string; service_code: string; selected: boolean;
  total: string | null; beneficiary_count: number; average_per_beneficiary: string | null;
  data_quality: string | null;
};
export type ObligationMonth = { period_key: string; total: string | null; includes_future_schedule: boolean };
export type ContractualObligations = {
  school_id: number; academic_year_id: number; currency: string;
  period_scope: ObligationScope; period_key: string | null;
  verification_status: 'approved' | 'not_approved';
  selection_mode: string; total: string | null; average_per_active_student: string | null;
  active_student_count: number | null; services: ObligationService[];
  monthly_distribution: ObligationMonth[]; basis: string | null; historical_snapshot: boolean;
  includes_future_scheduled_periods: boolean;
  services_total_reconciles_with_analytics_total: boolean;
  monthly_distribution_reconciles_with_total: boolean;
  finance_v4_full_selection_match: boolean | null;
};
const months = /^\d{4}-(?:0[1-9]|1[0-2])$/;
export function validPeriodKey(value: string): boolean { return months.test(value); }
const object = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const nonnegative = (v: unknown): number | null =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
const id = (v: unknown): number | null => {
  const n = nonnegative(v); return n !== null && n > 0 ? n : null;
};
const label = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null;
function money(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).trim();
  return /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(s) &&
    Number.isFinite(Number(s)) && Math.abs(Number(s)) <= Number.MAX_SAFE_INTEGER ? s : null;
}
export function makeObligationsQuery(year: number, scope: ObligationScope, month: string, selection: ServiceSelection) {
  const result: Record<string, number | string> = { academic_year_id: year, period_scope: scope };
  if (scope === 'selected_month') result.period_key = month;
  if (selection !== null) result.selected_service_ids = selection.join(',');
  return result;
}
export function selectionMatches(rows: ObligationService[], selection: ServiceSelection): boolean {
  if (selection === null) return rows.every(row => row.selected);
  const selected = rows.filter(row => row.selected).map(row => row.service_id).sort((a,b)=>a-b);
  const expected = [...new Set(selection)].sort((a,b)=>a-b);
  return selected.length === expected.length && selected.every((value, i) => value === expected[i]);
}
export function parseContractualObligations(
  raw: unknown, schoolId: number | null, yearId: number | null,
  scope: ObligationScope, periodKey?: string,
): ContractualObligations | null {
  if (!schoolId || !yearId) return null;
  const envelope = object(raw);
  const doc = envelope?.success === true ? object(envelope.data) : envelope;
  if (!doc || doc.status !== 'ok' || doc.contract !== 'contractual_services_analytics_v1' ||
      id(doc.school_id) !== schoolId || id(doc.academic_year_id) !== yearId ||
      typeof doc.currency !== 'string' || !/^[A-Z]{3}$/.test(doc.currency)) return null;
  const a = object(doc.analytics);
  if (!a || a.period_scope !== scope || !Array.isArray(a.services) ||
      (scope === 'selected_month' && (!periodKey || !validPeriodKey(periodKey) || a.period_key !== periodKey)) ||
      (a.verification_status !== 'approved' && a.verification_status !== 'not_approved')) return null;
  const yearly = scope === 'school_year' || scope === 'school_year_to_date';
  if (scope !== 'current_verified_month' && (a.basis !== 'current_schedule' || a.historical_snapshot !== false)) return null;
  const rows: ObligationService[] = [];
  const seen = new Set<number>();
  for (const value of a.services) {
    const s = object(value);
    const sid = id(s?.service_id);
    const rawTotal = yearly ? s?.scheduled_year_total : s?.total;
    const rawAverage = yearly ? s?.average_per_beneficiary_across_year : s?.average_per_beneficiary;
    if (!s || sid === null || seen.has(sid) ||
        !label(s.service_name) || !label(s.service_code) ||
        typeof s.selected !== 'boolean' || nonnegative(s.beneficiary_count) === null ||
        (rawTotal !== null && rawTotal !== undefined && money(rawTotal) === null) ||
        (rawAverage !== null && rawAverage !== undefined && money(rawAverage) === null)) return null;
    seen.add(sid);
    rows.push({
      service_id: sid, service_name: label(s.service_name)!, service_code: label(s.service_code)!,
      selected: s.selected, total: rawTotal == null ? null : money(rawTotal),
      beneficiary_count: nonnegative(s.beneficiary_count)!,
      average_per_beneficiary: rawAverage == null ? null : money(rawAverage),
      data_quality: label(s.data_quality),
    });
  }
  const annual = a.monthly_distribution;
  if (yearly && !Array.isArray(annual)) return null;
  const distribution: ObligationMonth[] = [];
  if (Array.isArray(annual)) for (const item of annual) {
    const m = object(item);
    if (!m || !label(m.period_key) || !validPeriodKey(m.period_key as string) ||
        (m.total != null && money(m.total) === null)) return null;
    distribution.push({
      period_key: m.period_key as string, total: m.total == null ? null : money(m.total),
      includes_future_schedule: m.includes_future_schedule === true,
    });
  }
  if (a.total != null && money(a.total) === null) return null;
  if (a.average_per_active_student != null && money(a.average_per_active_student) === null) return null;
  return {
    school_id: schoolId, academic_year_id: yearId, currency: doc.currency,
    period_scope: scope, period_key: label(a.period_key),
    verification_status: a.verification_status as 'approved' | 'not_approved',
    selection_mode: label(a.selection_mode) ?? '',
    total: a.total == null ? null : money(a.total),
    average_per_active_student: a.average_per_active_student == null ? null : money(a.average_per_active_student),
    active_student_count: nonnegative(a.active_student_count),
    services: rows, monthly_distribution: distribution,
    basis: label(a.basis), historical_snapshot: a.historical_snapshot === true,
    includes_future_scheduled_periods: a.includes_future_scheduled_periods === true,
    services_total_reconciles_with_analytics_total: a.services_total_reconciles_with_analytics_total === true,
    monthly_distribution_reconciles_with_total: a.monthly_distribution_reconciles_with_total === true,
    finance_v4_full_selection_match: typeof a.finance_v4_full_selection_match === 'boolean' ? a.finance_v4_full_selection_match : null,
  };
}
export function canShowObligationTotal(d: ContractualObligations | null, selection: ServiceSelection): boolean {
  if (!d || d.verification_status !== 'approved' || d.total === null ||
      !d.services_total_reconciles_with_analytics_total || !selectionMatches(d.services, selection) ||
      d.services.some(s => s.selected && s.total === null)) return false;
  if (selection === null && d.selection_mode !== 'all_services_default') return false;
  if (selection !== null && selection.length && d.selection_mode !== 'explicit_service_ids') return false;
  if (selection !== null && !selection.length &&
      (d.selection_mode !== 'no_services_selected' || Number(d.total) !== 0)) return false;
  if ((d.period_scope === 'school_year' || d.period_scope === 'school_year_to_date') &&
      !d.monthly_distribution_reconciles_with_total) return false;
  if (d.period_scope === 'current_verified_month' && selection === null &&
      d.finance_v4_full_selection_match !== true) return false;
  return true;
}
