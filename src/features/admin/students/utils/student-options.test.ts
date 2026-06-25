import { describe, expect, it } from 'vitest';
import {
  buildEnrollmentClassScope,
  filterClassesForEnrollment,
  isEnrollmentClassIdInScope,
  normalizeStudentOptions,
} from './student-options';

describe('normalizeStudentOptions', () => {
  it('maps API payload keys', () => {
    const options = normalizeStudentOptions({
      gender: [{ value: 'male', label: 'Male' }],
      student_status: [{ value: 'active', label: 'Active' }],
      nationalities: [{ id: 1, name: 'Morocco', code: 'MA' }],
      classes: [{ id: 10, name: 'A', level: { id: 5, name: 'L1' } }],
    });
    expect(options?.genders).toHaveLength(1);
    expect(options?.studentStatuses[0].value).toBe('active');
    expect(options?.nationalities[0].code).toBe('MA');
  });
});

describe('filterClassesForEnrollment', () => {
  const classes = [
    { id: 1, name: 'A', level: { id: 5, name: 'L1' }, school_id: 10, academic_year_id: 2026 },
    { id: 2, name: 'B', level: { id: 6, name: 'L2' }, school_id: 10, academic_year_id: 2026 },
    { id: 3, name: 'C', level: { id: 5, name: 'L1' }, school_id: 99, academic_year_id: 2026 },
    { id: 4, name: 'D', level: { id: 5, name: 'L1' }, school_id: 10, academic_year_id: 2025 },
  ];

  it('filters classes by level id', () => {
    expect(filterClassesForEnrollment(classes, '5')).toHaveLength(3);
    expect(filterClassesForEnrollment(classes, '5')[0].id).toBe(1);
  });

  it('returns empty list when level is missing', () => {
    expect(filterClassesForEnrollment(classes, '')).toHaveLength(0);
    expect(filterClassesForEnrollment(classes, buildEnrollmentClassScope('', '2026', 10))).toHaveLength(0);
  });

  it('filters by school and academic year when scope is provided', () => {
    const scope = buildEnrollmentClassScope('5', '2026', 10);
    expect(filterClassesForEnrollment(classes, scope)).toEqual([
      { id: 1, name: 'A', level: { id: 5, name: 'L1' }, school_id: 10, academic_year_id: 2026 },
    ]);
  });

  it('allows classes without school_id or academic_year_id metadata', () => {
    const loose = [{ id: 7, name: 'Open', level: { id: 5, name: 'L1' } }];
    const scope = buildEnrollmentClassScope('5', '2026', 10);
    expect(filterClassesForEnrollment(loose, scope)).toHaveLength(1);
  });
});

describe('isEnrollmentClassIdInScope', () => {
  const classes = [
    { id: 1, name: 'A', level: { id: 5, name: 'L1' }, school_id: 10, academic_year_id: 2026 },
    { id: 3, name: 'C', level: { id: 5, name: 'L1' }, school_id: 99, academic_year_id: 2026 },
  ];

  it('returns true only for classes in active school/year/level scope', () => {
    const scope = buildEnrollmentClassScope('5', '2026', 10);
    expect(isEnrollmentClassIdInScope('1', classes, scope)).toBe(true);
    expect(isEnrollmentClassIdInScope('3', classes, scope)).toBe(false);
  });

  it('returns false when level is missing', () => {
    const scope = buildEnrollmentClassScope('', '2026', 10);
    expect(isEnrollmentClassIdInScope('1', classes, scope)).toBe(false);
  });
});
