import { filterLevelsByCycle } from '@/features/admin/levels/utils/levels-list-utils';
import {
  normalizeCycleCode,
  sortCycles,
  sortLevels,
  uniqueSortedCycles,
} from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import { studentClassLabel, studentLevelLabel } from './student-academic-labels';
import type { Level, LevelCycle, SchoolClass } from '@/types/class';

/** Classes visible once a level is chosen in the students list filters. */
export function filterSchoolClassesByLevel(
  classes: SchoolClass[],
  levelId: string,
): SchoolClass[] {
  const normalized = levelId.trim();
  if (!normalized) return [];
  const levelNum = Number(normalized);
  if (!Number.isFinite(levelNum)) return [];
  return classes.filter((cls) => cls.level?.id === levelNum);
}

export function isSchoolClassInLevel(
  classId: string,
  classes: SchoolClass[],
  levelId: string,
): boolean {
  const normalized = classId.trim();
  if (!normalized || !levelId.trim()) return false;
  return filterSchoolClassesByLevel(classes, levelId).some((cls) => String(cls.id) === normalized);
}

export function buildCycleOptions(levels: Level[]): LevelCycle[] {
  return uniqueSortedCycles(
    levels.map((level) => ({
      ...level,
      classes: [],
      studentCount: level.usage?.students ?? 0,
      needsReview: 0,
    })),
  );
}

export function filterLevelsForStudentsList(levels: Level[], cycleCode: string): Level[] {
  const scoped = filterLevelsByCycle(levels, cycleCode);
  return sortLevels(
    scoped.map((level) => ({
      ...level,
      classes: [],
      studentCount: level.usage?.students ?? 0,
      needsReview: 0,
    })),
  );
}

export function isLevelInCycle(levelId: string, levels: Level[], cycleCode: string): boolean {
  const normalizedLevelId = levelId.trim();
  const normalizedCycleCode = cycleCode.trim();
  if (!normalizedLevelId || !normalizedCycleCode) return false;
  const level = levels.find((item) => String(item.id) === normalizedLevelId);
  if (!level) return false;
  return normalizeCycleCode(level.cycle?.code) === normalizeCycleCode(normalizedCycleCode);
}

export function resolveCycleLabel(cycles: LevelCycle[], cycleCode: string): string | null {
  const normalized = normalizeCycleCode(cycleCode);
  if (!normalized) return null;
  const cycle = cycles.find((item) => normalizeCycleCode(item.code) === normalized);
  return cycle?.name?.trim() || cycle?.code?.trim() || null;
}

export function sortSchoolClassesForFilter(classes: SchoolClass[]): SchoolClass[] {
  return [...classes].sort((a, b) =>
    studentClassLabel(a).localeCompare(studentClassLabel(b), undefined, { sensitivity: 'base' }),
  );
}

export function sortCyclesForFilter(cycles: LevelCycle[]): LevelCycle[] {
  return sortCycles(cycles);
}

export function sortLevelsForFilter(levels: Level[]): Level[] {
  return filterLevelsForStudentsList(levels, '');
}
