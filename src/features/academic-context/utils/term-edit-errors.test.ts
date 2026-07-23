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

  it('prefers safe error.message from the standard 422 envelope', () => {
    const translate = (key: string) => `i18n:${key}`;
    expect(
      resolveAcademicTermEditErrorMessage(
        {
          code: 'term_dates_outside_academic_year',
          message: 'تواريخ الدورة يجب أن تكون ضمن حدود السنة الدراسية.',
          details: {},
        },
        translate,
      ),
    ).toBe('تواريخ الدورة يجب أن تكون ضمن حدود السنة الدراسية.');
  });

  it('uses detail text when message is missing', () => {
    const translate = (key: string) => `i18n:${key}`;
    expect(
      resolveAcademicTermEditErrorMessage(
        {
          code: 'term_dates_overlap',
          message: '',
          detail: 'تتداخل تواريخ هذه الدورة مع دورة أخرى.',
        },
        translate,
      ),
    ).toBe('تتداخل تواريخ هذه الدورة مع دورة أخرى.');
  });

  it('falls back to known-code i18n when no safe server text exists', () => {
    const translate = (key: string) => `i18n:${key}`;
    expect(
      resolveAcademicTermEditErrorMessage(
        {
          code: 'term_dates_outside_academic_year',
          message: '',
          details: {},
        },
        translate,
      ),
    ).toBe('i18n:academicContext.errors.term_dates_outside_academic_year');
  });

  it('falls back to generic failure when code is unknown and message unsafe', () => {
    const translate = (key: string) => `i18n:${key}`;
    expect(
      resolveAcademicTermEditErrorMessage(
        {
          code: 'weird_code',
          message: 'Odoo traceback /api/endpoint failed',
        },
        translate,
      ),
    ).toBe('i18n:academicContext.errors.term_edit_failed');
  });

  it('falls back for unknown codes without a message', () => {
    expect(academicTermEditErrorI18nKey('weird_code')).toBe(
      'academicContext.errors.term_edit_failed',
    );
    const translate = (key: string) => key;
    expect(resolveAcademicTermEditErrorMessage({ code: 'weird_code' }, translate)).toBe(
      'academicContext.errors.term_edit_failed',
    );
  });
});
