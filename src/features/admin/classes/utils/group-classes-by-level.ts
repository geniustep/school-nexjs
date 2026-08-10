/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import type { LevelGroup } from '@/features/admin/academic-setup/types';
import {
  ORPHAN_CYCLE_ID,
  groupLevelsByCycle,
  normalizeLevelCode,
  type GroupedLevelsByCycle,
} from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import type { Level, SchoolClass } from '@/types/class';

export type ClassesBrowserEmptyVariant = 'no-data' | 'no-match';

export interface ClassesBrowserQuery {
  search?: string;
  academicYear?: string;
  cycleId?: number | null;
  levelId?: number | null;
  status?: string;
}

export function classesBrowserHasActiveQuery(options: ClassesBrowserQuery): boolean {
  return (
    !!options.search?.trim() ||
    !!options.academicYear?.trim() ||
    options.cycleId != null ||
    options.levelId != null ||
    !!options.status?.trim()
  );
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
    const keyA =
      normalizeLevelCode(
        a.recommended_display_code ?? a.academic_code ?? a.code ?? a.section_name,
      ) || a.name;
    const keyB =
      normalizeLevelCode(
        b.recommended_display_code ?? b.academic_code ?? b.code ?? b.section_name,
      ) || b.name;
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
      academic_code: first.level?.academic_code ?? null,
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

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const INVISIBLE_SEARCH_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;

/** Conservative normalization only: no fuzzy spelling correction. */
export function normalizeClassesSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(ARABIC_DIACRITICS, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(INVISIBLE_SEARCH_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function filterClassesForSearch(classes: SchoolClass[], query: string): SchoolClass[] {
  const needle = normalizeClassesSearchText(query);
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
      .trim();

    return normalizeClassesSearchText(haystack).includes(needle);
  });
}

export function filterClassesForBrowser(
  classes: SchoolClass[],
  levels: Level[],
  query: ClassesBrowserQuery,
): SchoolClass[] {
  const byLevelId = new Map(levels.map((level) => [level.id, level]));
  const searched = filterClassesForSearch(classes, query.search ?? '');
  const academicYear = query.academicYear?.trim() ?? '';
  const status = query.status?.trim() ?? '';

  return searched.filter((cls) => {
    if (academicYear && cls.academic_year?.trim() !== academicYear) return false;
    if (status && cls.status !== status) return false;
    if (query.levelId != null && cls.level?.id !== query.levelId) return false;

    if (query.cycleId != null) {
      const embeddedCycleId = cls.level?.cycle?.id;
      const levelCycleId = cls.level?.id != null ? byLevelId.get(cls.level.id)?.cycle?.id : null;
      const resolvedCycleId = embeddedCycleId ?? levelCycleId ?? ORPHAN_CYCLE_ID;
      if (resolvedCycleId !== query.cycleId) return false;
    }

    return true;
  });
}
