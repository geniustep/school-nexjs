import type { ListParams } from '@/types/api';
import type {
  FinanceCommandCenterAgingKey,
  FinanceCommandCenterDrilldownTarget,
  FinanceCommandCenterMetricKey,
} from '@/types/finance-command-center';

export type FinanceCommandCenterPeriodPreset =
  | 'academic_year'
  | 'this_month'
  | 'previous_month'
  | 'custom';

export interface FinanceCommandCenterPeriodState {
  preset: FinanceCommandCenterPeriodPreset;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_COMMAND_CENTER_PERIOD: FinanceCommandCenterPeriodState = {
  preset: 'academic_year',
  dateFrom: '',
  dateTo: '',
};

export const FINANCE_COMMAND_CENTER_DRILLDOWN_API =
  '/api/v1/admin/finance/command-center/drilldown';

const DECISION_METRICS = new Set<FinanceCommandCenterMetricKey>([
  'due_to_date',
  'recognized_collected_to_date',
  'collection_rate_to_date',
  'overdue',
  'aging',
  'collection_performance',
]);

const AGING_BUCKETS = new Set<FinanceCommandCenterAgingKey>([
  'current',
  '1_30',
  '31_60',
  '61_90',
  '90_plus',
]);

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function monthEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
}

export function resolveCommandCenterPerformanceQuery(
  academicYearId: number | null | undefined,
  period: FinanceCommandCenterPeriodState,
  asOfDate?: string | null,
): ListParams | null {
  if (!academicYearId || academicYearId <= 0) return null;

  const base: ListParams = { academic_year_id: academicYearId };
  if (period.preset === 'academic_year') return base;

  if (period.preset === 'custom') {
    if (!period.dateFrom || !period.dateTo || period.dateFrom > period.dateTo) return null;
    return {
      ...base,
      date_from: period.dateFrom,
      date_to: period.dateTo,
    };
  }

  const asOf = parseIsoDate(asOfDate);
  if (!asOf) return null;

  if (period.preset === 'this_month') {
    return {
      ...base,
      date_from: isoDate(monthStart(asOf)),
      date_to: isoDate(asOf),
    };
  }

  const previous = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 1, 15, 12),
  );
  return {
    ...base,
    date_from: isoDate(monthStart(previous)),
    date_to: isoDate(monthEnd(previous)),
  };
}

export function isCommandCenterPeriodReady(
  period: FinanceCommandCenterPeriodState,
  asOfDate?: string | null,
): boolean {
  if (period.preset === 'academic_year') return true;
  if (period.preset === 'custom') {
    return Boolean(period.dateFrom && period.dateTo && period.dateFrom <= period.dateTo);
  }
  return Boolean(parseIsoDate(asOfDate));
}

export function safeFinanceCommandCenterActionPath(
  raw: string | null | undefined,
): string | null {
  if (!raw || raw.startsWith('//') || raw.includes('\\')) return null;
  try {
    const url = new URL(raw, 'https://raqeem.invalid');
    if (url.origin !== 'https://raqeem.invalid') return null;
    if (
      url.pathname !== '/admin/finance' &&
      !url.pathname.startsWith('/admin/finance/')
    ) {
      return null;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function appendAcademicYearToFinancePath(
  raw: string | null | undefined,
  academicYearId: number | null | undefined,
): string | null {
  const safe = safeFinanceCommandCenterActionPath(raw);
  if (!safe) return null;
  if (!academicYearId || academicYearId <= 0) return safe;
  const url = new URL(safe, 'https://raqeem.invalid');
  if (!url.searchParams.has('academic_year_id')) {
    url.searchParams.set('academic_year_id', String(academicYearId));
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function stringQueryValue(
  query: FinanceCommandCenterDrilldownTarget['query'],
  key: string,
): string | null {
  const value = query[key];
  if (value == null || value === '') return null;
  return String(value);
}

export function resolveFinanceCommandCenterDrilldownQuery(
  target: FinanceCommandCenterDrilldownTarget | null | undefined,
  academicYearId: number | null | undefined,
): ListParams | null {
  if (!target || target.endpoint !== FINANCE_COMMAND_CENTER_DRILLDOWN_API) return null;
  if (!academicYearId || academicYearId <= 0) return null;

  const metricKey = stringQueryValue(target.query, 'metric_key') as FinanceCommandCenterMetricKey | null;
  if (!metricKey || !DECISION_METRICS.has(metricKey)) return null;

  const targetYear = Number(stringQueryValue(target.query, 'academic_year_id'));
  if (!Number.isInteger(targetYear) || targetYear !== academicYearId) return null;

  const resolved: ListParams = {
    academic_year_id: academicYearId,
    metric_key: metricKey,
  };

  const agingBucket = stringQueryValue(target.query, 'aging_bucket') as FinanceCommandCenterAgingKey | null;
  if (metricKey === 'aging') {
    if (!agingBucket || !AGING_BUCKETS.has(agingBucket)) return null;
    resolved.aging_bucket = agingBucket;
  } else if (agingBucket) {
    return null;
  }

  const period = stringQueryValue(target.query, 'period');
  if (metricKey === 'collection_performance') {
    if (!period || !/^\d{4}-\d{2}$/.test(period)) return null;
    resolved.period = period;
  } else if (period) {
    return null;
  }

  for (const key of ['date_from', 'date_to'] as const) {
    const value = stringQueryValue(target.query, key);
    if (value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      resolved[key] = value;
    }
  }

  if (
    typeof resolved.date_from === 'string' &&
    typeof resolved.date_to === 'string' &&
    resolved.date_from > resolved.date_to
  ) {
    return null;
  }

  return resolved;
}
