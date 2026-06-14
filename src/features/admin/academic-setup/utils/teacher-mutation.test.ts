import { describe, expect, it } from 'vitest';
import { extractTeacherFromMutation, extractTeacherIdFromMutation } from './teacher-mutation';

describe('extractTeacherFromMutation', () => {
  it('reads teacher from wrapped item payload', () => {
    const teacher = {
      id: 12,
      name: 'Teacher',
      code: 'T1',
      phone: null,
      email: null,
      classes: [],
      subjects: [],
      status: 'active',
      qualification: null,
      specialization: null,
    };
    expect(extractTeacherFromMutation({ item: teacher })).toEqual(teacher);
    expect(extractTeacherIdFromMutation({ item: teacher })).toBe(12);
  });

  it('reads teacher from flat payload', () => {
    const teacher = {
      id: 15,
      name: 'Flat',
      code: null,
      phone: null,
      email: null,
      classes: [],
      subjects: [],
      status: 'active',
      qualification: null,
      specialization: null,
    };
    expect(extractTeacherFromMutation(teacher)).toEqual(teacher);
  });
});
