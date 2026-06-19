import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Student } from '@/types/student';

export const MIN_STUDENT_IDENTIFIER_CHECK_LENGTH = 4;

export type StudentIdentifierQueryField = 'massar_code' | 'school_number' | 'matricule' | 'code';

export type StudentIdentifierCheckStatus = 'idle' | 'checking' | 'available' | 'duplicate' | 'error';

export interface StudentIdentifierCheckResult {
  status: StudentIdentifierCheckStatus;
}

export interface StudentIdentifierFieldCheck {
  status: StudentIdentifierCheckStatus;
}

export interface StudentCreateIdentifierChecks {
  massarCode: StudentIdentifierFieldCheck;
  schoolNumber: StudentIdentifierFieldCheck;
  code: StudentIdentifierFieldCheck;
}

export const IDLE_IDENTIFIER_CHECK: StudentIdentifierFieldCheck = { status: 'idle' };

export const INITIAL_STUDENT_CREATE_IDENTIFIER_CHECKS: StudentCreateIdentifierChecks = {
  massarCode: IDLE_IDENTIFIER_CHECK,
  schoolNumber: IDLE_IDENTIFIER_CHECK,
  code: IDLE_IDENTIFIER_CHECK,
};

function isBlockingIdentifierStatus(status: StudentIdentifierCheckStatus): boolean {
  return status === 'checking' || status === 'duplicate' || status === 'error';
}

export function identifierFieldBlocksProgress(
  value: string,
  check: StudentIdentifierFieldCheck,
): boolean {
  if (!shouldCheckStudentIdentifier(value)) return false;
  return isBlockingIdentifierStatus(check.status) || check.status === 'idle';
}

export function studentCreateIdentifierChecksBlockProgress(input: {
  massarCode: string;
  schoolNumber: string;
  code: string;
  checks: StudentCreateIdentifierChecks;
}): boolean {
  return (
    identifierFieldBlocksProgress(input.massarCode, input.checks.massarCode) ||
    identifierFieldBlocksProgress(input.schoolNumber, input.checks.schoolNumber) ||
    identifierFieldBlocksProgress(input.code, input.checks.code)
  );
}

export function resolveStudentCreateIdentifierCheckErrors(
  checks: StudentCreateIdentifierChecks,
  t: (key: string) => string,
): Partial<Record<'massarCode' | 'schoolNumber' | 'code', string>> {
  const errors: Partial<Record<'massarCode' | 'schoolNumber' | 'code', string>> = {};
  if (checks.massarCode.status === 'duplicate') {
    errors.massarCode = t('admin.student360.errors.duplicateMassar');
  }
  if (checks.schoolNumber.status === 'duplicate') {
    errors.schoolNumber = t('admin.student360.errors.duplicateSchoolNumber');
  }
  if (checks.code.status === 'duplicate') {
    errors.code = t('admin.student360.errors.duplicateStudentCode');
  }
  return errors;
}

export type StudentCreateIdentifierDuplicateValidationResult =
  | { valid: true }
  | {
      valid: false;
      errors: Partial<Record<'massarCode' | 'schoolNumber' | 'code', string>>;
      toastMessage: string;
      focusIdentity?: boolean;
      openAdditional?: boolean;
    };

