// Attendance resources — mirrors API_REPORT.md §3, §10.

import type { Ref } from './api';

// API values (DB `excused` is surfaced as `excused_absence`). See §10.
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused_absence';

export type AttendancePeriod = 'full_day' | 'morning' | 'afternoon' | string;

export interface AttendanceRecord {
  id: number;
  date: string;
  student: { id: number; full_name: string };
  class: Ref | null;
  status: AttendanceStatus;
  period: AttendancePeriod;
  note: string | null;
  recorded_by: Ref | null;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused_absence: number;
  total_recorded?: number;
  total_days?: number;
}

// Teacher batch submission — POST /teacher/classes/{id}/attendance/batch.
export interface AttendanceBatchItem {
  student_id: number;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceBatchRequest {
  date: string;
  items: AttendanceBatchItem[];
}

export interface AttendanceBatchResult {
  saved: number;
  failed: number;
  items: { student_id: number; attendance_id: number; status: AttendanceStatus }[];
  errors: { student_id: number; error: string }[];
}

// Teacher "attendance today" view.
export interface AttendanceTodayStudent {
  student_id: number;
  full_name: string;
  status?: AttendanceStatus;
}

export interface AttendanceToday {
  recorded: AttendanceRecord[];
  not_recorded: AttendanceTodayStudent[];
  summary: AttendanceSummary;
}
