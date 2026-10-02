import type { ListParams } from '@/types/api';

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
  if (!raw || !raw.startsWith('/admin/finance')) return null;
  if (raw.startsWith('//') || raw.includes('\\')) return null;
  try {
    const url = new URL(raw, 'https://raqeem.invalid');
    if (url.origin !== 'https://raqeem.invalid') return null;
    if (!url.pathname.startsWith('/admin/finance')) return null;
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
