import { describe, expect, it } from 'vitest';
import {
  assignmentPairKey,
  createEmptyAssignmentDraft,
  findDuplicateAssignmentKey,
  normalizeAssignmentDrafts,
  teachingAssignmentToDraft,
} from './teacher-assignments';
import type { TeachingAssignment } from '@/types/academic-setup';

describe('teacher assignment drafts', () => {
  it('detects duplicate class_id + subject_id pairs', () => {
    const duplicate = findDuplicateAssignmentKey([
      { key: 'a', classId: 10, subjectId: 20, weeklyHours: 2 },
      { key: 'b', classId: 10, subjectId: 20, weeklyHours: 3 },
    ]);
    expect(duplicate).toBe(assignmentPairKey(10, 20));
  });

  it('ignores incomplete rows when checking duplicates', () => {
    expect(
      findDuplicateAssignmentKey([
        { key: 'a', classId: 10, subjectId: 0, weeklyHours: 2 },
        { key: 'b', classId: 10, subjectId: 0, weeklyHours: 2 },
      ]),
    ).toBeNull();
  });

  it('does not create cartesian product rows implicitly', () => {
    const rows = normalizeAssignmentDrafts([
      { key: 'a', classId: 1, subjectId: 10, weeklyHours: 2 },
      { key: 'b', classId: 2, subjectId: 20, weeklyHours: 3 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => assignmentPairKey(row.classId, row.subjectId))).toEqual([
      '1:10',
      '2:20',
    ]);
  });

  it('maps existing teaching assignments without losing ids', () => {
    const assignment = {
      id: 99,
      class: { id: 5, name: 'P4A' },
      subject: { id: 8, name: 'Math' },
      weekly_hours: 4,
    } as TeachingAssignment;
    expect(teachingAssignmentToDraft(assignment)).toEqual({
      key: 'existing-99',
      assignmentId: 99,
      classId: 5,
      subjectId: 8,
      weeklyHours: 4,
    });
  });

  it('creates unique draft keys', () => {
    const first = createEmptyAssignmentDraft();
    const second = createEmptyAssignmentDraft();
    expect(first.key).not.toBe(second.key);
  });
});
