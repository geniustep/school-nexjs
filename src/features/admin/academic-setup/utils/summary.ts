import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { LevelGroup, SetupSummaryCounts, SubjectLevelGroup, TeacherCardModel, TeacherStatusKey } from '../types';
import { countUnassigned, deriveAssignments } from './assignments-derive';
import { isHighLoadTeacher } from './teacher-ranking';

export function buildLevelGroups(levels: Level[], classes: SchoolClass[]): LevelGroup[] {
  return levels.map((level) => {
    const levelClasses = classes.filter((c) => c.level?.id === level.id);
    const studentCount = levelClasses.reduce((sum, c) => sum + (c.student_count ?? 0), 0);
    const needsReview = levelClasses.filter(
      (c) => (c.subjects?.length ?? 0) === 0 || (c.teachers?.length ?? 0) === 0,
    ).length;
    return { ...level, classes: levelClasses, studentCount, needsReview };
  });
}

export function groupSubjectsByLevel(
  levels: Level[],
  classes: SchoolClass[],
  subjects: Subject[],
): SubjectLevelGroup[] {
  const subjectIdsInLevels = new Map<number, Set<number>>();

  for (const cls of classes) {
    const levelId = cls.level?.id ?? 0;
    const set = subjectIdsInLevels.get(levelId) ?? new Set<number>();
    for (const s of cls.subjects ?? []) set.add(s.id);
    subjectIdsInLevels.set(levelId, set);
  }

  const groups: SubjectLevelGroup[] = levels.map((level) => {
    const ids = subjectIdsInLevels.get(level.id) ?? new Set<number>();
    const levelSubjects = subjects.filter((s) => ids.has(s.id));
    return {
      levelId: level.id,
      levelName: level.name,
      subjects: levelSubjects.length ? levelSubjects : (level.subjects ?? []),
    };
  });

  const orphanSubjects = subjects.filter(
    (s) => !groups.some((g) => g.subjects.some((x) => x.id === s.id)),
  );
  if (orphanSubjects.length) {
    groups.push({
      levelId: null,
      levelName: '—',
      subjects: orphanSubjects,
    });
  }

  return groups.filter((g) => g.subjects.length > 0);
}

export function teacherStatus(teacher: Teacher): TeacherStatusKey {
  if (teacher.status !== 'active') return 'inactive';
  if (!teacher.email && !teacher.phone) return 'needs_info';
  if ((teacher.classes?.length ?? 0) === 0) return 'no_assignment';
  if (isHighLoadTeacher(teacher)) return 'high_load';
  return 'complete';
}

export function buildTeacherCards(teachers: Teacher[]): TeacherCardModel[] {
  return teachers.map((teacher) => ({
    teacher,
    status: teacherStatus(teacher),
    classCount: teacher.classes?.length ?? 0,
    subjectNames: teacher.subjects?.map((s) => s.name) ?? [],
  }));
}

export function computeSummaryCounts(
  levels: Level[],
  classes: SchoolClass[],
  subjects: Subject[],
  teachers: Teacher[],
): SetupSummaryCounts {
  const assignments = deriveAssignments(classes, teachers);
  const unassigned = countUnassigned(assignments);
  const classesNeedReview = classes.filter(
    (c) => (c.subjects?.length ?? 0) === 0 || (c.teachers?.length ?? 0) === 0,
  ).length;
  const incompleteTeachers = teachers.filter((t) => !t.email && !t.phone).length;
  const teachersWithoutAssignments = teachers.filter((t) => (t.classes?.length ?? 0) === 0).length;
  const activeTeachers = teachers.filter((t) => t.status === 'active').length;
  const highLoadTeachers = teachers.filter(isHighLoadTeacher).length;
  const incompleteClasses = classes.filter((c) => {
    const subjectCount = c.subjects?.length ?? 0;
    const assignedCount = assignments.filter(
      (a) => a.classId === c.id && a.status === 'assigned',
    ).length;
    return subjectCount > 0 && assignedCount < subjectCount;
  }).length;

  const subjectIdsUsed = new Set<number>();
  for (const cls of classes) {
    for (const s of cls.subjects ?? []) subjectIdsUsed.add(s.id);
  }
  const unlinkedSubjects = subjects.filter((s) => !subjectIdsUsed.has(s.id)).length;

  return {
    levels: levels.length,
    classes: classes.length,
    classesNeedReview,
    activeSubjects: subjects.length,
    tracks: 0,
    unlinkedSubjects,
    teachers: teachers.length,
    activeTeachers,
    incompleteTeachers,
    teachersWithoutAssignments,
    staff: 0,
    staffManagers: 0,
    inactiveStaff: 0,
    assignments: assignments.filter((a) => a.status === 'assigned').length,
    subjectsWithoutTeacher: unassigned,
    highLoadTeachers,
    incompleteClasses,
  };
}
