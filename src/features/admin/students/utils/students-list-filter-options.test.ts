import { describe, expect, it } from 'vitest';
import {
  buildCycleOptions,
  filterLevelsForStudentsList,
  filterSchoolClassesByLevel,
  isLevelInCycle,
  isSchoolClassInLevel,
  resolveCycleLabel,
  sortSchoolClassesForFilter,
} from './students-list-filter-options';
import type { Level, SchoolClass } from '@/types/class';

function classRow(id: number, levelId: number, name: string): SchoolClass {
  return {
    id,
    name,
    code: null,
    level: { id: levelId, name: `L${levelId}` },
    academic_year: null,
    student_count: 0,
    capacity: null,
    teachers: [],
    subjects: [],
    status: 'active',
  };
}

function levelRow(id: number, code: string, cycleCode: string, cycleName: string): Level {
  return {
    id,
    name: code,
    code,
    cycle: { id: cycleCode.length, code: cycleCode, name: cycleName },
    active: true,
  };
}

describe('students-list-filter-options', () => {
  const classes = [classRow(1, 10, 'P6B'), classRow(2, 10, 'P6A'), classRow(3, 20, 'H1A')];
  const levels = [
    levelRow(10, 'P6', 'primary', 'ابتدائي'),
    levelRow(20, 'H1', 'high_school', 'تأهيلي'),
    levelRow(30, 'P1', 'primary', 'ابتدائي'),
  ];

  it('filters classes by level id', () => {
    expect(filterSchoolClassesByLevel(classes, '10').map((c) => c.id)).toEqual([1, 2]);
    expect(filterSchoolClassesByLevel(classes, '')).toEqual([]);
  });

  it('checks class membership in level scope', () => {
    expect(isSchoolClassInLevel('2', classes, '10')).toBe(true);
    expect(isSchoolClassInLevel('3', classes, '10')).toBe(false);
  });

  it('builds unique sorted cycles from levels', () => {
    expect(buildCycleOptions(levels).map((cycle) => cycle.code)).toEqual(['primary', 'high_school']);
  });

  it('filters and sorts levels within a cycle', () => {
    expect(filterLevelsForStudentsList(levels, 'primary').map((level) => level.id)).toEqual([30, 10]);
  });

  it('checks level membership in cycle scope', () => {
    expect(isLevelInCycle('10', levels, 'primary')).toBe(true);
    expect(isLevelInCycle('20', levels, 'primary')).toBe(false);
  });

  it('resolves cycle label from options', () => {
    const cycles = buildCycleOptions(levels);
    expect(resolveCycleLabel(cycles, 'primary')).toBe('ابتدائي');
  });

  it('sorts classes by display label', () => {
    expect(sortSchoolClassesForFilter(classes).map((c) => c.name)).toEqual(['H1A', 'P6A', 'P6B']);
  });
});
