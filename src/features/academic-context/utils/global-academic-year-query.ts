import type { ListParams } from '@/types/api';

/**
 * Merge the explicit global Academic Year into an operational list query.
 *
 * The global selector is authoritative for opted-in operational reads. Any
 * stale/page-local academic_year_id is deliberately overridden here.
 */
export function buildGlobalAcademicYearQuery(
  query: ListParams | undefined,
  activeAcademicYearId: number | null,
): ListParams | undefined {
  if (activeAcademicYearId == null) return query;
  return {
    ...query,
    academic_year_id: activeAcademicYearId,
  };
}
