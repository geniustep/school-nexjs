import { describe, expect, it } from 'vitest';
import type { CycleOption, LevelContextOption } from '@/types/academic-context';
import type { AttendanceClassDetails, AttendanceOverviewClass } from './admin-attendance-operations-contract';
import {
  buildAttendanceClassBatchItems,
  buildAttendanceCycleOptions,
  buildAttendanceLevelOptions,
  buildAttendanceRosterDraft,
  classOperationAction,
  classShowsCorrectionAction,
  classShowsRegisteredState,
  classesForAttendanceCycle,
  classesForAttendanceLevel,
  filterAttendanceOperationClasses,
  hasAttendanceBatchConcurrencyFailure,
  levelsForAttendanceCycle,
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

  it('keeps normal recording distinct from correction and completed state', () => {
    expect(classOperationAction(classRow({ operation_status: 'not_started' }))).toBe('record');
    expect(classOperationAction(classRow({ operation_status: 'in_progress' }))).toBe('continue');

    const completed = classRow({
      operation_status: 'completed',
      allowed_actions: {
        can_view: true,
        can_open_class: true,
        can_record_today: true,
        can_correct: true,
      },
    });
    expect(classOperationAction(completed)).toBe('view');
    expect(classShowsRegisteredState(completed)).toBe(true);
    expect(classShowsCorrectionAction(completed)).toBe(true);

    const viewOnly = classRow({
      operation_status: 'completed',
      allowed_actions: {
        can_view: true,
        can_open_class: true,
        can_record_today: false,
        can_correct: false,
      },
    });
    expect(classShowsCorrectionAction(viewOnly)).toBe(false);
  });

  it('builds cycle-first hierarchy from the canonical academic context relation', () => {
    const rows = [
      classRow({ id: 1, name: '6AP-1', level: { id: 6, name: '6AP' } }),
      classRow({ id: 2, name: '6AP-2', level: { id: 6, name: '6AP' } }),
      classRow({ id: 3, name: '5AP-1', level: { id: 5, name: '5AP' } }),
      classRow({ id: 4, name: 'TC-1', level: { id: 10, name: 'TC' } }),
    ];
    const academicLevels: LevelContextOption[] = [
      { id: 5, name: '5AP', cycle: { id: 1, name: 'Primaire' } },
      { id: 6, name: '6AP', cycle: { id: 1, name: 'Primaire' } },
      { id: 10, name: 'TC', cycle: { id: 2, name: 'Collège' } },
    ];
    const academicCycles: CycleOption[] = [
      { id: 1, name: 'Primaire' },
      { id: 2, name: 'Collège' },
      { id: 3, name: 'Lycée' },
    ];

    const levels = buildAttendanceLevelOptions(rows, academicLevels);
    expect(levels).toEqual([
      { id: 5, name: '5AP', classCount: 1, cycleId: 1 },
      { id: 6, name: '6AP', classCount: 2, cycleId: 1 },
      { id: 10, name: 'TC', classCount: 1, cycleId: 2 },
    ]);
    expect(buildAttendanceCycleOptions(levels, academicCycles)).toEqual([
      { id: 2, name: 'Collège', classCount: 1 },
      { id: 1, name: 'Primaire', classCount: 3 },
    ]);
    expect(levelsForAttendanceCycle(levels, 1).map((level) => level.id)).toEqual([5, 6]);
    expect(levelsForAttendanceCycle(levels, 'all').map((level) => level.id)).toEqual([5, 6, 10]);
    expect(classesForAttendanceCycle(rows, 1, levels).map((row) => row.id)).toEqual([3, 1, 2]);
    expect(classesForAttendanceLevel(classesForAttendanceCycle(rows, 1, levels), 6).map((row) => row.id))
      .toEqual([1, 2]);
  });

  it('filters hierarchically by cycle then level/class, then presentation status/search', () => {
    const rows = [
      classRow({ id: 1, name: '6AP-1', level: { id: 6, name: '6AP' }, operation_status: 'completed' }),
      classRow({ id: 2, name: '6AP-2', level: { id: 6, name: '6AP' }, operation_status: 'not_started' }),
      classRow({ id: 3, name: '5AP-1', level: { id: 5, name: '5AP' }, operation_status: 'not_started' }),
      classRow({ id: 4, name: 'TC-1', level: { id: 10, name: 'TC' }, operation_status: 'not_started' }),
    ];
    const levels = buildAttendanceLevelOptions(rows, [
      { id: 5, name: '5AP', cycle: { id: 1, name: 'Primaire' } },
      { id: 6, name: '6AP', cycle: { id: 1, name: 'Primaire' } },
      { id: 10, name: 'TC', cycle: { id: 2, name: 'Collège' } },
    ]);
    const primaryRows = classesForAttendanceCycle(rows, 1, levels);

    expect(primaryRows.map((row) => row.id)).toEqual([3, 1, 2]);
    expect(filterAttendanceOperationClasses(primaryRows, '', 'all', 6, 'all').map((row) => row.id)).toEqual([1, 2]);
    expect(filterAttendanceOperationClasses(primaryRows, '', 'all', 6, 2).map((row) => row.id)).toEqual([2]);
    expect(filterAttendanceOperationClasses(primaryRows, '', 'not_started', 6, 'all').map((row) => row.id)).toEqual([2]);
    expect(filterAttendanceOperationClasses(primaryRows, '5AP', 'all', 'all', 'all').map((row) => row.id)).toEqual([3]);
    expect(classesForAttendanceCycle(rows, 'all', levels).map((row) => row.id)).toEqual([3, 1, 2, 4]);
  });

  it('recognizes batch concurrency conflicts without treating other failures as conflicts', () => {
    expect(hasAttendanceBatchConcurrencyFailure([{ error: 'attendance_concurrent_update' }])).toBe(true);
    expect(hasAttendanceBatchConcurrencyFailure([{ error: 'Student not in this class.' }])).toBe(false);
  });
});
