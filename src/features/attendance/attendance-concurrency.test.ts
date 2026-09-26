import { describe, expect, it } from 'vitest';
import {
  buildAdminAttendanceMutationRequest,
  buildTeacherAttendanceBatchItem,
  isAttendanceConcurrencyError,
} from './attendance-concurrency';
import type { AttendanceRecord } from '@/types/attendance';

const record: AttendanceRecord = {
  id: 44,
  date: '2026-09-23',
  student: { id: 7, first_name: 'Aya', last_name: 'Amrani' },
  class: { id: 3, name: 'CM2 A' },
  status: 'absent',
  period: 'full_day',
  note: 'legacy',
  notes: 'ordinary note',
  recorded_by: { id: 9, name: 'Teacher' },
  expected_write_date: '2026-09-23 09:14:20',
};

describe('attendance concurrency contract', () => {
  it('uses expected_missing for a new admin record and never sends a correction reason', () => {
    expect(
      buildAdminAttendanceMutationRequest({
        date: '2026-09-23',
        classId: 3,
        studentId: 7,
        status: 'late',
        note: 'Bus delay',
        correctionReason: 'must not be sent',
        record: null,
      }),
    ).toEqual({
      date: '2026-09-23',
      class_id: 3,
      student_id: 7,
      status: 'late',
      note: 'Bus delay',
      expected_missing: true,
    });
  });

  it('uses expected_write_date and separates note from correction_reason', () => {
    expect(
      buildAdminAttendanceMutationRequest({
        date: '2026-09-23',
        classId: 3,
        studentId: 7,
        status: 'present',
        note: 'Ordinary note',
        correctionReason: 'Teacher confirmed presence',
        record,
      }),
    ).toEqual({
      date: '2026-09-23',
      class_id: 3,
      student_id: 7,
      status: 'present',
      note: 'Ordinary note',
      correction_reason: 'Teacher confirmed presence',
      expected_write_date: '2026-09-23 09:14:20',
    });
  });

  it('wires teacher recorded and not-recorded preconditions independently', () => {
    expect(
      buildTeacherAttendanceBatchItem({
        studentId: 7,
        status: 'present',
        expectedWriteDate: '2026-09-23 09:14:20',
      }),
    ).toEqual({
      student_id: 7,
      status: 'present',
      expected_write_date: '2026-09-23 09:14:20',
    });

    expect(
      buildTeacherAttendanceBatchItem({
        studentId: 8,
        status: 'absent',
        expectedMissing: true,
      }),
    ).toEqual({
      student_id: 8,
      status: 'absent',
      expected_missing: true,
    });
  });

  it('recognizes the backend concurrency code without conflating generic conflicts', () => {
    expect(isAttendanceConcurrencyError({ code: 'attendance_concurrent_update' })).toBe(true);
    expect(isAttendanceConcurrencyError({ code: 'conflict' })).toBe(false);
  });
});
