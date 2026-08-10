import type { LevelCycle } from '@/types/class';
import type { LevelGroup } from '../types';

/** Canonical academic order for known Moroccan level codes. */
export const FALLBACK_LEVEL_ORDER: Record<string, number> = {
  PRE1: 10,
  PRE2: 20,
  PRE3: 30,
  P1: 40,
  P2: 50,
  P3: 60,
  P4: 70,
  P5: 80,
  P6: 90,
  M1: 100,
  M2: 110,
  M3: 120,
  H_TC: 130,
  H1: 140,
  H2: 150,
};

export const ORPHAN_CYCLE_ID = 0;
const ORPHAN_CYCLE_SEQUENCE = 999_999;

/** Explicit academic cycle order when API omits or mislabels `cycle.sequence`. */
export const CYCLE_ORDER: Record<string, number> = {
  preschool: 10,
  primary: 20,
  middle_school: 30,
  middle: 30,
  secondary: 40,
  high_school: 40,
  high: 40,
};

export interface CycleSortable {
  id: number;
  code: string;
  name: string;
  sequence?: number;
}

export interface GroupedLevelsByCycle {
  cycle: LevelCycle;
  levels: LevelGroup[];
  levelCount: number;
  classCount: number;
}

export function normalizeLevelCode(code?: string | null): string {
  return (code ?? '').trim().toUpperCase();
}

export function getFallbackLevelOrder(code?: string | null): number | null {
  const normalized = normalizeLevelCode(code);
  if (!normalized) return null;
  return FALLBACK_LEVEL_ORDER[normalized] ?? null;
}

function compareLevelCodes(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function levelSortTuple(level: LevelGroup): [number, number, number, string] {
  const canonical = getFallbackLevelOrder(level.code);
  const sequence =
    level.sequence != null && Number.isFinite(level.sequence)
      ? level.sequence
      : Number.POSITIVE_INFINITY;
  const code = normalizeLevelCode(level.code);

  // Known academic codes are authoritative. This prevents reversed API
  // sequences from flipping PRE1→PRE3 or H_TC→H2 in academic browsers.
  if (canonical != null) return [0, canonical, sequence, code];

  // Unknown/custom school levels keep the API-defined sequence contract.
  return [1, sequence, Number.POSITIVE_INFINITY, code];
}

export function sortLevels(levels: LevelGroup[]): LevelGroup[] {
  return [...levels].sort((a, b) => {
    const [kindA, orderA, seqA, codeA] = levelSortTuple(a);
    const [kindB, orderB, seqB, codeB] = levelSortTuple(b);

    if (kindA !== kindB) return kindA - kindB;
    if (orderA !== orderB) return orderA - orderB;
    if (seqA !== seqB) return seqA - seqB;
    return compareLevelCodes(codeA, codeB);
  });
}

export function normalizeCycleCode(code?: string | null): string {
  return (code ?? '').trim().toLowerCase();
}

export function getCycleSortOrder(cycle: CycleSortable): number {
  if (
    cycle.sequence != null &&
    Number.isFinite(cycle.sequence) &&
    cycle.sequence !== ORPHAN_CYCLE_SEQUENCE
  ) {
    return cycle.sequence;
  }
  const fromCode = CYCLE_ORDER[normalizeCycleCode(cycle.code)];
  if (fromCode != null) return fromCode;
  return 999;
}

export function sortCycles<T extends CycleSortable>(cycles: T[]): T[] {
  return [...cycles].sort((a, b) => {
    const orderA = getCycleSortOrder(a);
    const orderB = getCycleSortOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return normalizeCycleCode(a.code).localeCompare(normalizeCycleCode(b.code));
  });
}

function countClasses(level: LevelGroup): number {
  return level.classes_count ?? level.classes.length;
}

export function groupLevelsByCycle(levels: LevelGroup[]): GroupedLevelsByCycle[] {
  const sortedLevels = sortLevels(levels);
  const byCycleId = new Map<number, { cycle: LevelCycle; levels: LevelGroup[] }>();

  for (const level of sortedLevels) {
    const cycle = level.cycle ?? {
      id: ORPHAN_CYCLE_ID,
      code: 'other',
      name: '—',
      sequence: ORPHAN_CYCLE_SEQUENCE,
    };
    const bucket = byCycleId.get(cycle.id) ?? { cycle, levels: [] };
    bucket.levels.push(level);
    byCycleId.set(cycle.id, bucket);
  }

  const cycleOrder = sortCycles([...byCycleId.values()].map((b) => b.cycle));

  return cycleOrder
    .map((cycle) => {
      const bucket = byCycleId.get(cycle.id);
      if (!bucket?.levels.length) return null;
      return {
        cycle: bucket.cycle,
        levels: bucket.levels,
        levelCount: bucket.levels.length,
        classCount: bucket.levels.reduce((sum, level) => sum + countClasses(level), 0),
      };
    })
    .filter((group): group is GroupedLevelsByCycle => group != null);
}

export function uniqueSortedCycles(groups: LevelGroup[]): LevelCycle[] {
  const seen = new Map<number, LevelCycle>();
  for (const group of groups) {
    if (group.cycle?.id != null) {
      seen.set(group.cycle.id, group.cycle);
    }
  }
  return sortCycles([...seen.values()]);
}

export function buildInitialOpenCycleIds(
  groups: GroupedLevelsByCycle[],
  {
    searchActive,
    focusCycleId,
    isMobile,
  }: {
    searchActive: boolean;
    focusCycleId: number | null;
    isMobile: boolean;
  },
): Set<number> {
  const ids = new Set<number>();

  if (searchActive) {
    for (const group of groups) ids.add(group.cycle.id);
    return ids;
  }

  if (focusCycleId != null) {
    ids.add(focusCycleId);
    if (!isMobile) {
      for (const group of groups) ids.add(group.cycle.id);
    }
    return ids;
  }

  for (const group of groups) ids.add(group.cycle.id);
  return ids;
}

export function findCycleIdForLevel(
  groups: GroupedLevelsByCycle[],
  levelId: number,
): number | null {
  for (const group of groups) {
    if (group.levels.some((level) => level.id === levelId)) {
      return group.cycle.id;
    }
  }
  return null;
}
