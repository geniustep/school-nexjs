/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import type { Level } from '@/types/class';
import {
  groupLevelsByCycle,
  normalizeCycleCode,
  sortLevels,
  type GroupedLevelsByCycle,
} from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import type { LevelGroup } from '@/features/admin/academic-setup/types';

export type LevelsBrowserEmptyVariant = 'no-data' | 'no-match';

export function levelsBrowserHasActiveQuery(options: {
  search?: string;
  cycleFilter?: string;
}): boolean {
  return !!(options.search?.trim() || options.cycleFilter);
}

export function resolveLevelsBrowserEmptyVariant(options: {
  hasActiveQuery: boolean;
}): LevelsBrowserEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

function toLevelGroups(levels: Level[]): LevelGroup[] {
  return levels.map((level) => ({
    ...level,
    classes: [],
    studentCount: level.usage?.students ?? 0,
    needsReview: 0,
  }));
}

function levelSearchText(level: Level): string {
  return [
    level.name,
    level.code,
    level.display_name,
    level.moroccan_display_alias,
    level.cycle?.name,
    level.cycle?.code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterLevelsForSearch(levels: Level[], query: string): Level[] {
  const q = query.trim().toLowerCase();
  if (!q) return levels;
  return levels.filter((level) => levelSearchText(level).includes(q));
}

export function computeLevelsOverview(levels: Level[]) {
  let classCount = 0;
  let subjectCount = 0;
  let trackCount = 0;
  let activeCount = 0;

  for (const level of levels) {
    classCount += level.classes_count ?? level.usage?.classes ?? 0;
    subjectCount += level.subjects_count ?? 0;
    trackCount += level.tracks_count ?? 0;
    if (level.active !== false) activeCount += 1;
  }

  return {
    levelCount: levels.length,
    classCount,
    subjectCount,
    trackCount,
    activeCount,
  };
}

export function groupLevelsListByCycle(levels: Level[]): GroupedLevelsByCycle[] {
  return groupLevelsByCycle(toLevelGroups(levels));
}

export function filterLevelsByCycle(levels: Level[], cycleCode: string): Level[] {
  if (!cycleCode) return levels;
  const normalized = normalizeCycleCode(cycleCode);
  return levels.filter((level) => normalizeCycleCode(level.cycle?.code) === normalized);
}

export function sortedLevels(levels: Level[]): Level[] {
  return sortLevels(toLevelGroups(levels));
}

export function uniqueCycleCodes(levels: Level[]): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const level of levels) {
    const code = normalizeCycleCode(level.cycle?.code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}
