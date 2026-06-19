import { describe, expect, it } from 'vitest';
import { mapStudentApiError } from './student-api-errors';

const t = (key: string) => {
  if (key === 'admin.student360.create.errors.studentIdentifierRequired') {
    return 'يجب إدخال رقم مسار أو رقم التسجيل أو رمز داخلي للتلميذ.';
  }
  return key;
};

describe('mapStudentApiError', () => {
  it('translates missing student identifier backend message', () => {
    const mapped = mapStudentApiError(
      {
        code: 'validation_error',
        message: 'code, matricule, or massar_code is required',
      },
      t,
    );
    expect(mapped.message).toBe('يجب إدخال رقم مسار أو رقم التسجيل أو رمز داخلي للتلميذ.');
    expect(mapped.fieldErrors?.massarCode).toBe(mapped.message);
    expect(mapped.fieldErrors?.schoolNumber).toBe(mapped.message);
    expect(mapped.fieldErrors?.code).toBe(mapped.message);
  });

  it('does not expose raw English identifier message to the user', () => {
    const mapped = mapStudentApiError(
      {
        code: 'unknown',
        message: 'code, matricule, or massar_code is required',
      },
      t,
    );
    expect(mapped.message).not.toContain('massar_code');
    expect(mapped.message).not.toContain('matricule');
  });

  it('translates missing academic year for finance backend message', () => {
    const mapped = mapStudentApiError(
      {
        code: 'validation_error',
        message: 'academic.academic_year_id is required when finance block is provided',
      },
      (key) =>
        key === 'admin.student360.create.errors.academicYearRequiredForFinance'
          ? 'يجب اختيار السنة الدراسية قبل حفظ الخطة المالية.'
          : key,
    );
    expect(mapped.message).toBe('يجب اختيار السنة الدراسية قبل حفظ الخطة المالية.');
    expect(mapped.message).not.toContain('academic_year_id');
    expect(mapped.fieldErrors?.academicYearId).toBe(mapped.message);
  });

  it('translates missing class for finance backend message', () => {
    const mapped = mapStudentApiError(
      {
        code: 'validation_error',
        message: 'academic.class_id is required when finance block is provided',
      },
      (key) =>
        key === 'admin.student360.create.errors.classRequiredForFinanceSave'
          ? 'يجب اختيار القسم قبل حفظ الخطة المالية.'
          : key,
    );
    expect(mapped.message).toBe('يجب اختيار القسم قبل حفظ الخطة المالية.');
    expect(mapped.message).not.toContain('class_id');
    expect(mapped.fieldErrors?.classId).toBe(mapped.message);
  });

  it('translates duplicate massar backend messages', () => {
    const t = (key: string) =>
      key === 'admin.student360.errors.duplicateMassar'
        ? 'رقم مسار مستعمل من قبل تلميذ آخر.'
        : key;
    for (const message of [
      'massar_code already exists',
      'duplicate massar_code',
      'student with this massar_code already exists',
    ]) {
      const mapped = mapStudentApiError({ code: 'validation_error', message }, t);
      expect(mapped.message).toBe('رقم مسار مستعمل من قبل تلميذ آخر.');
      expect(mapped.fieldErrors?.massarCode).toBe(mapped.message);
      expect(mapped.message).not.toContain('massar_code');
    }
  });
});
