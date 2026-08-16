import { describe, expect, it } from 'vitest';
import type { TeachingAssignment } from '@/types/academic-setup';
import { getHomeworkTeacherOptions } from './homework-form-options';

function assignment(
  id: number,
  teacherId: number,
  teacherName: string,
  active = true,
): TeachingAssignment {
  return {
    id,
    active,
    state: active ? 'active' : 'ended',
    role: 'main',
    weekly_hours: 0,
    school: { id: 3, name: 'School' },
    class: { id: 2058, name: '6APG-1' },
    subject: { id: 1885, name: 'Subject' },
    teacher: { id: teacherId, name: teacherName },
  };
}

describe('getHomeworkTeacherOptions', () => {
  it('keeps only active teachers assigned to the selected class and subject result', () => {
    expect(
      getHomeworkTeacherOptions([
        assignment(1, 1473, 'سلمى الحسني'),
        assignment(2, 1500, 'أحمد العلوي', false),
      ]),
    ).toEqual([{ id: 1473, name: 'سلمى الحسني' }]);
  });

  it('deduplicates the same teacher across active assignment rows', () => {
    expect(
      getHomeworkTeacherOptions([
        assignment(1, 1473, 'سلمى الحسني'),
        assignment(2, 1473, 'سلمى الحسني'),
      ]),
    ).toEqual([{ id: 1473, name: 'سلمى الحسني' }]);
  });
});
