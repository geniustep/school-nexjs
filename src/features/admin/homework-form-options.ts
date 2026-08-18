import type { TeachingAssignment } from '@/types/academic-setup';

export interface HomeworkTeacherOption {
  id: number;
  name: string;
}

export function getHomeworkTeacherOptions(
  assignments: TeachingAssignment[],
): HomeworkTeacherOption[] {
  const teachers = new Map<number, HomeworkTeacherOption>();

  for (const assignment of assignments) {
    if (!assignment.active) continue;
    teachers.set(assignment.teacher.id, {
      id: assignment.teacher.id,
      name: assignment.teacher.name,
    });
  }

  return [...teachers.values()].sort((a, b) => a.name.localeCompare(b.name));
}
