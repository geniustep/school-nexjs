import { describe, expect, it } from 'vitest';
import { filterClassesForEnrollment, normalizeStudentOptions } from './student-options';

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
  it('filters classes by level id', () => {
    const classes = [
      { id: 1, name: 'A', level: { id: 5, name: 'L1' } },
      { id: 2, name: 'B', level: { id: 6, name: 'L2' } },
    ];
    expect(filterClassesForEnrollment(classes, '5')).toHaveLength(1);
    expect(filterClassesForEnrollment(classes, '5')[0].id).toBe(1);
  });
});
