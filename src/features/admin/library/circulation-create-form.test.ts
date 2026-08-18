import { describe, expect, it } from 'vitest';
import type { Student } from '@/types/student';
import { libraryStudentLabel } from './circulation-create-form';

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: 7,
    full_name: 'محمد الحموي',
    school_number: 'HQAS3_1958379',
    ...overrides,
  } as Student;
}

describe('library circulation student UX', () => {
  it('builds a single clear student label from name and school reference', () => {
    expect(libraryStudentLabel(student())).toBe('محمد الحموي — HQAS3_1958379');
  });

  it('falls back to the student name when no school reference is available', () => {
    expect(libraryStudentLabel(student({ school_number: undefined }))).toBe('محمد الحموي');
  });
});
