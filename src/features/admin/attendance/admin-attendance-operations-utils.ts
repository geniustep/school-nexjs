import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { getStudentDisplayName } from '@/lib/utils/student';
import type {
  AttendanceClassBatchItem,
  AttendanceClassDetails,
  AttendanceOperationStatus,
  AttendanceOverviewClass,
} from './admin-attendance-operations-contract';

export type AttendanceClassFilter = 'all' | AttendanceOperationStatus;

export interface AttendanceRosterDraftRow {
  studentId: number;
  name: string;
  baselineStatus: AttendanceStatus | null;
  status: AttendanceStatus | null;
  baselineNote: string;
  note: string;
  expectedWriteDate?: string;
  expectedMissing: boolean;
  record: AttendanceRecord | null;
}

function normalizedNote(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function buildAttendanceRosterDraft(
  details: AttendanceClassDetails,
): AttendanceRosterDraftRow[] {
  const rows: AttendanceRosterDraftRow[] = [];
  const seen = new Set<number>();

  for (const record of details.recorded ?? []) {
    const studentId = record.student?.id;
    if (!studentId || seen.has(studentId)) continue;
    seen.add(studentId);
    const note = normalizedNote(record.notes ?? record.note);
    rows.push({
      studentId,
      name: getStudentDisplayName(record.student),
      baselineStatus: record.status,
      status: record.status,
      baselineNote: note,
      note,
      expectedWriteDate: record.expected_write_date ?? undefined,
      expectedMissing: false,
      record,
    });
  }

  for (const student of details.not_recorded ?? []) {
    if (!student.id || seen.has(student.id)) continue;
    seen.add(student.id);
    rows.push({
      studentId: student.id,
      name: getStudentDisplayName(student),
      baselineStatus: null,
      status: null,
      baselineNote: '',
      note: '',
      expectedMissing: true,
      record: null,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function isAttendanceRosterRowDirty(row: AttendanceRosterDraftRow): boolean {
  return row.status !== row.baselineStatus || normalizedNote(row.note) !== row.baselineNote;
}

export function buildAttendanceClassBatchItems(
  rows: AttendanceRosterDraftRow[],
): AttendanceClassBatchItem[] {
  return rows.flatMap((row) => {
    if (!isAttendanceRosterRowDirty(row) || !row.status) return [];
    const item: AttendanceClassBatchItem = {
      student_id: row.studentId,
      status: row.status,
    };
    const note = normalizedNote(row.note);
    if (note) item.note = note;
    if (row.expectedMissing) {
      item.expected_missing = true;
    } else if (row.expectedWriteDate) {
      item.expected_write_date = row.expectedWriteDate;
    }
    return [item];
  });
}

export function markUnrecordedPresent(
  rows: AttendanceRosterDraftRow[],
): AttendanceRosterDraftRow[] {
  return rows.map((row) =>
    row.baselineStatus === null && row.status === null
      ? { ...row, status: 'present' }
      : row,
  );
}

export function filterAttendanceOperationClasses(
  classes: AttendanceOverviewClass[],
  search: string,
  status: AttendanceClassFilter,
): AttendanceOverviewClass[] {
  const needle = search.trim().toLocaleLowerCase();
  return classes.filter((row) => {
    if (status !== 'all' && row.operation_status !== status) return false;
    if (!needle) return true;
    const haystack = `${row.name} ${row.level?.name ?? ''}`.toLocaleLowerCase();
    return haystack.includes(needle);
  });
}

export function classOperationAction(
  row: AttendanceOverviewClass,
): 'record' | 'continue' | 'review' | 'view' {
  if (row.allowed_actions.can_record_today) {
    if (row.operation_status === 'not_started') return 'record';
    if (row.operation_status === 'in_progress') return 'continue';
    return 'review';
  }
  if (row.allowed_actions.can_correct) return 'review';
  return 'view';
}

export function hasAttendanceBatchConcurrencyFailure(errors: Array<{ error: string }>): boolean {
  return errors.some((error) => error.error === 'attendance_concurrent_update');
}
