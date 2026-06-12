import type { LevelCycle } from '@/types/class';
import type { LevelGroup } from '../types';
import { uniqueSortedCycles } from './group-and-sort-levels';

export type LevelFilterMode =
  | 'all'
  | 'with_classes'
  | 'without_classes'
  | 'supports_tracks'
  | 'needs_review';

export interface LevelFilterOptions {
  search: string;
  filter: LevelFilterMode;
  cycleId: number | null;
  trackLevelIds: Set<number>;
}

export function filterLevelGroups(
  groups: LevelGroup[],
  { search, filter, cycleId, trackLevelIds }: LevelFilterOptions,
): LevelGroup[] {
  const q = search.trim().toLowerCase();

  return groups.filter((group) => {
    if (cycleId != null && group.cycle?.id !== cycleId) return false;

    if (q) {
      const nameMatch = group.name.toLowerCase().includes(q);
      const codeMatch = group.code?.toLowerCase().includes(q);
      if (!nameMatch && !codeMatch) return false;
    }

    const classCount = group.classes_count ?? group.classes.length;
    const supportsTracks =
      group.supports_tracks ?? trackLevelIds.has(group.id);

    switch (filter) {
      case 'with_classes':
        return classCount > 0;
      case 'without_classes':
        return classCount === 0;
      case 'supports_tracks':
        return supportsTracks;
      case 'needs_review':
        return group.needsReview > 0 || classCount === 0;
      case 'all':
      default:
        return true;
    }
  });
}

export function uniqueCycles(groups: LevelGroup[]): LevelCycle[] {
  return uniqueSortedCycles(groups);
}
