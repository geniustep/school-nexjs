import { describe, expect, it } from 'vitest';
import type { AttendanceClassDetails, AttendanceOverviewClass } from './admin-attendance-operations-contract';
import {
  buildAttendanceClassBatchItems,
  buildAttendanceRosterDraft,
  classOperationAction,
  filterAttendanceOperationClasses,
  hasAttendanceBatchConcurrencyFailure,
  markUnrecordedPresent,
} from './admin-attendance-operations-utils';

function details(): AttendanceClassDetails {
  return {
    date: '2026-09-26',
    class_id: 10,
    class_name: '6AP-1',
    level: { id: 6, name: '6AP' },
    roster_basis: 'active_operational_enrollment',
    recording_allowed: true,
    calendar_gate: {
      allowed: true,
      hard_blocked: false,
      provisional_only: false,
      closure_kind: null,
      status: 'open',
      causing_event: null,
      day_part: 'full_day',
    },
    recorded: [
      {
        id: 1,
        date: '2026-09-26',
        student: { id: 101, name: 'Amina' },
        class: { id: 10, name: '6AP-1' },
        status: 'late',
        period: 'full_day',
        note: null,
        recorded_by: { id: 5, name: 'Supervisor' },
        expected_write_date: '2026-09-26 08:00:00',
      },
    ],
    not_recorded: [{ id: 102, name: 'Youssef' }],
    summary: {
      present: 0,
      absent: 0,
      late: 1,
      left_early: 0,
      total_students: 2,
      recorded_students: 1,
      unrecorded_students: 1,
      recording_completion_pct: 50,
      attendance_rate: 0,
      absence_rate: 0,
    },
    allowed_actions: {
      can_view: true,
      can_record_today: true,
      can_correct: true,
    },
  };
}

function classRow(overrides: Partial<AttendanceOverviewClass> = {}): AttendanceOverviewClass {
  return {
    id: 10,
    name: '6AP-1',
    level: { id: 6, name: '6AP' },
    expected_students: 30,
    recorded_students: 10,
    unrecorded_students: 20,
    completion_pct: 33.3,
    operation_status: 'in_progress',
    counts: { present: 8, absent: 1, late: 1, left_early: 0 },
    attendance_rate: 80,
    absence_rate: 10,
    late_rate: 10,
    recorders: [],
    completed_by: null,
    completed_at: null,
    last_recorded_by: null,
    last_recorded_at: null,
    last_modified_by: null,
    last_modified_at: null,
    calendar_gate: {
      allowed: true,
      hard_blocked: false,
      provisional_only: false,
      closure_kind: null,
      status: 'open',
      causing_event: null,
      day_part: 'full_day',
    },
    allowed_actions: {
      can_view: true,
      can_open_class: true,
      can_record_today: true,
      can_correct: true,
    },
    ...overrides,
  };
}

describe('attendance operations center utilities', () => {
  it('keeps not-recorded students neutral instead of treating them as absent or present', () => {
    const roster = buildAttendanceRosterDraft(details());
    const missing = roster.find((row) => row.studentId === 102);
    expect(missing?.baselineStatus).toBeNull();
    expect(missing?.status).toBeNull();
    expect(buildAttendanceClassBatchItems(roster)).toEqual([]);
  });

  it('adds expected_missing only after an explicit status choice for an unrecorded student', () => {
    const roster = markUnrecordedPresent(buildAttendanceRosterDraft(details()));
    expect(buildAttendanceClassBatchItems(roster)).toEqual([
      { student_id: 102, status: 'present', expected_missing: true },
    ]);
  });

  it('preserves expected_write_date when changing an existing attendance record', () => {
    const roster = buildAttendanceRosterDraft(details()).map((row) =>
      row.studentId === 101 ? { ...row, status: 'present' as const } : row,
    );
    expect(buildAttendanceClassBatchItems(roster)).toEqual([
      {
        student_id: 101,
        status: 'present',
        expected_write_date: '2026-09-26 08:00:00',
      },
    ]);
  });

  it('uses backend operation_status and permissions for the primary class action', () => {
    expect(classOperationAction(classRow({ operation_status: 'not_started' }))).toBe('record');
    expect(classOperationAction(classRow({ operation_status: 'in_progress' }))).toBe('continue');
    expect(
      classOperationAction(
        classRow({
          operation_status: 'completed',
          allowed_actions: {
            can_view: true,
            can_open_class: true,
            can_record_today: false,
            can_correct: false,
          },
        }),
      ),
    ).toBe('view');
  });

  it('filters classes only for presentation without recomputing their backend state', () => {
    const rows = [
      classRow({ id: 1, name: '6AP-1', operation_status: 'completed' }),
      classRow({ id: 2, name: '5AP-2', operation_status: 'not_started' }),
    ];
    expect(filterAttendanceOperationClasses(rows, '5AP', 'all').map((row) => row.id)).toEqual([2]);
    expect(filterAttendanceOperationClasses(rows, '', 'completed').map((row) => row.id)).toEqual([1]);
  });

  it('recognizes batch concurrency conflicts without treating other failures as conflicts', () => {
    expect(hasAttendanceBatchConcurrencyFailure([{ error: 'attendance_concurrent_update' }])).toBe(true);
    expect(hasAttendanceBatchConcurrencyFailure([{ error: 'Student not in this class.' }])).toBe(false);
  });
});
