export type FinanceHubPeriodPreset =
  | 'this_month'
  | 'last_30_days'
  | 'this_term'
  | 'academic_year'
  | 'custom';

export type FinanceHubFilterState = {
  period: FinanceHubPeriodPreset;
  yearId: string;
  dateFrom: string;
  dateTo: string;
};

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Resolve dashboard period presets into API date filters. */
export function resolveFinanceHubPeriod(
  state: FinanceHubFilterState,
  asOf: Date = new Date(),
): { dateFrom?: string; dateTo?: string; academicYearId?: number } {
  const today = isoDate(asOf);

  switch (state.period) {
    case 'this_month':
      return { dateFrom: isoDate(startOfMonth(asOf)), dateTo: today };
    case 'last_30_days':
      return { dateFrom: isoDate(addDays(asOf, -30)), dateTo: today };
    case 'this_term':
      return { dateFrom: isoDate(startOfQuarter(asOf)), dateTo: today };
    case 'academic_year':
      return {
        academicYearId: state.yearId ? Number(state.yearId) : undefined,
      };
    case 'custom':
      return {
        dateFrom: state.dateFrom || undefined,
        dateTo: state.dateTo || undefined,
        academicYearId: state.yearId ? Number(state.yearId) : undefined,
      };
    default:
      return {};
  }
}

export function periodSpanDays(dateFrom?: string, dateTo?: string): number | null {
  if (!dateFrom || !dateTo) return null;
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : null;
}

/** Daily buckets for short ranges; weekly for medium; monthly for long. */
export function collectionTrendBucketMode(spanDays: number | null): 'day' | 'week' | 'month' {
  if (spanDays == null || spanDays <= 45) return 'day';
  if (spanDays <= 180) return 'week';
  return 'month';
}

export function bucketCollectionDate(
  iso: string,
  mode: 'day' | 'week' | 'month',
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  if (mode === 'day') return isoDate(date);
  if (mode === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, mondayOffset);
  return isoDate(monday);
}
