import { describe, expect, it } from 'vitest';
import type { SchoolClass } from '@/types/class';
import { resolveGuidedAssignmentClasses } from './assignment-class-options';

const classes: SchoolClass[] = [
  {
    id: 40,
    name: '6APG-2',
    code: '6APG-2',
    display_alias: 'السادس ابتدائي · 2',
    level: {
      id: 5,
      name: '6AP',
      cycle: { id: 2, name: 'Primary', code: 'P' },
    },
    academic_year: '2026-2027',
    academic_year_id: 1,
    student_count: 0,
    capacity: null,
    teachers: [],
    subjects: [],
    status: 'active',
  },
  {
    id: 41,
    name: '5APG-1',
    code: '5APG-1',
    level: {
      id: 4,
      name: '5AP',
      cycle: { id: 2, name: 'Primary', code: 'P' },
    },
    academic_year: '2026-2027',
    academic_year_id: 1,
    student_count: 0,
    capacity: null,
    teachers: [],
    subjects: [],
    status: 'active',
  },
];

describe('resolveGuidedAssignmentClasses', () => {
  it('uses canonical page classes when Academic Context returns no classes', () => {
    const result = resolveGuidedAssignmentClasses(
      classes,
      [],
      { cycleId: '2', levelId: '5' },
      1,
    );

    expect(result.map((item) => item.id)).toEqual([40]);
  });

  it('keeps the selected academic year isolated', () => {
    const result = resolveGuidedAssignmentClasses(
      [
        ...classes,
        { ...classes[0], id: 42, academic_year_id: 2, name: '6APG-old' },
      ],
      [],
      { cycleId: '2', levelId: '5' },
      1,
    );

    expect(result.map((item) => item.id)).toEqual([40]);
  });
});
