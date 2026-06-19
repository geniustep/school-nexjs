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

function isMissingClassForFinanceMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('academic.class_id is required when finance block is provided') ||
    (lower.includes('class_id') && lower.includes('finance'))
  );
}

function mapMissingClassForFinanceError(t: (key: string) => string): StudentApiErrorContext {
  const message = t('admin.student360.create.errors.classRequiredForFinanceSave');
  return {
    message,
    fieldErrors: {
      classId: message,
    },
  };
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

function isDuplicateMassarMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('duplicate_massar') ||
    lower.includes('duplicate massar') ||
    (lower.includes('massar_code') && (lower.includes('already exists') || lower.includes('duplicate'))) ||
    (lower.includes('massar') && lower.includes('already exists'))
  );
}

function isDuplicateSchoolNumberMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('duplicate_school_number') ||
    lower.includes('duplicate school number') ||
    (lower.includes('school_number') && lower.includes('already exists')) ||
    (lower.includes('matricule') && lower.includes('already exists'))
  );
}

function isDuplicateStudentCodeMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('duplicate') && lower.includes('code') && !lower.includes('massar');
}

function mapDuplicateMassarError(t: (key: string) => string): StudentApiErrorContext {
  const message = t('admin.student360.errors.duplicateMassar');
  return { message, fieldErrors: { massarCode: message } };
}

function mapDuplicateSchoolNumberError(t: (key: string) => string): StudentApiErrorContext {
  const message = t('admin.student360.errors.duplicateSchoolNumber');
  return { message, fieldErrors: { schoolNumber: message } };
}

function mapDuplicateStudentCodeError(t: (key: string) => string): StudentApiErrorContext {
  const message = t('admin.student360.errors.duplicateStudentCode');
  return { message, fieldErrors: { code: message } };
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

function mapDuplicateIdentifierMessages(
  message: string,
  t: (key: string) => string,
): StudentApiErrorContext | null {
  if (isDuplicateMassarMessage(message)) return mapDuplicateMassarError(t);
  if (isDuplicateSchoolNumberMessage(message)) return mapDuplicateSchoolNumberError(t);
  if (isDuplicateStudentCodeMessage(message)) return mapDuplicateStudentCodeError(t);
  return null;
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
      if (isMissingClassForFinanceMessage(message)) {
        return mapMissingClassForFinanceError(t);
      }
      {
        const duplicate = mapDuplicateIdentifierMessages(message, t);
        if (duplicate) return duplicate;
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
      if (isMissingClassForFinanceMessage(message)) {
        return mapMissingClassForFinanceError(t);
      }
      {
        const duplicate = mapDuplicateIdentifierMessages(message, t);
        if (duplicate) return duplicate;
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
