import { describe, expect, it } from 'vitest';
import type { LevelGroup } from '../types';
import { filterLevelGroups } from './level-filters';
import {
  buildInitialOpenCycleIds,
  findCycleIdForLevel,
  getFallbackLevelOrder,
  groupLevelsByCycle,
  sortCycles,
  sortLevels,
} from './group-and-sort-levels';

const preschool = { id: 1, code: 'preschool', name: 'Preschool', sequence: 10 };
const primary = { id: 2, code: 'primary', name: 'Primary', sequence: 20 };
const middle = { id: 3, code: 'middle', name: 'Middle', sequence: 30 };
const high = { id: 4, code: 'high', name: 'High', sequence: 40 };

function level(
  partial: Partial<LevelGroup> & Pick<LevelGroup, 'id' | 'code' | 'name'>,
): LevelGroup {
  return {
    classes: [],
    studentCount: 0,
    needsReview: 0,
    cycle: primary,
    ...partial,
  };
}

describe('getFallbackLevelOrder', () => {
  it('orders known Moroccan codes', () => {
    expect(getFallbackLevelOrder('pre1')).toBe(10);
    expect(getFallbackLevelOrder('H_TC')).toBe(130);
    expect(getFallbackLevelOrder('H1')).toBe(140);
    expect(getFallbackLevelOrder('H2')).toBe(150);
  });

  it('returns null for unknown codes', () => {
    expect(getFallbackLevelOrder('X9')).toBeNull();
  });
});

