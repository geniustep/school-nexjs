import { describe, expect, it } from 'vitest';
import type { AttendanceToday } from '@/types/attendance';
import {
  attendanceSheetLockReason,
  buildTeacherAttendanceBatchItems,
  buildTeacherAttendanceRoster,
  countTeacherAttendanceRoster,
  isAttendanceSheetLockedError,
  markTeacherAttendanceAllPresent,
  teacherAttendanceSheetUiMode,
} from './attendance-teacher-sheet';

function today(overrides: Partial<AttendanceToday> = {}): AttendanceToday {
  return {
    date: '2026-09-27',
    class_id: 10,
    class_name: 'CM2 A',
    recording_allowed: true,
    sheet_state: 'not_started',
    sheet_owner: null,
    recording_lock: { locked: false, reason: null },
    allowed_actions: {
      can_view: true,
      can_record_today: true,
      can_continue: false,
    },
    calendar_gate: {
      allowed: true,
      hard_blocked: false,
      provisional_only: false,
      closure_kind: null,
      status: 'open',
      causing_event: null,
      day_part: 'full_day',
    },
    recorded: [],
    not_recorded: [
      { id: 1, first_name: 'Aya', last_name: 'Amrani' },
      { id: 2, first_name: 'Youssef', last_name: 'Alami' },
    ],
    summary: {
      present: 0,
      absent: 0,
      late: 0,
      left_early: 0,
      total_students: 2,
    },
    ...overrides,
  };
}

describe('teacher attendance sheet 381 frontend contract', () => {
  it('defaults unrecorded students to present in an editable recording roster', () => {
    const rows = buildTeacherAttendanceRoster(today(), 'present');
    expect(rows.map((row) => row.status)).toEqual(['present', 'present']);
    expect(countTeacherAttendanceRoster(rows)).toMatchObject({
      present: 2,
      absent: 0,
      not_recorded: 0,
    });
    expect(buildTeacherAttendanceBatchItems(rows)).toEqual([
      { student_id: 1, status: 'present', expected_missing: true },
      { student_id: 2, status: 'present', expected_missing: true },
    ]);
  });

  it('keeps unrecorded students neutral when the screen is not editable', () => {
    const rows = buildTeacherAttendanceRoster(today());
    expect(rows.map((row) => row.status)).toEqual([null, null]);
    expect(buildTeacherAttendanceBatchItems(rows)).toEqual([]);
  });

  it('still supports explicitly marking a neutral roster present', () => {
    const rows = markTeacherAttendanceAllPresent(buildTeacherAttendanceRoster(today()));
    expect(countTeacherAttendanceRoster(rows)).toMatchObject({
      present: 2,
      absent: 0,
      not_recorded: 0,
    });
    expect(buildTeacherAttendanceBatchItems(rows)).toEqual([
      { student_id: 1, status: 'present', expected_missing: true },
      { student_id: 2, status: 'present', expected_missing: true },
    ]);
  });

  it('preserves recorded-row concurrency tokens and sends only dirty rows', () => {
    const data = today({
      sheet_state: 'in_progress',
      sheet_owner: { teacher_id: 7, name: 'Teacher A' },
      allowed_actions: { can_view: true, can_record_today: false, can_continue: true },
      recorded: [{
        id: 90,
        date: '2026-09-27',
        student: { id: 1, first_name: 'Aya', last_name: 'Amrani' },
        class: { id: 10, name: 'CM2 A' },
        status: 'absent',
        period: 'full_day',
        note: null,
        notes: null,
        recorded_by: { id: 12, name: 'Teacher A' },
        expected_write_date: '2026-09-27 08:30:00',
      }],
      not_recorded: [{ id: 2, first_name: 'Youssef', last_name: 'Alami' }],
      summary: { present: 0, absent: 1, late: 0, left_early: 0, total_students: 2 },
    });
    const rows = buildTeacherAttendanceRoster(data).map((row) =>
      row.student_id === 1 ? { ...row, status: 'present' as const } : row,
    );
    expect(buildTeacherAttendanceBatchItems(rows)).toEqual([
      {
        student_id: 1,
        status: 'present',
        expected_write_date: '2026-09-27 08:30:00',
      },
    ]);
  });

  it('maps backend ownership states without role-name inference', () => {
    expect(teacherAttendanceSheetUiMode(today())).toBe('record');
    expect(teacherAttendanceSheetUiMode(today({
      sheet_state: 'in_progress',
      sheet_owner: { teacher_id: 7, name: 'Teacher A' },
      allowed_actions: { can_view: true, can_record_today: false, can_continue: true },
    }))).toBe('continue');
    expect(teacherAttendanceSheetUiMode(today({
      recording_allowed: false,
      sheet_state: 'in_progress',
      sheet_owner: { teacher_id: 8, name: 'Teacher B' },
      recording_lock: { locked: true, reason: 'recorded_by_other_teacher' },
      allowed_actions: { can_view: true, can_record_today: false, can_continue: false },
    }))).toBe('locked_other');
    expect(teacherAttendanceSheetUiMode(today({
      recording_allowed: false,
      sheet_state: 'completed',
      sheet_owner: { teacher_id: 7, name: 'Teacher A' },
      recording_lock: { locked: true, reason: 'attendance_sheet_completed' },
      allowed_actions: { can_view: true, can_record_today: false, can_continue: false },
    }))).toBe('completed');
  });

  it('recognizes 409 attendance_sheet_locked and preserves the backend reason', () => {
    expect(isAttendanceSheetLockedError({ code: 'attendance_sheet_locked' })).toBe(true);
    expect(isAttendanceSheetLockedError({ code: 'conflict' })).toBe(false);
    expect(attendanceSheetLockReason({ details: { reason: 'recorded_by_other_teacher' } }))
      .toBe('recorded_by_other_teacher');
  });
});
