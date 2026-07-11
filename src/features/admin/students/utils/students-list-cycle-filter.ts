/**
 * Cycle filter for GET /admin/students.
 * Odoo accepts level_id / class_id / status / account filters but ignores cycle*.
 * When a cycle is selected without a level, the list expands to that cycle's
 * levels server-side (per level_id) and paginates the merged rows on the client.
 */

import { filterLevelsByCycle } from '@/features/admin/levels/utils/levels-list-utils';
import { STUDENT_LIST_PAGE_SIZE } from './student-search-query';
import type { StudentsListFilterValues } from './students-list-url';
import type { Level } from '@/types/class';
import type { Student } from '@/types/student';

/** Hard cap observed on GET /admin/students (requests above this are truncated). */
export const STUDENTS_LIST_API_PAGE_SIZE_CAP = 100;

export function studentsListUsesClientCycleFilter(
  state: Pick<StudentsListFilterValues, 'cycleCode' | 'levelId'>,
): boolean {
  return Boolean(state.cycleCode.trim() && !state.levelId.trim());
}

export function collectCycleLevelIds(levels: Level[], cycleCode: string): number[] {
  if (!cycleCode.trim()) return [];
  return filterLevelsByCycle(levels, cycleCode)
    .map((level) => level.id)
    .filter((id) => Number.isFinite(id) && id > 0);
}

export function studentBelongsToCycleLevelIds(
  student: Student,
  cycleLevelIds: ReadonlySet<number>,
): boolean {
  if (!cycleLevelIds.size) return false;
  const levelId = student.level?.id;
  return typeof levelId === 'number' && cycleLevelIds.has(levelId);
}

export function filterStudentsByCycleLevelIds(
  students: Student[],
  cycleLevelIds: ReadonlySet<number>,
): Student[] {
  if (!cycleLevelIds.size) return [];
  return students.filter((student) => studentBelongsToCycleLevelIds(student, cycleLevelIds));
}

export function mergeStudentsById(groups: Student[][]): Student[] {
  const seen = new Set<number>();
  const merged: Student[] = [];
  for (const group of groups) {
    for (const student of group) {
      if (seen.has(student.id)) continue;
      seen.add(student.id);
      merged.push(student);
    }
  }
  return merged;
}

export function paginateStudentsListClient<T>(
  rows: T[],
  page: number,
  pageSize = STUDENT_LIST_PAGE_SIZE,
): {
  rows: T[];
  pagination: { page: number; page_size: number; total_pages: number; total: number };
} {
  const total = rows.length;
  const total_pages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(page, 1), total_pages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    pagination: {
      page: safePage,
      page_size: pageSize,
      total_pages,
      total,
    },
  };
}
