import { describe, expect, it } from 'vitest';
import {
  MIN_STUDENT_IDENTIFIER_CHECK_LENGTH,
  shouldCheckStudentIdentifier,
  studentListHasExactIdentifierMatch,
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
