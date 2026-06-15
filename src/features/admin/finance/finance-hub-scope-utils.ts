import type { AcademicYearOption } from '@/lib/utils/academic-years';

export type SummaryScopeMode = 'all' | 'year' | 'neutral';

export function resolveValidYearId(
  yearId: string,
  yearOptions: Array<Pick<AcademicYearOption, 'id'>>,
): string {
  if (!yearId) return '';
  return yearOptions.some((year) => String(year.id) === yearId) ? yearId : '';
}

export function resolveSummaryScopeMode(
  yearId: string,
  yearOptions: Array<Pick<AcademicYearOption, 'id'>>,
  loading?: boolean,
): SummaryScopeMode {
  if (loading) return 'neutral';
  if (!yearOptions.length) return 'neutral';
  if (!yearId) return 'all';
  return yearOptions.some((year) => String(year.id) === yearId) ? 'year' : 'all';
}

export function findSelectedYear(
  yearId: string,
  yearOptions: AcademicYearOption[],
): AcademicYearOption | null {
  if (!yearId) return null;
  return yearOptions.find((year) => String(year.id) === yearId) ?? null;
}

/** Overview query — omit academic_year_id when all years are selected. */
export function buildOverviewQueryParams(
  yearId: string,
  yearOptions: Array<Pick<AcademicYearOption, 'id'>>,
): { academic_year_id?: number } {
  const validYearId = resolveValidYearId(yearId, yearOptions);
  if (!validYearId) return {};
  const parsed = Number(validYearId);
  if (!Number.isFinite(parsed) || parsed <= 0) return {};
  return { academic_year_id: parsed };
}