describe('sortLevels', () => {
  it('orders PRE1 before PRE2 and PRE3 using fallback', () => {
    const input = [
      level({ id: 3, code: 'PRE3', name: 'Pre 3', cycle: preschool }),
      level({ id: 1, code: 'PRE1', name: 'Pre 1', cycle: preschool }),
      level({ id: 2, code: 'PRE2', name: 'Pre 2', cycle: preschool }),
    ];
    expect(sortLevels(input).map((l) => l.code)).toEqual(['PRE1', 'PRE2', 'PRE3']);
  });

  it('orders P1 through P6', () => {
    const input = [
      level({ id: 6, code: 'P6', name: 'P6' }),
      level({ id: 1, code: 'P1', name: 'P1' }),
      level({ id: 3, code: 'P3', name: 'P3' }),
      level({ id: 5, code: 'P5', name: 'P5' }),
      level({ id: 2, code: 'P2', name: 'P2' }),
      level({ id: 4, code: 'P4', name: 'P4' }),
    ];
    expect(sortLevels(input).map((l) => l.code)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
  });

  it('orders H_TC before H1 and H2', () => {
    const input = [
      level({ id: 3, code: 'H2', name: 'H2', cycle: high }),
      level({ id: 1, code: 'H_TC', name: 'TC', cycle: high }),
      level({ id: 2, code: 'H1', name: 'H1', cycle: high }),
    ];
    expect(sortLevels(input).map((l) => l.code)).toEqual(['H_TC', 'H1', 'H2']);
  });

  it('keeps canonical known level order when API sequence conflicts', () => {
    const input = [
      level({ id: 1, code: 'P2', name: 'P2', sequence: 10 }),
      level({ id: 2, code: 'P1', name: 'P1', sequence: 20 }),
    ];
    expect(sortLevels(input).map((l) => l.code)).toEqual(['P1', 'P2']);
  });

  it('keeps preschool and secondary order when API sequence is reversed', () => {
    const input = [
      level({ id: 1, code: 'PRE1', name: 'Pre 1', cycle: preschool, sequence: 30 }),
      level({ id: 2, code: 'PRE2', name: 'Pre 2', cycle: preschool, sequence: 20 }),
      level({ id: 3, code: 'PRE3', name: 'Pre 3', cycle: preschool, sequence: 10 }),
      level({ id: 4, code: 'H_TC', name: 'TC', cycle: high, sequence: 150 }),
      level({ id: 5, code: 'H1', name: 'H1', cycle: high, sequence: 140 }),
      level({ id: 6, code: 'H2', name: 'H2', cycle: high, sequence: 130 }),
    ];
    expect(sortLevels(input).map((l) => l.code)).toEqual([
      'PRE1',
      'PRE2',
      'PRE3',
      'H_TC',
      'H1',
      'H2',
    ]);
  });

  it('uses canonical academic_code for Nibras school display codes', () => {
    const input = [
      level({ id: 1, code: 'GS', academic_code: 'PRE3', name: 'GS', cycle: preschool, sequence: 10 }),
      level({ id: 2, code: 'MS', academic_code: 'PRE2', name: 'MS', cycle: preschool, sequence: 20 }),
      level({ id: 3, code: 'PS', academic_code: 'PRE1', name: 'PS', cycle: preschool, sequence: 30 }),
      level({ id: 4, code: '2BAC', academic_code: 'H2', name: '2BAC', cycle: high, sequence: 130 }),
      level({ id: 5, code: '1BAC', academic_code: 'H1', name: '1BAC', cycle: high, sequence: 140 }),
      level({ id: 6, code: 'TC', academic_code: 'H_TC', name: 'TC', cycle: high, sequence: 150 }),
    ];

    expect(sortLevels(input).map((l) => l.code)).toEqual([
      'PS',
      'MS',
      'GS',
      'TC',
      '1BAC',
      '2BAC',
    ]);
  });

  it('keeps API sequence for unknown custom level codes', () => {
    const input = [
      level({ id: 1, code: 'CUSTOM-B', name: 'B', sequence: 20 }),
      level({ id: 2, code: 'CUSTOM-A', name: 'A', sequence: 10 }),
    ];
    expect(sortLevels(input).map((l) => l.code)).toEqual(['CUSTOM-A', 'CUSTOM-B']);
  });

  it('does not sort by id, class count, or status', () => {
    const input = [
      level({
        id: 99,
        code: 'P2',
        name: 'P2',
        classes: [{ id: 1, name: 'A', status: 'active' } as LevelGroup['classes'][0]],
        classes_count: 5,
      }),
      level({ id: 1, code: 'P1', name: 'P1', classes_count: 0 }),
    ];
    expect(sortLevels(input).map((l) => l.code)).toEqual(['P1', 'P2']);
  });

  it('keeps needs_review levels in academic order', () => {
    const input = [
      level({ id: 2, code: 'P2', name: 'P2', needsReview: 0 }),
      level({ id: 1, code: 'P1', name: 'P1', needsReview: 3 }),
      level({ id: 3, code: 'P3', name: 'P3', needsReview: 1 }),
    ];
    expect(sortLevels(input).map((l) => l.code)).toEqual(['P1', 'P2', 'P3']);
  });
});

describe('sortCycles', () => {
  it('orders cycles academically', () => {
    const cycles = [high, primary, preschool, middle];
    expect(sortCycles(cycles).map((c) => c.code)).toEqual([
      'preschool',
      'primary',
      'middle',
      'high',
    ]);
  });

  it('orders backend cycle codes without sequence', () => {
    const cycles = [
      { id: 4, code: 'high_school', name: 'الثانوي التأهيلي' },
      { id: 3, code: 'middle_school', name: 'الثانوي الإعدادي' },
      { id: 1, code: 'preschool', name: 'التعليم الأولي' },
      { id: 2, code: 'primary', name: 'التعليم الابتدائي' },
    ];
    expect(sortCycles(cycles).map((c) => c.code)).toEqual([
      'preschool',
      'primary',
      'middle_school',
      'high_school',
    ]);
  });

  it('does not alphabetically rank high_school before middle_school', () => {
    const cycles = [
      { id: 1, code: 'high_school', name: 'High' },
      { id: 2, code: 'middle_school', name: 'Middle' },
    ];
    expect(sortCycles(cycles).map((c) => c.code)).toEqual(['middle_school', 'high_school']);
  });
});

describe('groupLevelsByCycle', () => {
  const levels = [
    level({ id: 10, code: 'P2', name: 'P2', cycle: primary }),
    level({ id: 11, code: 'PRE1', name: 'PRE1', cycle: preschool }),
    level({ id: 12, code: 'M1', name: 'M1', cycle: middle }),
    level({ id: 13, code: 'P1', name: 'P1', cycle: primary }),
    level({ id: 14, code: 'H_TC', name: 'TC', cycle: high }),
  ];

  it('groups and orders cycles then levels', () => {
    const groups = groupLevelsByCycle(levels);
    expect(groups.map((g) => g.cycle.code)).toEqual(['preschool', 'primary', 'middle', 'high']);
    expect(groups[0]?.levels.map((l) => l.code)).toEqual(['PRE1']);
    expect(groups[1]?.levels.map((l) => l.code)).toEqual(['P1', 'P2']);
    expect(groups[3]?.levels.map((l) => l.code)).toEqual(['H_TC']);
  });

  it('orders cycle groups when API uses middle_school and high_school without sequence', () => {
    const apiLevels = [
      level({ id: 1, code: 'H1', name: 'H1', cycle: { id: 40, code: 'high_school', name: 'الثانوي التأهيلي' } }),
      level({ id: 2, code: 'M1', name: 'M1', cycle: { id: 30, code: 'middle_school', name: 'الثانوي الإعدادي' } }),
      level({ id: 3, code: 'PRE1', name: 'PRE1', cycle: { id: 10, code: 'preschool', name: 'التعليم الأولي' } }),
      level({ id: 4, code: 'P1', name: 'P1', cycle: { id: 20, code: 'primary', name: 'التعليم الابتدائي' } }),
    ];
    expect(groupLevelsByCycle(apiLevels).map((g) => g.cycle.code)).toEqual([
      'preschool',
      'primary',
      'middle_school',
      'high_school',
    ]);
  });

  it('preserves order after search filter', () => {
    const filtered = filterLevelGroups(levels, {
      search: 'p',
      filter: 'all',
      cycleId: null,
      trackLevelIds: new Set(),
    });
    const groups = groupLevelsByCycle(filtered);
    expect(groups.map((g) => g.cycle.code)).toEqual(['preschool', 'primary']);
    expect(groups[1]?.levels.map((l) => l.code)).toEqual(['P1', 'P2']);
  });

  it('preserves order after status-like filter', () => {
    const withReview = [
      ...levels,
      level({ id: 15, code: 'P3', name: 'P3', cycle: primary, needsReview: 2, classes_count: 0 }),
    ];
    const filtered = filterLevelGroups(withReview, {
      search: '',
      filter: 'needs_review',
      cycleId: null,
      trackLevelIds: new Set(),
    });
    const groups = groupLevelsByCycle(filtered);
    expect(groups[1]?.levels.map((l) => l.code)).toEqual(['P1', 'P2', 'P3']);
  });
});

describe('buildInitialOpenCycleIds', () => {
  const groups = groupLevelsByCycle([
    level({ id: 1, code: 'PRE1', name: 'PRE1', cycle: preschool }),
    level({ id: 2, code: 'P1', name: 'P1', cycle: primary }),
  ]);

  it('opens only result cycles when searching', () => {
    const open = buildInitialOpenCycleIds(groups, {
      searchActive: true,
      focusCycleId: null,
      isMobile: false,
    });
    expect([...open]).toEqual([preschool.id, primary.id]);
  });

  it('opens focus cycle on mobile and all on desktop', () => {
    const focusCycleId = findCycleIdForLevel(groups, 2);
    const mobile = buildInitialOpenCycleIds(groups, {
      searchActive: false,
      focusCycleId,
      isMobile: true,
    });
    expect([...mobile]).toEqual([primary.id]);

    const desktop = buildInitialOpenCycleIds(groups, {
      searchActive: false,
      focusCycleId,
      isMobile: false,
    });
    expect([...desktop].sort()).toEqual([preschool.id, primary.id].sort());
  });
});
