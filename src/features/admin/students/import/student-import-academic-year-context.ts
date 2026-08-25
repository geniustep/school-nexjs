import type { StudentImportValidationResult } from './student-import-types';

type IssueTranslator = (code: string, field?: string) => string;

export function studentImportAcademicYearContextMatches(
  validation: StudentImportValidationResult | null,
  activeAcademicYearId: number | null,
): boolean {
  if (!validation || activeAcademicYearId == null) return false;

  if (
    validation.format === 'odoo_v1' &&
    validation.meta?.academicYearId !== activeAcademicYearId
  ) {
    return false;
  }

  return validation.rows.every(
    (row) => row.normalized.academic_year_id === activeAcademicYearId,
  );
}

export function applyStudentImportAcademicYearContext(
  validation: StudentImportValidationResult,
  activeAcademicYearId: number | null,
  t: IssueTranslator,
): StudentImportValidationResult {
  const fileErrors = [...validation.fileErrors];

  if (activeAcademicYearId == null) {
    fileErrors.push({
      code: 'academic_year_context_required',
      field: 'academic_year_id',
      message: t('missing_required_field', 'academic_year_id'),
      severity: 'error',
    });
  } else if (!studentImportAcademicYearContextMatches(validation, activeAcademicYearId)) {
    fileErrors.push({
      code: 'academic_year_context_mismatch',
      field: 'academic_year_id',
      message: t('class_year_mismatch', 'academic_year_id'),
      severity: 'error',
    });
  }

  return {
    ...validation,
    fileErrors,
    readyForImport:
      validation.readyForImport && !fileErrors.some((item) => item.severity === 'error'),
  };
}
