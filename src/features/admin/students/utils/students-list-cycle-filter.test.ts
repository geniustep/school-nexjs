import { describe, expect, it } from 'vitest';
import type { Level } from '@/types/class';
import type { Student } from '@/types/student';
import { STUDENT_LIST_PAGE_SIZE } from './student-search-query';
import {
  collectCycleLevelIds,
  filterStudentsByCycleLevelIds,
  mergeStudentsById,
  paginateStudentsListClient,
  studentBelongsToCycleLevelIds,
  studentsListUsesClientCycleFilter,
} from './students-list-cycle-filter';

function levelRow(id: number, cycleCode: string): Level {
  return {
    id,
    name: `L${id}`,
    code: `C${id}`,
    cycle: { id: cycleCode.length, code: cycleCode, name: cycleCode },
  } as Level;
}

function studentRow(id: number, levelId: number | null): Student {
  return {
    id,
    code: `S${id}`,
    level: levelId == null ? null : { id: levelId, name: `L${levelId}` },
    class: null,
    status: 'active',
    gender: null,
    date_of_birth: null,
    admission_date: null,
    email: null,
    phone: null,
  };
}

describe('studentsListUsesClientCycleFilter', () => {
  it('is active only when cycle is set without a level', () => {
    expect(studentsListUsesClientCycleFilter({ cycleCode: 'primary', levelId: '' })).toBe(true);
    expect(studentsListUsesClientCycleFilter({ cycleCode: 'primary', levelId: '77' })).toBe(false);
    expect(studentsListUsesClientCycleFilter({ cycleCode: '', levelId: '' })).toBe(false);
    expect(studentsListUsesClientCycleFilter({ cycleCode: '', levelId: '77' })).toBe(false);
  });
});

describe('collectCycleLevelIds', () => {
  it('returns level ids belonging to the cycle', () => {
    const levels = [
      levelRow(77, 'primary'),
      levelRow(176, 'middle_school'),
      levelRow(2442, 'primary'),
    ];
    expect(collectCycleLevelIds(levels, 'primary')).toEqual([77, 2442]);
    expect(collectCycleLevelIds(levels, 'middle_school')).toEqual([176]);
    expect(collectCycleLevelIds(levels, '')).toEqual([]);
  });
});

describe('filterStudentsByCycleLevelIds', () => {
  it('keeps students whose level id is in the cycle set', () => {
    const ids = new Set([77, 2442]);
    const students = [studentRow(1, 77), studentRow(2, 176), studentRow(3, null), studentRow(4, 2442)];
    expect(filterStudentsByCycleLevelIds(students, ids).map((s) => s.id)).toEqual([1, 4]);
    expect(studentBelongsToCycleLevelIds(students[1]!, ids)).toBe(false);
  });
});

describe('mergeStudentsById', () => {
  it('dedupes by student id across groups', () => {
    expect(
      mergeStudentsById([
        [studentRow(1, 77), studentRow(2, 77)],
        [studentRow(2, 77), studentRow(3, 2442)],
      ]).map((s) => s.id),
    ).toEqual([1, 2, 3]);
  });
});

describe('paginateStudentsListClient', () => {
  it('slices rows and reports pagination meta', () => {
    const rows = Array.from({ length: 25 }, (_, i) => studentRow(i + 1, 77));
    const page1 = paginateStudentsListClient(rows, 1);
    const page2 = paginateStudentsListClient(rows, 2);
    expect(page1.rows).toHaveLength(STUDENT_LIST_PAGE_SIZE);
    expect(page2.rows).toHaveLength(5);
    expect(page2.pagination).toEqual({
      page: 2,
      page_size: STUDENT_LIST_PAGE_SIZE,
      total_pages: 2,
      total: 25,
    });
  });
});
