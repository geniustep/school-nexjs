import type { ApiErrorBody } from '@/types/api';
import type {
  AttendanceBatchItem,
  AttendanceCorrectRequest,
  AttendanceRecord,
  AttendanceStatus,
} from '@/types/attendance';

function optionalText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function buildAdminAttendanceMutationRequest(input: {
  date: string;
  classId: number;
  studentId: number;
  status: AttendanceStatus;
  note?: string;
  correctionReason?: string;
  record: AttendanceRecord | null;
}): AttendanceCorrectRequest {
  const payload: AttendanceCorrectRequest = {
    date: input.date,
    class_id: input.classId,
    student_id: input.studentId,
    status: input.status,
  };

  const note = optionalText(input.note);
  if (note) payload.note = note;

  if (input.record) {
    if (input.record.expected_write_date) {
      payload.expected_write_date = input.record.expected_write_date;
    }
    const reason = optionalText(input.correctionReason);
    if (reason) payload.correction_reason = reason;
  } else {
    payload.expected_missing = true;
  }

  return payload;
}

export function buildTeacherAttendanceBatchItem(input: {
  studentId: number;
  status: AttendanceStatus;
  note?: string;
  expectedWriteDate?: string | null;
  expectedMissing?: boolean;
}): AttendanceBatchItem {
  const item: AttendanceBatchItem = {
    student_id: input.studentId,
    status: input.status,
  };
  const note = optionalText(input.note);
  if (note) item.note = note;
  if (input.expectedWriteDate) item.expected_write_date = input.expectedWriteDate;
  if (input.expectedMissing) item.expected_missing = true;
  return item;
}

export function isAttendanceConcurrencyError(
  error: Pick<ApiErrorBody, 'code'> | null | undefined,
): boolean {
  return error?.code === 'attendance_concurrent_update';
}
