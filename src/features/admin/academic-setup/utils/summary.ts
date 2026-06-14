import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { LevelGroup, SubjectLevelGroup, TeacherCardModel, TeacherStatusKey } from '../types';
import { resolveEffectiveSubjectsCount } from './normalize-class';

const HIGH_LOAD_CLASS_COUNT = 6;

function isHighLoadTeacher(teacher: Teacher): boolean {
  return (teacher.classes?.length ?? 0) >= HIGH_LOAD_CLASS_COUNT;
}

export function buildLevelGroups(levels: Level[], classes: SchoolClass[]): LevelGroup[] {
  return levels.map((level) => {
    const levelClasses = classes.filter((c) => c.level?.id === level.id);
    const studentCount = levelClasses.reduce((sum, c) => sum + (c.student_count ?? 0), 0);
    const needsReview = levelClasses.filter((c) => resolveEffectiveSubjectsCount(c) === 0).length;
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
  return teachers.map((teacher) => {
    const assignmentCount = teacher.assignments?.length ?? teacher.classes?.length ?? 0;
    return {
      teacher,
      status: teacherStatus(teacher),
      classCount: teacher.classes?.length ?? 0,
      assignmentCount,
      subjectNames: teacher.subjects?.map((s) => s.name) ?? [],
    };
  });
}
