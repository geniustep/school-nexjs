import { describe, expect, it } from 'vitest';
import { filterLevelGroups } from './level-filters';
import type { LevelGroup } from '../types';

function group(partial: Partial<LevelGroup> & Pick<LevelGroup, 'id' | 'name'>): LevelGroup {
  return {
    code: 'P1',
    cycle: { id: 1, code: 'primary', name: 'Primary' },
    classes: [],
    studentCount: 0,
    needsReview: 0,
    ...partial,
  };
}

describe('filterLevelGroups', () => {
  const groups: LevelGroup[] = [
    group({
      id: 1,
      name: 'First primary',
      classes: [{ id: 10, name: 'A', status: 'active' } as LevelGroup['classes'][0]],
      classes_count: 1,
    }),
    group({ id: 2, name: 'Second primary', supports_tracks: true }),
    group({
      id: 3,
      name: 'Middle',
      cycle: { id: 2, code: 'middle', name: 'Middle' },
      needsReview: 2,
      classes: [],
      classes_count: 1,
    }),
  ];

  const trackIds = new Set([2]);

  it('filters by search query on name and code', () => {
    expect(
      filterLevelGroups(groups, {
        search: 'second',
        filter: 'all',
        cycleId: null,
        trackLevelIds: trackIds,
      }),
    ).toHaveLength(1);
    expect(
      filterLevelGroups(groups, {
        search: 'p1',
        filter: 'all',
        cycleId: null,
        trackLevelIds: trackIds,
      }),
    ).toHaveLength(3);
  });

  it('filters without classes', () => {
    const result = filterLevelGroups(groups, {
      search: '',
      filter: 'without_classes',
      cycleId: null,
      trackLevelIds: trackIds,
    });
    expect(result.map((g) => g.id)).toEqual([2]);
  });

  it('filters supports tracks', () => {
    const result = filterLevelGroups(groups, {
      search: '',
      filter: 'supports_tracks',
      cycleId: null,
      trackLevelIds: trackIds,
    });
    expect(result.map((g) => g.id)).toEqual([2]);
  });

  it('filters needs review', () => {
    const result = filterLevelGroups(groups, {
      search: '',
      filter: 'needs_review',
      cycleId: null,
      trackLevelIds: trackIds,
    });
    expect(result.map((g) => g.id).sort()).toEqual([2, 3]);
  });

  it('filters by cycle', () => {
    const result = filterLevelGroups(groups, {
      search: '',
      filter: 'all',
      cycleId: 2,
      trackLevelIds: trackIds,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(3);
  });
});
