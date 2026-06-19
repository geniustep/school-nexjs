import type { ApiErrorBody } from '@/types/api';
import type { StudentProfileFieldErrors } from './student-profile';

export interface StudentApiErrorContext {
  message: string;
  fieldErrors?: StudentProfileFieldErrors;
}

function msgIncludes(message: string, ...needles: string[]): boolean {
  const lower = message.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

function isMissingStudentIdentifierMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('code, matricule, or massar_code is required') ||
    (lower.includes('massar_code') && lower.includes('matricule') && lower.includes('required'))
  );
}

function isMissingAcademicYearForFinanceMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('academic.academic_year_id is required when finance block is provided') ||
    (lower.includes('academic_year_id') && lower.includes('finance'))
  );
}

function mapMissingAcademicYearForFinanceError(
  t: (key: string) => string,
): StudentApiErrorContext {
  const message = t('admin.student360.create.errors.academicYearRequiredForFinance');
  return {
    message,
    fieldErrors: {
      academicYearId: message,
    },
  };
}

function mapMissingStudentIdentifierError(
  t: (key: string) => string,
): StudentApiErrorContext {
  const message = t('admin.student360.create.errors.studentIdentifierRequired');
  return {
    message,
    fieldErrors: {
      massarCode: message,
      schoolNumber: message,
      code: message,
    },
  };
}

export function mapStudentApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): StudentApiErrorContext {
  const code = String(error.code ?? '');
  const message = error.message?.trim() ?? '';
  const fieldErrors: StudentProfileFieldErrors = {};

  switch (code) {
    case 'duplicate_massar_code':
      fieldErrors.massarCode = t('admin.student360.errors.duplicateMassar');
      return { message: t('admin.student360.errors.duplicateMassar'), fieldErrors };
    case 'duplicate_school_number':
    case 'duplicate_record':
    case 'conflict':
      if (msgIncludes(message, 'massar', 'مسار')) {
        fieldErrors.massarCode = t('admin.student360.errors.duplicateMassar');
        return { message: t('admin.student360.errors.duplicateMassar'), fieldErrors };
      }
      fieldErrors.schoolNumber = t('admin.student360.errors.duplicateSchoolNumber');
      return { message: t('admin.student360.errors.duplicateSchoolNumber'), fieldErrors };
    case 'invalid_birth_date':
      fieldErrors.dateOfBirth = t('admin.student360.errors.invalidBirthDate');
      return { message: t('admin.student360.errors.invalidBirthDate'), fieldErrors };
    case 'invalid_enrollment_date':
      fieldErrors.actualJoinDate = t('admin.student360.errors.invalidEnrollmentDate');
      return { message: t('admin.student360.errors.invalidEnrollmentDate'), fieldErrors };
    case 'invalid_email':
      fieldErrors.email = t('admin.student360.errors.invalidEmail');
      return { message: t('admin.student360.errors.invalidEmail'), fieldErrors };
    case 'invalid_student_status':
      return { message: t('admin.student360.errors.invalidStatus') };
    case 'class_school_mismatch':
    case 'class_year_mismatch':
      fieldErrors.classId = t('admin.student360.errors.classMismatch');
      return { message: t('admin.student360.errors.classMismatch'), fieldErrors };
    case 'permission_denied':
    case 'forbidden':
      return { message: t('admin.studentForbidden') };
    case 'not_found':
      return { message: t('errors.notFound') };
    case 'validation_error':
      if (isMissingStudentIdentifierMessage(message)) {
        return mapMissingStudentIdentifierError(t);
      }
      if (isMissingAcademicYearForFinanceMessage(message)) {
        return mapMissingAcademicYearForFinanceError(t);
      }
      if (msgIncludes(message, 'class', 'school', 'مؤسسة', 'قسم', 'scope', 'نطاق', 'outside')) {
        fieldErrors.classId = t('admin.studentClassForbidden');
        return { message: t('admin.studentClassForbidden'), fieldErrors };
      }
      if (msgIncludes(message, 'parent', 'ولي', 'أولياء', 'parent_ids')) {
        return { message: t('admin.studentInvalidParents') };
      }
      if (msgIncludes(message, 'email')) {
        fieldErrors.email = t('admin.student360.errors.invalidEmail');
        return { message: t('admin.student360.errors.invalidEmail'), fieldErrors };
      }
      if (message && !msgIncludes(message, '<', 'traceback', 'html')) {
        return { message };
      }
      return { message: t('admin.studentValidation') };
    default:
      if (isMissingStudentIdentifierMessage(message)) {
        return mapMissingStudentIdentifierError(t);
      }
      if (isMissingAcademicYearForFinanceMessage(message)) {
        return mapMissingAcademicYearForFinanceError(t);
      }
      if (message && !msgIncludes(message, '<', 'traceback', 'html')) {
        return { message };
      }
      return { message: t('errors.serverError') };
  }
}

/** @deprecated use mapStudentApiError — kept for list/import callers */
export function mapStudentApiErrorMessage(error: ApiErrorBody, t: (key: string) => string): string {
  return mapStudentApiError(error, t).message;
}
