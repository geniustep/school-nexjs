import { describe, expect, it } from 'vitest';
import {
  computeLevelsOverview,
  filterLevelsByCycle,
  filterLevelsForSearch,
  groupLevelsListByCycle,
  levelsBrowserHasActiveQuery,
  resolveLevelsBrowserEmptyVariant,
} from './levels-list-utils';
import type { Level } from '@/types/class';

function level(partial: Partial<Level> & Pick<Level, 'id' | 'name'>): Level {
  return {
    code: null,
    ...partial,
  };
}

describe('levels-list-utils', () => {
  const levels: Level[] = [
    level({
      id: 1,
      name: 'P1',
      code: 'P1',
      cycle: { id: 10, code: 'primary', name: 'Primary' },
      classes_count: 2,
      subjects_count: 5,
      active: true,
    }),
    level({
      id: 2,
      name: 'M1',
      code: 'M1',
      cycle: { id: 20, code: 'middle_school', name: 'Middle' },
      classes_count: 1,
      subjects_count: 3,
      active: false,
    }),
  ];

  it('filters by search query', () => {
    expect(filterLevelsForSearch(levels, 'p1')).toHaveLength(1);
    expect(filterLevelsForSearch(levels, '')).toHaveLength(2);
  });

  it('filters by cycle code', () => {
    expect(filterLevelsByCycle(levels, 'primary')).toHaveLength(1);
    expect(filterLevelsByCycle(levels, '')).toHaveLength(2);
  });

  it('computes overview totals', () => {
    const overview = computeLevelsOverview(levels);
    expect(overview.levelCount).toBe(2);
    expect(overview.classCount).toBe(3);
    expect(overview.subjectCount).toBe(8);
    expect(overview.activeCount).toBe(1);
  });

  it('groups levels by cycle', () => {
    const groups = groupLevelsListByCycle(levels);
    expect(groups).toHaveLength(2);
    expect(groups[0].levels[0].code).toBe('P1');
  });

  it('detects active query and separates no-data from no-match', () => {
    expect(levelsBrowserHasActiveQuery({})).toBe(false);
    expect(levelsBrowserHasActiveQuery({ search: 'p1' })).toBe(true);
    expect(levelsBrowserHasActiveQuery({ cycleFilter: 'primary' })).toBe(true);
    expect(resolveLevelsBrowserEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveLevelsBrowserEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });
});
