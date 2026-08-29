import type { StudentCreatePayload } from '@/types/student-360';
import { buildFullNamePreview, todayIsoDate } from './student-profile';

export type StudentQuickCreateInput = {
  firstName: string;
  lastName: string;
  firstNameLatin: string;
  lastNameLatin: string;
  gender: string;
  cycleId: string;
  levelId: string;
  schoolId: number | null;
  academicYearId: number | null;
};

export type StudentQuickCreateValidation =
  | {
      valid: true;
      firstName: string;
      lastName: string;
      firstNameLatin: string;
      lastNameLatin: string;
      gender: string;
      levelId: number;
      schoolId: number;
      academicYearId: number;
    }
  | { valid: false; error: 'name_ar' | 'name_latin' | 'gender' | 'cycle' | 'level' | 'context' };

export type StudentQuickRegistrationPayload = StudentCreatePayload & {
  quick_registration: {
    enabled: true;
  };
};

export function validateStudentQuickCreateInput(input: StudentQuickCreateInput): StudentQuickCreateValidation {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const firstNameLatin = input.firstNameLatin.trim();
  const lastNameLatin = input.lastNameLatin.trim();
  const gender = input.gender.trim();

  const hasArabicName = Boolean(firstName && lastName);
  const hasLatinName = Boolean(firstNameLatin && lastNameLatin);
  const hasPartialArabicName = Boolean(firstName || lastName) && !hasArabicName;
  const hasPartialLatinName = Boolean(firstNameLatin || lastNameLatin) && !hasLatinName;

  if (hasPartialArabicName || (!hasArabicName && !hasLatinName)) {
    return { valid: false, error: 'name_ar' };
  }
  if (hasPartialLatinName) return { valid: false, error: 'name_latin' };
  if (!gender) return { valid: false, error: 'gender' };
  if (!input.cycleId.trim()) return { valid: false, error: 'cycle' };

  const levelId = Number(input.levelId);
  if (!Number.isFinite(levelId) || levelId <= 0) return { valid: false, error: 'level' };
  if (input.schoolId == null || input.schoolId <= 0 || input.academicYearId == null || input.academicYearId <= 0) {
    return { valid: false, error: 'context' };
  }

  const canonicalFirstName = hasArabicName ? firstName : firstNameLatin;
  const canonicalLastName = hasArabicName ? lastName : lastNameLatin;

  return {
    valid: true,
    firstName: canonicalFirstName,
    lastName: canonicalLastName,
    firstNameLatin,
    lastNameLatin,
    gender,
    levelId,
    schoolId: input.schoolId,
    academicYearId: input.academicYearId,
  };
}

export function buildStudentQuickCreateSuccessHref(studentId: number): string {
  if (!Number.isInteger(studentId) || studentId <= 0) return '/admin/students';
  return `/admin/students/${studentId}?postSetup=1`;
}

/** Smallest supported quick-registration payload: Student + Enrollment core, no class in request. */
export function buildStudentQuickCreatePayload(
  input: Extract<StudentQuickCreateValidation, { valid: true }>,
  enrollmentDate = todayIsoDate(),
): StudentQuickRegistrationPayload {
  const hasArabicName = Boolean(input.firstName && input.lastName && !input.firstNameLatin && !input.lastNameLatin)
    ? true
    : /[\u0600-\u06FF]/.test(`${input.firstName} ${input.lastName}`);
  const nameAr = hasArabicName ? buildFullNamePreview(input.firstName, input.lastName) : undefined;
  const nameLatin = input.firstNameLatin && input.lastNameLatin
    ? buildFullNamePreview(input.firstNameLatin, input.lastNameLatin)
    : undefined;

  return {
    first_name: input.firstName,
    last_name: input.lastName,
    ...(nameAr ? { name_ar: nameAr } : {}),
    ...(nameLatin ? { name_latin: nameLatin } : {}),
    gender: input.gender,
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
    quick_registration: { enabled: true },
  };
}
