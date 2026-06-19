import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Student } from '@/types/student';

export const MIN_STUDENT_IDENTIFIER_CHECK_LENGTH = 4;

export type StudentIdentifierQueryField = 'massar_code' | 'school_number' | 'matricule' | 'code';

export type StudentIdentifierCheckStatus = 'idle' | 'checking' | 'available' | 'duplicate' | 'error';

export interface StudentIdentifierCheckResult {
  status: StudentIdentifierCheckStatus;
}

export function shouldCheckStudentIdentifier(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= MIN_STUDENT_IDENTIFIER_CHECK_LENGTH && !/\s/.test(trimmed);
}

function studentFieldValues(student: Student, field: StudentIdentifierQueryField): string[] {
  if (field === 'massar_code') {
    return [student.massar_code ?? ''];
  }
  if (field === 'code') {
    return [student.code ?? ''];
  }
  return [student.school_number ?? '', student.matricule ?? ''];
}

export function studentListHasExactIdentifierMatch(
  students: Student[] | null | undefined,
  field: StudentIdentifierQueryField,
  value: string,
): boolean {
  const needle = value.trim();
  if (!needle) return false;
  return (students ?? []).some((student) =>
    studentFieldValues(student, field).some((candidate) => candidate.trim() === needle),
  );
}

export async function checkStudentIdentifierDuplicate(
  field: StudentIdentifierQueryField,
  value: string,
  schoolId: number | null | undefined,
): Promise<StudentIdentifierCheckResult> {
  const trimmed = value.trim();
  if (!shouldCheckStudentIdentifier(trimmed)) {
    return { status: 'idle' };
  }

  const res = await api.get<Student[]>(endpoints.admin.students, {
    [field]: trimmed,
    page: 1,
    page_size: 10,
    active_school_id: schoolId ?? undefined,
  });

  if (!res.success) {
    return { status: 'error' };
  }

  const list = Array.isArray(res.data) ? res.data : [];
  if (studentListHasExactIdentifierMatch(list, field, trimmed)) {
    return { status: 'duplicate' };
  }

  return { status: 'available' };
}
