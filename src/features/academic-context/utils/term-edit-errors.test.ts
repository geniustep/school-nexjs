import { describe, expect, it } from 'vitest';
import {
  academicTermEditErrorI18nKey,
  resolveAcademicTermEditErrorMessage,
} from '@/features/academic-context/utils/term-edit-errors';

describe('term edit error mapping', () => {
  it.each([
    ['term_not_found', 'academicContext.errors.term_not_found'],
    ['term_edit_not_allowed', 'academicContext.errors.term_edit_not_allowed'],
    ['invalid_term_field', 'academicContext.errors.invalid_term_field'],
    ['invalid_term_name', 'academicContext.errors.invalid_term_name'],
    ['invalid_term_code', 'academicContext.errors.invalid_term_code'],
    ['term_dates_invalid', 'academicContext.errors.term_dates_invalid'],
    ['term_dates_outside_academic_year', 'academicContext.errors.term_dates_outside_academic_year'],
    ['term_dates_overlap', 'academicContext.errors.term_dates_overlap'],
    ['term_code_conflict', 'academicContext.errors.term_code_conflict'],
  ] as const)('maps %s', (code, key) => {
    expect(academicTermEditErrorI18nKey(code)).toBe(key);
  });

  it('falls back for unknown codes', () => {
    expect(academicTermEditErrorI18nKey('weird_code')).toBe(
      'academicContext.errors.term_edit_failed',
    );
    const translate = (key: string) => key;
    expect(resolveAcademicTermEditErrorMessage('weird_code', translate)).toBe(
      'academicContext.errors.term_edit_failed',
    );
  });
});
