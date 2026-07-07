import { inferCycleCodeFromLevelCode } from './student-enrollment-cycle';
import type { Student } from '@/types/student';

export type StudentKanbanCycleTone =
  | 'preschool'
  | 'primary'
  | 'middle_school'
  | 'high_school'
  | 'default';

function levelCode(student: Student): string {
  const level = student.level as { code?: string | null; name?: string | null } | null;
  return (level?.code ?? level?.name ?? '').trim();
}

export function resolveStudentKanbanCycleTone(student: Student): StudentKanbanCycleTone {
  const inferred = inferCycleCodeFromLevelCode(levelCode(student));
  if (
    inferred === 'preschool' ||
    inferred === 'primary' ||
    inferred === 'middle_school' ||
    inferred === 'high_school'
  ) {
    return inferred;
  }
  return 'default';
}
