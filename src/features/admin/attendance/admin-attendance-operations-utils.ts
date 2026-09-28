import type { CycleOption, LevelContextOption } from '@/types/academic-context';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { getStudentDisplayName } from '@/lib/utils/student';
import type {
  AttendanceClassBatchItem,
  AttendanceClassDetails,
  AttendanceOperationStatus,
  AttendanceOverviewClass,
} from './admin-attendance-operations-contract';

export type AttendanceClassFilter = 'all' | AttendanceOperationStatus;
export type AttendanceCycleFilter = 'all' | number;
export type AttendanceLevelFilter = 'all' | number;
export type AttendanceClassIdFilter = 'all' | number;

export interface AttendanceCycleOption {
  id: number;
  name: string;
  classCount: number;
}

export interface AttendanceLevelOption {
  id: number;
  name: string;
  classCount: number;
  cycleId: number | null;
}

export function buildAttendanceLevelOptions(
  classes: AttendanceOverviewClass[],
  academicLevels: LevelContextOption[] = [],
): AttendanceLevelOption[] {
  const cycleByLevel = new Map(
    academicLevels.map((level) => [level.id, level.cycle?.id ?? null] as const),
  );
  const levels = new Map<number, AttendanceLevelOption>();
  for (const row of classes) {
    if (!row.level) continue;
    const current = levels.get(row.level.id);
    if (current) {
      current.classCount += 1;
    } else {
      levels.set(row.level.id, {
        id: row.level.id,
        name: row.level.name,
        classCount: 1,
        cycleId: cycleByLevel.get(row.level.id) ?? null,
      });
    }
  }
  return [...levels.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildAttendanceCycleOptions(
  levels: AttendanceLevelOption[],
  academicCycles: CycleOption[],
): AttendanceCycleOption[] {
  const classCountByCycle = new Map<number, number>();
  for (const level of levels) {
    if (level.cycleId == null) continue;
    classCountByCycle.set(
      level.cycleId,
      (classCountByCycle.get(level.cycleId) ?? 0) + level.classCount,
    );
  }

  return academicCycles
    .flatMap((cycle) => {
      const classCount = classCountByCycle.get(cycle.id) ?? 0;
      return classCount > 0
        ? [{ id: cycle.id, name: cycle.name, classCount }]
        : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function levelsForAttendanceCycle(
  levels: AttendanceLevelOption[],
  cycle: AttendanceCycleFilter,
): AttendanceLevelOption[] {
  if (cycle === 'all') return levels;
  return levels.filter((level) => level.cycleId === cycle);
}

export function classesForAttendanceCycle(
  classes: AttendanceOverviewClass[],
  cycle: AttendanceCycleFilter,
  levels: AttendanceLevelOption[],
): AttendanceOverviewClass[] {
  if (cycle === 'all') {
    return [...classes].sort((a, b) => a.name.localeCompare(b.name));
  }
  const allowedLevelIds = new Set(
    levels
      .filter((level) => level.cycleId === cycle)
      .map((level) => level.id),
  );
  return classes
    .filter((row) => row.level != null && allowedLevelIds.has(row.level.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function classesForAttendanceLevel(
  classes: AttendanceOverviewClass[],
  level: AttendanceLevelFilter,
): AttendanceOverviewClass[] {
  return classes
    .filter((row) => level === 'all' || row.level?.id === level)
    .sort((a, b) => a.name.localeCompare(b.name));
}

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
  defaultUnrecordedStatus: AttendanceStatus | null = null,
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
      status: defaultUnrecordedStatus,
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
  level: AttendanceLevelFilter = 'all',
  classId: AttendanceClassIdFilter = 'all',
): AttendanceOverviewClass[] {
  const needle = search.trim().toLocaleLowerCase();
  return classes.filter((row) => {
    if (level !== 'all' && row.level?.id !== level) return false;
    if (classId !== 'all' && row.id !== classId) return false;
    if (status !== 'all' && row.operation_status !== status) return false;
    if (!needle) return true;
    const haystack = `${row.name} ${row.level?.name ?? ''}`.toLocaleLowerCase();
    return haystack.includes(needle);
  });
}

export function classOperationAction(
  row: AttendanceOverviewClass,
): 'record' | 'continue' | 'view' {
  if (
    row.allowed_actions.can_record_today
    && row.operation_status === 'not_started'
  ) {
    return 'record';
  }
  if (
    row.allowed_actions.can_record_today
    && row.operation_status === 'in_progress'
  ) {
    return 'continue';
  }
  return 'view';
}

export function classShowsRegisteredState(row: AttendanceOverviewClass): boolean {
  return row.operation_status === 'completed';
}

export function classShowsCorrectionAction(row: AttendanceOverviewClass): boolean {
  return Boolean(
    row.allowed_actions.can_correct
    && row.operation_status !== 'empty',
  );
}

export function hasAttendanceBatchConcurrencyFailure(errors: Array<{ error: string }>): boolean {
  return errors.some((error) => error.error === 'attendance_concurrent_update');
}
