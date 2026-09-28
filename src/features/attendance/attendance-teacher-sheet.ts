import type { ApiErrorBody } from '@/types/api';
import type {
  AttendanceBatchItem,
  AttendanceStatus,
  AttendanceToday,
} from '@/types/attendance';
import { getStudentDisplayName } from '@/lib/utils/student';
import { buildTeacherAttendanceBatchItem } from './attendance-concurrency';

export type TeacherAttendanceSheetUiMode =
  | 'record'
  | 'continue'
  | 'locked_other'
  | 'completed'
  | 'blocked';

export interface TeacherAttendanceRosterRow {
  student_id: number;
  full_name: string;
  baseline_status: AttendanceStatus | null;
  status: AttendanceStatus | null;
  baseline_note: string;
  note: string;
  expected_write_date?: string;
  expected_missing: boolean;
}

function normalizedNote(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function buildTeacherAttendanceRoster(
  today: AttendanceToday,
  defaultUnrecordedStatus: AttendanceStatus | null = null,
): TeacherAttendanceRosterRow[] {
  const rows: TeacherAttendanceRosterRow[] = [];
  const seen = new Set<number>();

  for (const record of today.recorded ?? []) {
    if (!record.student?.id || seen.has(record.student.id)) continue;
    seen.add(record.student.id);
    const note = normalizedNote(record.notes ?? record.note);
    rows.push({
      student_id: record.student.id,
      full_name: getStudentDisplayName(record.student),
      baseline_status: record.status,
      status: record.status,
      baseline_note: note,
      note,
      expected_write_date: record.expected_write_date ?? undefined,
      expected_missing: false,
    });
  }

  for (const student of today.not_recorded ?? []) {
    if (!student.id || seen.has(student.id)) continue;
    seen.add(student.id);
    rows.push({
      student_id: student.id,
      full_name: getStudentDisplayName(student),
      baseline_status: null,
      status: defaultUnrecordedStatus,
      baseline_note: '',
      note: '',
      expected_missing: true,
    });
  }

  return rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function isTeacherAttendanceRowDirty(row: TeacherAttendanceRosterRow): boolean {
  return (
    row.status !== row.baseline_status
    || normalizedNote(row.note) !== row.baseline_note
  );
}

export function buildTeacherAttendanceBatchItems(
  rows: TeacherAttendanceRosterRow[],
): AttendanceBatchItem[] {
  return rows.flatMap((row) => {
    if (!row.status || !isTeacherAttendanceRowDirty(row)) return [];
    return [
      buildTeacherAttendanceBatchItem({
        studentId: row.student_id,
        status: row.status,
        note: row.note,
        expectedWriteDate: row.expected_write_date,
        expectedMissing: row.expected_missing,
      }),
    ];
  });
}

export function markTeacherAttendanceAllPresent(
  rows: TeacherAttendanceRosterRow[],
): TeacherAttendanceRosterRow[] {
  return rows.map((row) => ({ ...row, status: 'present' }));
}

export function countTeacherAttendanceRoster(
  rows: TeacherAttendanceRosterRow[],
): Record<AttendanceStatus | 'not_recorded', number> {
  const counts: Record<AttendanceStatus | 'not_recorded', number> = {
    present: 0,
    absent: 0,
    late: 0,
    left_early: 0,
    not_recorded: 0,
  };
  for (const row of rows) {
    if (row.status == null) counts.not_recorded += 1;
    else counts[row.status] += 1;
  }
  return counts;
}

export function teacherAttendanceSheetUiMode(
  today: AttendanceToday,
): TeacherAttendanceSheetUiMode {
  if (today.sheet_state === 'completed') return 'completed';
  if (today.recording_lock.locked) {
    if (today.recording_lock.reason === 'recorded_by_other_teacher') {
      return 'locked_other';
    }
    return 'blocked';
  }
  if (today.recording_allowed && today.allowed_actions.can_continue) return 'continue';
  if (today.recording_allowed && today.allowed_actions.can_record_today) return 'record';
  return 'blocked';
}

export function isAttendanceSheetLockedError(
  error: Pick<ApiErrorBody, 'code'> | null | undefined,
): boolean {
  return error?.code === 'attendance_sheet_locked';
}

export function attendanceSheetLockReason(
  error: Pick<ApiErrorBody, 'details'> | null | undefined,
): string | null {
  const reason = error?.details?.reason;
  return typeof reason === 'string' ? reason : null;
}
