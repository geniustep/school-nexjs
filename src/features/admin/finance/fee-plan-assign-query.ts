import type { ListParams } from '@/types/api';

/** Query params for confirmed fee plans scoped to an academic year (and optional level). */
export function buildConfirmedFeePlansQuery(
  academicYearId?: string | number | null,
  levelId?: number | null,
): ListParams | null {
  if (academicYearId == null || academicYearId === '') return null;
  const yearId = Number(academicYearId);
  if (!Number.isFinite(yearId) || yearId <= 0) return null;

  const query: ListParams = {
    page: 1,
    page_size: 100,
    state: 'confirmed',
    academic_year_id: yearId,
    include_lines: 1,
  };

  if (levelId != null && Number.isFinite(levelId) && levelId > 0) {
    query.level_id = levelId;
  }

  return query;
}
