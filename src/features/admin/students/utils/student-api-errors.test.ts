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
});
