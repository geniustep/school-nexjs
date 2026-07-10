/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import type { LevelGroup } from '@/features/admin/academic-setup/types';
import {
  groupLevelsByCycle,
  normalizeLevelCode,
  type GroupedLevelsByCycle,
} from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import type { Level, SchoolClass } from '@/types/class';

export type ClassesBrowserEmptyVariant = 'no-data' | 'no-match';

export function classesBrowserHasActiveQuery(options: { search?: string }): boolean {
  return !!options.search?.trim();
}

export function resolveClassesBrowserEmptyVariant(options: {
  totalCount: number;
  filteredCount: number;
  hasActiveQuery: boolean;
}): ClassesBrowserEmptyVariant {
  if (options.totalCount === 0) return 'no-data';
  if (options.filteredCount === 0 && options.hasActiveQuery) return 'no-match';
  return 'no-data';
}

export interface ClassLevelBucket extends LevelGroup {
  classes: SchoolClass[];
}

export interface GroupedClassesByCycle {
  cycle: GroupedLevelsByCycle['cycle'];
  levels: ClassLevelBucket[];
  levelCount: number;
  classCount: number;
  studentCount: number;
}

export interface ClassesOverview {
  classCount: number;
  activeCount: number;
  studentCount: number;
  levelCount: number;
  cycleCount: number;
}

function sortClassesInLevel(classes: SchoolClass[]): SchoolClass[] {
  return [...classes].sort((a, b) => {
    const keyA = normalizeLevelCode(a.code) || a.name;
    const keyB = normalizeLevelCode(b.code) || b.name;
    return keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function toLevelGroup(level: Level, classes: SchoolClass[]): ClassLevelBucket {
  const sorted = sortClassesInLevel(classes);
  const studentCount = sorted.reduce((sum, cls) => sum + (cls.student_count ?? 0), 0);
  return {
    ...level,
    classes: sorted,
    studentCount,
    needsReview: 0,
    classes_count: sorted.length,
  };
}

export function buildClassLevelGroups(classes: SchoolClass[], levels: Level[]): ClassLevelBucket[] {
  const byLevelId = new Map<number, SchoolClass[]>();

  for (const cls of classes) {
    const levelId = cls.level?.id;
    if (levelId == null) continue;
    const list = byLevelId.get(levelId) ?? [];
    list.push(cls);
    byLevelId.set(levelId, list);
  }

  const groups: ClassLevelBucket[] = [];

  for (const level of levels) {
    const levelClasses = byLevelId.get(level.id);
    if (!levelClasses?.length) continue;
    groups.push(toLevelGroup(level, levelClasses));
    byLevelId.delete(level.id);
  }

  for (const [levelId, levelClasses] of byLevelId) {
    const first = levelClasses[0];
    const stub: Level = {
      id: levelId,
      name: first.level?.name ?? '—',
      code: first.level?.code ?? null,
      display_name: first.level?.display_name ?? null,
      moroccan_display_alias: first.level?.moroccan_display_alias ?? null,
    };
    groups.push(toLevelGroup(stub, levelClasses));
  }

  return groups;
}

export function groupClassesByCycle(classes: SchoolClass[], levels: Level[]): GroupedClassesByCycle[] {
  const levelGroups = buildClassLevelGroups(classes, levels);
  const cycleGroups = groupLevelsByCycle(levelGroups);

  return cycleGroups.map((section) => ({
    cycle: section.cycle,
    levels: section.levels as ClassLevelBucket[],
    levelCount: section.levelCount,
    classCount: section.classCount,
    studentCount: section.levels.reduce((sum, lvl) => sum + (lvl.studentCount ?? 0), 0),
  }));
}

export function computeClassesOverview(
  classes: SchoolClass[],
  grouped: GroupedClassesByCycle[],
): ClassesOverview {
  const activeCount = classes.filter((cls) => cls.status === 'active').length;
  const studentCount = classes.reduce((sum, cls) => sum + (cls.student_count ?? 0), 0);
  const levelCount = grouped.reduce((sum, group) => sum + group.levelCount, 0);
  return {
    classCount: classes.length,
    activeCount,
    studentCount,
    levelCount,
    cycleCount: grouped.length,
  };
}

export function filterClassesForSearch(classes: SchoolClass[], query: string): SchoolClass[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return classes;

  return classes.filter((cls) => {
    const haystack = [
      cls.name,
      cls.code,
      cls.display_name,
      cls.display_alias,
      cls.section_name,
      cls.level?.name,
      cls.level?.code,
      cls.level?.display_name,
      cls.track?.name,
      cls.track?.code,
      cls.academic_year,
    ]
      .filter((value): value is string => !!value?.trim())
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
}
