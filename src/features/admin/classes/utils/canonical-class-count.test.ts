import { describe, expect, it } from 'vitest';
import type { SchoolClass } from '@/types/class';
import {
  canonicalClassStudentCount,
  canonicalizeClassStudentCounts,
} from './canonical-class-count';

function sample(overrides: Partial<SchoolClass> = {}): SchoolClass {
  return {
    id: 1,
    name: '1APG-1',
    code: '2026-P1-1APG-1',
    level: { id: 77, name: 'الأولى ابتدائي' },
    academic_year: 'raqeem 2026-2027',
    student_count: 30,
    capacity: 30,
    teachers: [],
    subjects: [],
    status: 'active',
    ...overrides,
  };
}

describe('canonical class student count', () => {
  it('prefers canonical assigned_count from annual enrollments', () => {
    const cls = { ...sample(), assigned_count: 39 } as SchoolClass;
    expect(canonicalClassStudentCount(cls)).toBe(39);
  });

  it('falls back to legacy student_count when assigned_count is absent', () => {
    expect(canonicalClassStudentCount(sample({ student_count: 11 }))).toBe(11);
  });

  it('normalizes class-list rows before the classes browser renders occupancy', () => {
    const classes = [
      { ...sample({ id: 1, student_count: 30, capacity: 30 }), assigned_count: 39 },
      { ...sample({ id: 2, student_count: 11, capacity: 40 }), assigned_count: 11 },
    ] as SchoolClass[];

    expect(canonicalizeClassStudentCounts(classes).map((cls) => cls.student_count)).toEqual([39, 11]);
  });
});
