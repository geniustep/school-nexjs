// Attendance resources — mirrors API_REPORT.md §3, §10.

import type { Ref } from './api';
import type { StudentNameFields } from './student';

// API attendance status values (Odoo API v1 contract).
// Final MVP statuses: present, absent, late, left_early.
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'left_early';

export type AttendancePeriod = 'full_day' | 'morning' | 'afternoon' | string;

export interface AttendanceAllowedActions {
  can_view: boolean;
  can_mark: boolean;
  can_correct: boolean;
}

export interface AttendanceRecord {
  id: number;
  date: string;
  student: { id: number } & StudentNameFields;
  class: Ref | null;
  status: AttendanceStatus;
  period: AttendancePeriod;
  /** Legacy note alias retained for compatibility. */
  note: string | null;
  excuse_reason?: string | null;
  notes?: string | null;
  recorded_by: Ref | null;
  recorded_date?: string | null;
  last_modified_at?: string | null;
  expected_write_date?: string | null;
  last_modified_by?: Ref | null;
  allowed_actions?: AttendanceAllowedActions;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  left_early: number;
  total: number;
  // Some payloads still surface these aggregate fields; kept optional so the
  // UI can render them when present without diverging from the core contract.
  total_recorded?: number;
  total_days?: number;
}

// Teacher batch submission — POST /teacher/classes/{id}/attendance/batch.
export interface AttendanceBatchItem {
  student_id: number;
  status: AttendanceStatus;
  note?: string;
  expected_write_date?: string;
  expected_missing?: boolean;
}

export interface AttendanceBatchRequest {
  date: string;
  items: AttendanceBatchItem[];
}

// Admin attendance create/correction — POST /admin/attendance/correct.
export interface AttendanceCorrectRequest {
  date: string;
  class_id: number;
  student_id: number;
  status: AttendanceStatus;
  note?: string;
  correction_reason?: string;
  expected_write_date?: string;
  expected_missing?: boolean;
}

export interface AttendanceBatchResult {
  saved: number;
  failed: number;
  items: { student_id: number; attendance_id: number; status: AttendanceStatus }[];
  errors: { student_id: number; error: string }[];
}

// Teacher "attendance today" view — Odoo 18.0.1.0.381.
// NOTE: The API returns `id` (not `student_id`) in the not_recorded array.
export interface AttendanceTodayStudent extends StudentNameFields {
  id: number;
  /** Compatibility only; Odoo 381 not_recorded entries do not set a status. */
  status?: AttendanceStatus;
}

export type AttendanceTeacherSheetState = 'not_started' | 'in_progress' | 'completed';

export interface AttendanceTeacherSheetOwner {
  teacher_id: number;
  name: string;
}

export interface AttendanceTeacherRecordingLock {
  locked: boolean;
  reason:
    | 'recorded_by_other_teacher'
    | 'attendance_sheet_completed'
    | 'existing_without_owner'
    | 'attendance_blocked_by_calendar'
    | string
    | null;
}

export interface AttendanceTeacherAllowedActions {
  can_view: boolean;
  can_record_today: boolean;
  can_continue: boolean;
}

export interface AttendanceTodayCalendarGate {
  allowed: boolean | null;
  hard_blocked: boolean | null;
  provisional_only: boolean | null;
  closure_kind: string | null;
  status: string | null;
  causing_event: unknown;
  day_part: string | null;
}

export interface AttendanceTodaySummary {
  present: number;
  absent: number;
  late: number;
  left_early: number;
  total_students: number;
}

export interface AttendanceToday {
  date: string;
  class_id: number;
  class_name: string;
  recording_allowed: boolean;
  sheet_state: AttendanceTeacherSheetState;
  sheet_owner: AttendanceTeacherSheetOwner | null;
  recording_lock: AttendanceTeacherRecordingLock;
  allowed_actions: AttendanceTeacherAllowedActions;
  calendar_gate: AttendanceTodayCalendarGate;
  recorded: AttendanceRecord[];
  not_recorded: AttendanceTodayStudent[];
  summary: AttendanceTodaySummary;
}
