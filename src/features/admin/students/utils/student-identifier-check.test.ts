import { describe, expect, it } from 'vitest';
import {
  MIN_STUDENT_IDENTIFIER_CHECK_LENGTH,
  INITIAL_STUDENT_CREATE_IDENTIFIER_CHECKS,
  identifierFieldBlocksProgress,
  shouldCheckStudentIdentifier,
  studentCreateIdentifierChecksBlockProgress,
  studentListHasExactIdentifierMatch,
  validateStudentCreateIdentifierDuplicateChecks,
} from './student-identifier-check';
import type { Student } from '@/types/student';

describe('shouldCheckStudentIdentifier', () => {
  it('requires a minimum length and rejects spaces', () => {
    expect(MIN_STUDENT_IDENTIFIER_CHECK_LENGTH).toBeGreaterThan(0);
    expect(shouldCheckStudentIdentifier('123')).toBe(false);
    expect(shouldCheckStudentIdentifier('1234')).toBe(true);
    expect(shouldCheckStudentIdentifier('12 34')).toBe(false);
  });
});

describe('studentListHasExactIdentifierMatch', () => {
  const students: Student[] = [
    {
      id: 703,
      code: 'LIVE_EXT_1781393530',
      school_number: 'LIVE_EXT_1781393530',
      massar_code: 'MASSAR_1781393530',
      matricule: 'LIVE_EXT_1781393530',
      level: null,
      class: null,
      status: 'active',
      gender: null,
      date_of_birth: null,
      admission_date: null,
      email: null,
      phone: null,
      first_name: 'A',
      last_name: 'B',
    },
  ];

  it('matches massar_code exactly', () => {
    expect(studentListHasExactIdentifierMatch(students, 'massar_code', 'MASSAR_1781393530')).toBe(true);
    expect(studentListHasExactIdentifierMatch(students, 'massar_code', 'MASSAR_999')).toBe(false);
  });

  it('matches school_number or matricule', () => {
    expect(studentListHasExactIdentifierMatch(students, 'school_number', 'LIVE_EXT_1781393530')).toBe(true);
    expect(studentListHasExactIdentifierMatch(students, 'matricule', 'LIVE_EXT_1781393530')).toBe(true);
  });

  it('matches internal code', () => {
    expect(studentListHasExactIdentifierMatch(students, 'code', 'LIVE_EXT_1781393530')).toBe(true);
  });
});

describe('identifierFieldBlocksProgress', () => {
  it('blocks idle and duplicate for checkable values', () => {
    expect(identifierFieldBlocksProgress('1234', { status: 'idle' })).toBe(true);
    expect(identifierFieldBlocksProgress('1234', { status: 'duplicate' })).toBe(true);
    expect(identifierFieldBlocksProgress('1234', { status: 'available' })).toBe(false);
    expect(identifierFieldBlocksProgress('12', { status: 'idle' })).toBe(false);
  });
});

describe('validateStudentCreateIdentifierDuplicateChecks', () => {
  const t = (key: string) => key;

  it('rejects duplicate massar using fresh checks snapshot', () => {
    const result = validateStudentCreateIdentifierDuplicateChecks({
      checks: {
        ...INITIAL_STUDENT_CREATE_IDENTIFIER_CHECKS,
        massarCode: { status: 'duplicate' },
      },
      massarCode: 'E258532',
      schoolNumber: '',
      code: '',
      t,
      current: 'identity',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.massarCode).toBe('admin.student360.errors.duplicateMassar');
    }
  });

  it('rejects checkable massar that is still idle', () => {
    const result = validateStudentCreateIdentifierDuplicateChecks({
      checks: INITIAL_STUDENT_CREATE_IDENTIFIER_CHECKS,
      massarCode: 'E258532',
      schoolNumber: '',
      code: '',
      t,
      current: 'identity',
    });
    expect(result.valid).toBe(false);
  });

  it('allows available massar', () => {
    const result = validateStudentCreateIdentifierDuplicateChecks({
      checks: {
        ...INITIAL_STUDENT_CREATE_IDENTIFIER_CHECKS,
        massarCode: { status: 'available' },
      },
      massarCode: 'E258532',
      schoolNumber: '',
      code: '',
      t,
      current: 'identity',
    });
    expect(result.valid).toBe(true);
  });
});

describe('studentCreateIdentifierChecksBlockProgress', () => {
  it('blocks when any checkable field is not available', () => {
    expect(
      studentCreateIdentifierChecksBlockProgress({
        massarCode: '12345',
        schoolNumber: '',
        code: '',
        checks: {
          ...INITIAL_STUDENT_CREATE_IDENTIFIER_CHECKS,
          massarCode: { status: 'idle' },
        },
      }),
    ).toBe(true);
  });
});
