import type { StudentCreatePayload } from '@/types/student-360';
import { buildFullNamePreview, todayIsoDate } from './student-profile';

export type StudentQuickCreateInput = {
  firstName: string;
  lastName: string;
  firstNameLatin: string;
  lastNameLatin: string;
  cycleId: string;
  levelId: string;
  schoolId: number | null;
  academicYearId: number | null;
};

export type StudentQuickCreateValidation =
  | { valid: true; firstName: string; lastName: string; firstNameLatin: string; lastNameLatin: string; levelId: number; schoolId: number; academicYearId: number }
  | { valid: false; error: 'name_ar' | 'name_latin' | 'cycle' | 'level' | 'context' };

export function validateStudentQuickCreateInput(input: StudentQuickCreateInput): StudentQuickCreateValidation {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const firstNameLatin = input.firstNameLatin.trim();
  const lastNameLatin = input.lastNameLatin.trim();
  if (!firstName || !lastName) return { valid: false, error: 'name_ar' };
  if (!firstNameLatin || !lastNameLatin) return { valid: false, error: 'name_latin' };
  if (!input.cycleId.trim()) return { valid: false, error: 'cycle' };

  const levelId = Number(input.levelId);
  if (!Number.isFinite(levelId) || levelId <= 0) return { valid: false, error: 'level' };
  if (input.schoolId == null || input.schoolId <= 0 || input.academicYearId == null || input.academicYearId <= 0) {
    return { valid: false, error: 'context' };
  }

  return { valid: true, firstName, lastName, firstNameLatin, lastNameLatin, levelId, schoolId: input.schoolId, academicYearId: input.academicYearId };
}

/** Smallest supported POST /admin/students payload with a level but no class assignment. */
export function buildStudentQuickCreatePayload(
  input: Extract<StudentQuickCreateValidation, { valid: true }>,
  enrollmentDate = todayIsoDate(),
): StudentCreatePayload {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    name_ar: buildFullNamePreview(input.firstName, input.lastName),
    name_latin: buildFullNamePreview(input.firstNameLatin, input.lastNameLatin),
    status: 'active',
    active: true,
    admission_date: enrollmentDate,
    enrollment: { actual_join_date: enrollmentDate },
    academic: {
      school_id: input.schoolId,
      academic_year_id: input.academicYearId,
      level_id: input.levelId,
      enrollment_date: enrollmentDate,
    },
  };
}
