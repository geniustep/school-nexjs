import type { StudentDetailsData } from '@/types/student-360';

export function resolveFinanceYearId(
  details: StudentDetailsData,
  years: { id: number; is_current?: boolean }[],
  selectedYearId: string,
  workspaceYearId?: number,
): string {
  if (selectedYearId) return selectedYearId;
  if (!years.length) return '';
  if (workspaceYearId) return String(workspaceYearId);
  const enrollYear = details.current_enrollment?.academic_year;
  if (enrollYear && typeof enrollYear === 'object') return String(enrollYear.id);
  const current = years.find((y) => y.is_current);
  if (current) return String(current.id);
  return String(years[0].id);
}
