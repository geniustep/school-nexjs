/** Map Odoo term-edit error codes to i18n keys under academicContext.errors.* */

const TERM_EDIT_ERROR_CODES = new Set([
  'term_not_found',
  'term_edit_not_allowed',
  'invalid_term_field',
  'invalid_term_name',
  'invalid_term_code',
  'term_dates_invalid',
  'term_dates_outside_academic_year',
  'term_dates_overlap',
  'term_code_conflict',
]);

export function academicTermEditErrorI18nKey(code: string | undefined | null): string {
  if (code && TERM_EDIT_ERROR_CODES.has(code)) {
    return `academicContext.errors.${code}`;
  }
  return 'academicContext.errors.term_edit_failed';
}

export function resolveAcademicTermEditErrorMessage(
  code: string | undefined | null,
  translate: (key: string) => string,
): string {
  return translate(academicTermEditErrorI18nKey(code));
}
