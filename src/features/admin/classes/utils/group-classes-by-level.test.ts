import { describe, expect, it } from 'vitest';
import type { Level, SchoolClass } from '@/types/class';
import {
  buildClassLevelGroups,
  classesBrowserHasActiveQuery,
  computeClassesOverview,
  filterClassesForBrowser,
  filterClassesForSearch,
  groupClassesByCycle,
  normalizeClassesSearchText,
  resolveClassesBrowserEmptyVariant,
} from './group-classes-by-level';

const levels: Level[] = [
  {
    id: 1,
    name: 'السنة الأولى ابتدائي',
    code: 'P1',
    sequence: 40,
    cycle: { id: 10, code: 'primary', name: 'ابتدائي', sequence: 20 },
  },
  {
    id: 2,
    name: 'الأولى إعدادي',
    code: 'M1',
    sequence: 100,
    cycle: { id: 20, code: 'middle_school', name: 'إعدادي', sequence: 30 },
  },
];

function classStub(id: number, levelId: number, code: string, name: string): SchoolClass {
  const level = levels.find((item) => item.id === levelId);
  return {
    id,
    name,
    code,
    level: level
      ? { id: level.id, name: level.name, code: level.code }
      : null,
    academic_year: '2025-2026',
    student_count: id,
    capacity: 30,
    teachers: [],
    subjects: [],
    status: 'active',
  };
}

describe('groupClassesByCycle', () => {
  it('orders cycles from primary to middle and sorts classes within level', () => {
    const classes = [
      classStub(3, 1, 'P1-B', 'P1-B'),
      classStub(1, 1, 'P1-A', 'P1-A'),
      classStub(2, 2, 'M1-A', 'M1-A'),
    ];

    const grouped = groupClassesByCycle(classes, levels);

    expect(grouped.map((group) => group.cycle.code)).toEqual(['primary', 'middle_school']);
    expect(grouped[0].levels[0].classes.map((cls) => cls.code)).toEqual(['P1-A', 'P1-B']);
    expect(grouped[1].levels[0].classes[0].code).toBe('M1-A');
  });

  it('computes overview totals', () => {
    const classes = [classStub(1, 1, 'P1-A', 'P1-A'), classStub(2, 2, 'M1-A', 'M1-A')];
    const grouped = groupClassesByCycle(classes, levels);
    const overview = computeClassesOverview(classes, grouped);

    expect(overview).toEqual({
      classCount: 2,
      activeCount: 2,
      studentCount: 3,
      levelCount: 2,
      cycleCount: 2,
    });
  });

  it('filters classes by search query', () => {
    const classes = [classStub(1, 1, 'P1-A', 'P1-A'), classStub(2, 2, 'M1-A', 'M1-A')];
    const filtered = filterClassesForSearch(classes, 'm1');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].code).toBe('M1-A');
  });

  it('normalizes safe Arabic variants without fuzzy correction', () => {
    expect(normalizeClassesSearchText('  أَولىـ  ')).toBe('اولى');
    const cls = classStub(1, 1, 'P1-A', 'الأولى أ');
    expect(filterClassesForSearch([cls], 'الاولى')).toHaveLength(1);
  });

  it('filters by academic year, cycle, level, and status', () => {
    const current = classStub(1, 1, 'P1-A', 'P1-A');
    const archived = {
      ...classStub(2, 2, 'M1-A', 'M1-A'),
      academic_year: '2024-2025',
      status: 'archived',
    };
    const filtered = filterClassesForBrowser([current, archived], levels, {
      academicYear: '2025-2026',
      cycleId: 10,
      levelId: 1,
      status: 'active',
    });
    expect(filtered.map((cls) => cls.id)).toEqual([1]);
  });

  it('orders classes by recommended academic display code before legacy code', () => {
    const classes = [
      { ...classStub(1, 1, 'AAA', 'Legacy A'), recommended_display_code: 'P1-2' },
      { ...classStub(2, 1, 'ZZZ', 'Legacy Z'), recommended_display_code: 'P1-1' },
    ];
    const grouped = groupClassesByCycle(classes, levels);
    expect(grouped[0].levels[0].classes.map((cls) => cls.id)).toEqual([2, 1]);
  });

  it('builds orphan level bucket when level list is incomplete', () => {
    const orphanClass: SchoolClass = {
      ...classStub(9, 1, 'X1-A', 'X1-A'),
      id: 9,
      level: { id: 99, name: 'مستوى غير معرّف', code: 'X1' },
    };
    const groups = buildClassLevelGroups([orphanClass], levels);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe(99);
    expect(groups[0].classes).toHaveLength(1);
  });

  it('preserves canonical academic_code for fallback level buckets', () => {
    const aliases: SchoolClass[] = [
      {
        ...classStub(1, 1, 'GS-A', 'GS'),
        level: { id: 103, name: 'GS', code: 'GS', academic_code: 'PRE3' },
      },
      {
        ...classStub(2, 1, 'MS-A', 'MS'),
        level: { id: 102, name: 'MS', code: 'MS', academic_code: 'PRE2' },
      },
      {
        ...classStub(3, 1, 'PS-A', 'PS'),
        level: { id: 101, name: 'PS', code: 'PS', academic_code: 'PRE1' },
      },
    ];

    const grouped = groupClassesByCycle(aliases, []);
    expect(grouped[0].levels.map((level) => level.code)).toEqual(['PS', 'MS', 'GS']);
    expect(grouped[0].levels.map((level) => level.academic_code)).toEqual([
      'PRE1',
      'PRE2',
      'PRE3',
    ]);
  });

  it('detects active search and separates no-data from no-match', () => {
    expect(classesBrowserHasActiveQuery({})).toBe(false);
    expect(classesBrowserHasActiveQuery({ search: '  ' })).toBe(false);
    expect(classesBrowserHasActiveQuery({ search: 'p1' })).toBe(true);
    expect(classesBrowserHasActiveQuery({ academicYear: '2025-2026' })).toBe(true);
    expect(classesBrowserHasActiveQuery({ cycleId: 10 })).toBe(true);
    expect(classesBrowserHasActiveQuery({ levelId: 1 })).toBe(true);
    expect(classesBrowserHasActiveQuery({ status: 'active' })).toBe(true);
    expect(
      resolveClassesBrowserEmptyVariant({
        totalCount: 0,
        filteredCount: 0,
        hasActiveQuery: false,
      }),
    ).toBe('no-data');
    expect(
      resolveClassesBrowserEmptyVariant({
        totalCount: 2,
        filteredCount: 0,
        hasActiveQuery: true,
      }),
    ).toBe('no-match');
  });
});
