// Attendance resources — mirrors API_REPORT.md §3, §10.

import type { Ref } from './api';

// API attendance status values (Odoo API v1 contract).
// Final MVP statuses: present, absent, late, left_early.
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'left_early';

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
}

export interface AttendanceBatchRequest {
  date: string;
  items: AttendanceBatchItem[];
}

// Admin past-date correction — POST /admin/attendance/correct.
export interface AttendanceCorrectRequest {
  date: string;
  class_id: number;
  student_id: number;
  status: AttendanceStatus;
  note?: string;
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
