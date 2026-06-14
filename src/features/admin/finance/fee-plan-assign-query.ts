import type { ListParams } from '@/types/api';

/** Query params for confirmed fee plans scoped to an academic year. */
export function buildConfirmedFeePlansQuery(
  academicYearId?: string | number | null,
): ListParams | null {
  if (academicYearId == null || academicYearId === '') return null;
  const yearId = Number(academicYearId);
  if (!Number.isFinite(yearId) || yearId <= 0) return null;
  return {
    page: 1,
    page_size: 100,
    state: 'confirmed',
    academic_year_id: yearId,
  };
}
