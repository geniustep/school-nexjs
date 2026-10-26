/** Annual fee stock for active enrolled students; not collections or monthly obligations. */
export interface FinanceSchoolYearEnrollmentEconomics {
  current_students_count: number;
  registration_net: number;
  tuition_net: number;
  combined_net: number;
  average_per_current_student: number | null;
  currency: string;
  academic_year_id: number;
  as_of_date: string;
  student_basis: string;
  fee_basis: string;
  semantics: Record<string, unknown>;
}
export function parseSchoolYearEnrollmentEconomics(
  value: unknown,
  expectedAcademicYearId: number | null | undefined,
): FinanceSchoolYearEnrollmentEconomics | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!expectedAcademicYearId || !Number.isInteger(expectedAcademicYearId)) return null;
  const v = value as Record<string, unknown>;
  if (v.academic_year_id !== expectedAcademicYearId) return null;
  if (typeof v.current_students_count !== 'number' ||
      !Number.isSafeInteger(v.current_students_count) || v.current_students_count < 0) return null;
  for (const field of ['registration_net', 'tuition_net', 'combined_net'] as const) {
    if (typeof v[field] !== 'number' || !Number.isFinite(v[field])) return null;
  }
  if (v.average_per_current_student !== null &&
      (typeof v.average_per_current_student !== 'number' ||
       !Number.isFinite(v.average_per_current_student))) return null;
  if (v.current_students_count === 0 && v.average_per_current_student !== null) return null;
  if (typeof v.currency !== 'string' || !/^[A-Z]{3}$/.test(v.currency)) return null;
  if (typeof v.as_of_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.as_of_date)) return null;
  if (typeof v.student_basis !== 'string' || typeof v.fee_basis !== 'string') return null;
  if (!v.semantics || typeof v.semantics !== 'object' || Array.isArray(v.semantics)) return null;
  return v as unknown as FinanceSchoolYearEnrollmentEconomics;
}
