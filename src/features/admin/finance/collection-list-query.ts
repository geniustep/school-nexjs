import type { ListParams } from '@/types/api';

/**
 * Odoo list filter: `student_id` alone returns zero rows (school DB, 2026-06).
 * Backend accepts `student` but may return a broad set — keep `student_id` for forward compatibility.
 */
export function buildPaymentCollectionsListQuery(params: ListParams): ListParams {
  const studentId = params.student_id ?? params.studentId;
  if (!studentId) return params;
  const id = String(studentId);
  return {
    ...params,
    student_id: id,
    student: id,
  };
}

/** Guard rows when API returns a broad list for `student` filter. */
export function filterCollectionsForStudent<T extends { student_id?: number }>(
  rows: T[],
  studentId: string | number | undefined,
): T[] {
  if (!studentId) return rows;
  const wanted = Number(studentId);
  if (!Number.isFinite(wanted)) return rows;
  const scoped = rows.filter((row) => row.student_id === wanted);
  return scoped.length ? scoped : rows;
}
