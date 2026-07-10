import { describe, expect, it } from 'vitest';
import type { Level, SchoolClass } from '@/types/class';
import {
  buildClassLevelGroups,
  classesBrowserHasActiveQuery,
  computeClassesOverview,
  filterClassesForSearch,
  groupClassesByCycle,
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

  it('detects active search and separates no-data from no-match', () => {
    expect(classesBrowserHasActiveQuery({})).toBe(false);
    expect(classesBrowserHasActiveQuery({ search: '  ' })).toBe(false);
    expect(classesBrowserHasActiveQuery({ search: 'p1' })).toBe(true);
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
