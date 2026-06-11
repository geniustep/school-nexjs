import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { DerivedAssignment } from '../types';

/** Find teacher assigned to a class subject using class.teachers ∩ teacher.subjects. */
export function findAssignedTeacher(
  cls: Pick<SchoolClass, 'teachers'>,
  subjectId: number,
  teachersById: Map<number, Teacher>,
): { id: number; name: string } | null {
  for (const ref of cls.teachers ?? []) {
    const teacher = teachersById.get(ref.id);
    if (!teacher) continue;
    if (teacher.subjects?.some((s) => s.id === subjectId)) {
      return { id: teacher.id, name: teacher.name };
    }
  }
  return null;
}

/** Derive class+subject(+teacher) rows from existing list payloads — not a backend assignment model. */
export function deriveAssignments(
  classes: SchoolClass[],
  teachers: Teacher[],
): DerivedAssignment[] {
  const teachersById = new Map(teachers.map((t) => [t.id, t]));
  const rows: DerivedAssignment[] = [];

  for (const cls of classes) {
    for (const subject of cls.subjects ?? []) {
      const assigned = findAssignedTeacher(cls, subject.id, teachersById);
      rows.push({
        id: `${cls.id}-${subject.id}`,
        classId: cls.id,
        className: cls.name,
        levelId: cls.level?.id ?? null,
        levelName: cls.level?.name ?? null,
        subjectId: subject.id,
        subjectName: subject.name,
        teacherId: assigned?.id ?? null,
        teacherName: assigned?.name ?? null,
        status: assigned ? 'assigned' : 'unassigned',
      });
    }
  }

  return rows;
}

export function countUnassigned(rows: DerivedAssignment[]): number {
  return rows.filter((r) => r.status === 'unassigned').length;
}
