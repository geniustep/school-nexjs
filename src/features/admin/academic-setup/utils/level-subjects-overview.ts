import type { Level, SchoolClass, Subject } from '@/types/class';
import { dedupeSubjectsForDisplay } from './subject-present';

export type LevelSubjectsRow = {
  level: Level;
  subjects: Subject[];
  classCount: number;
  needsEnable: boolean;
};

function subjectIdsByLevel(classes: SchoolClass[]): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  for (const cls of classes) {
    const levelId = cls.level?.id;
    if (levelId == null) continue;
    const set = map.get(levelId) ?? new Set<number>();
    for (const s of cls.subjects ?? []) set.add(s.id);
    map.set(levelId, set);
  }
  return map;
}

export function buildLevelSubjectsRows(
  levels: Level[],
  classes: SchoolClass[],
  subjects: Subject[],
): LevelSubjectsRow[] {
  const idsByLevel = subjectIdsByLevel(classes);

  return levels.map((level) => {
    const ids = idsByLevel.get(level.id) ?? new Set<number>();
    const fromClasses = subjects.filter((s) => ids.has(s.id));
    const raw = fromClasses.length ? fromClasses : (level.subjects ?? []);
    const levelSubjects = dedupeSubjectsForDisplay(raw);
    return {
      level,
      subjects: levelSubjects,
      classCount: classes.filter((c) => c.level?.id === level.id).length,
      needsEnable: levelSubjects.length === 0,
    };
  });
}

export function summarizeLevelSubjects(rows: LevelSubjectsRow[]) {
  const pendingLevels = rows.filter((r) => r.needsEnable).length;
  const readyLevels = rows.length - pendingLevels;
  const subjectCount = rows.reduce((sum, r) => sum + r.subjects.length, 0);
  const firstPendingId = rows.find((r) => r.needsEnable)?.level.id ?? null;
  return { pendingLevels, readyLevels, subjectCount, firstPendingId };
}