export function validateStudentCreateIdentifierDuplicateChecks(input: {
  checks: StudentCreateIdentifierChecks;
  massarCode: string;
  schoolNumber: string;
  code: string;
  t: (key: string) => string;
  current: 'identity' | 'billing' | 'enrollment' | 'finance' | 'review';
}): StudentCreateIdentifierDuplicateValidationResult {
  const checkErrors = resolveStudentCreateIdentifierCheckErrors(input.checks, input.t);
  const { checks } = input;

  if (checks.massarCode.status === 'checking') {
    const message = input.t('admin.student360.create.errors.checkingMassar');
    return {
      valid: false,
      errors: { ...checkErrors, massarCode: message },
      toastMessage: message,
      focusIdentity: input.current !== 'identity',
    };
  }
  if (checks.massarCode.status === 'error' && shouldCheckStudentIdentifier(input.massarCode)) {
    const message = input.t('admin.student360.create.errors.identifierCheckFailed');
    return {
      valid: false,
      errors: { massarCode: message },
      toastMessage: message,
      focusIdentity: input.current !== 'identity',
    };
  }
  if (checks.massarCode.status === 'duplicate') {
    const message = checkErrors.massarCode ?? input.t('admin.student360.errors.duplicateMassar');
    return {
      valid: false,
      errors: checkErrors,
      toastMessage: message,
      focusIdentity: input.current !== 'identity',
    };
  }
  if (
    shouldCheckStudentIdentifier(input.massarCode) &&
    checks.massarCode.status !== 'available'
  ) {
    const message = input.t('admin.student360.create.errors.checkingMassar');
    return {
      valid: false,
      errors: { massarCode: message },
      toastMessage: message,
      focusIdentity: input.current !== 'identity',
    };
  }

  if (checks.schoolNumber.status === 'duplicate') {
    const message =
      checkErrors.schoolNumber ?? input.t('admin.student360.errors.duplicateSchoolNumber');
    return {
      valid: false,
      errors: checkErrors,
      toastMessage: message,
      openAdditional: input.current === 'identity',
    };
  }
  if (checks.code.status === 'duplicate') {
    const message = checkErrors.code ?? input.t('admin.student360.errors.duplicateStudentCode');
    return {
      valid: false,
      errors: checkErrors,
      toastMessage: message,
      openAdditional: input.current === 'identity',
    };
  }

  if (
    (checks.schoolNumber.status === 'checking' &&
      shouldCheckStudentIdentifier(input.schoolNumber)) ||
    (checks.code.status === 'checking' && shouldCheckStudentIdentifier(input.code))
  ) {
    const message = input.t('admin.student360.create.errors.identifierCheckFailed');
    return { valid: false, errors: {}, toastMessage: message };
  }

  if (
    (shouldCheckStudentIdentifier(input.schoolNumber) &&
      checks.schoolNumber.status !== 'available') ||
    (shouldCheckStudentIdentifier(input.code) && checks.code.status !== 'available')
  ) {
    const message = input.t('admin.student360.create.errors.identifierCheckFailed');
    return { valid: false, errors: {}, toastMessage: message };
  }

  return { valid: true };
}

export function shouldCheckStudentIdentifier(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= MIN_STUDENT_IDENTIFIER_CHECK_LENGTH && !/\s/.test(trimmed);
}

function studentFieldValues(student: Student, field: StudentIdentifierQueryField): string[] {
  if (field === 'massar_code') {
    return [student.massar_code ?? ''];
  }
  if (field === 'code') {
    return [student.code ?? ''];
  }
  return [student.school_number ?? '', student.matricule ?? ''];
}

export function studentListHasExactIdentifierMatch(
  students: Student[] | null | undefined,
  field: StudentIdentifierQueryField,
  value: string,
): boolean {
  const needle = value.trim();
  if (!needle) return false;
  return (students ?? []).some((student) =>
    studentFieldValues(student, field).some((candidate) => candidate.trim() === needle),
  );
}

export async function checkStudentIdentifierDuplicate(
  field: StudentIdentifierQueryField,
  value: string,
  schoolId: number | null | undefined,
): Promise<StudentIdentifierCheckResult> {
  const trimmed = value.trim();
  if (!shouldCheckStudentIdentifier(trimmed)) {
    return { status: 'idle' };
  }

  const queryBase = {
    page: 1,
    page_size: 10,
    active_school_id: schoolId ?? undefined,
  };

  const res = await api.get<Student[]>(endpoints.admin.students, {
    ...queryBase,
    [field]: trimmed,
  });

  if (!res.success) {
    return { status: 'error' };
  }

  const primaryList = Array.isArray(res.data) ? res.data : [];
  if (studentListHasExactIdentifierMatch(primaryList, field, trimmed)) {
    return { status: 'duplicate' };
  }

  // massar_code filter may return unrelated rows; search is exact for known duplicates.
  const searchRes = await api.get<Student[]>(endpoints.admin.students, {
    ...queryBase,
    search: trimmed,
  });

  if (!searchRes.success) {
    return { status: 'error' };
  }

  const searchList = Array.isArray(searchRes.data) ? searchRes.data : [];
  if (studentListHasExactIdentifierMatch(searchList, field, trimmed)) {
    return { status: 'duplicate' };
  }

  return { status: 'available' };
}
