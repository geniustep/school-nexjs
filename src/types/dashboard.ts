// Dashboard payloads — mirrors API_REPORT.md §3 (all roles).

import type { Ref } from './api';
import type { AttendanceSummary, AttendanceStatus } from './attendance';
import type { Announcement } from './message';
import type { ChildSummary } from './student';

export interface LatestMessage {
  id: number;
  channel: string;
  sender: string;
  body: string;
  created_at: string;
}

export interface AdminDashboard {
  total_students: number;
  total_teachers: number;
  total_parents: number;
  total_classes: number;
  attendance_today: AttendanceSummary;
  latest_messages: LatestMessage[];
  important_alerts: unknown[];
}

export interface TeacherDashboardClass {
  id: number;
  name: string;
  student_count?: number;
  attendance_pending?: number;
}

export interface TeacherDashboard {
  assigned_classes: TeacherDashboardClass[];
  latest_messages: LatestMessage[];
}

export interface ParentChildDashboard extends ChildSummary {
  today_attendance?: AttendanceStatus | null;
}

export interface ParentDashboard {
  children: ParentChildDashboard[];
  latest_messages?: LatestMessage[];
}

export interface StudentProfileSummary {
  id: number;
  full_name: string;
  code: string | null;
  level: Ref | null;
  class: Ref | null;
  status: string;
}

export interface StudentDashboard {
  profile: StudentProfileSummary;
  attendance_summary?: AttendanceSummary;
  today_attendance?: AttendanceStatus | null;
  announcements: Announcement[];
}

// Parent read-only child student-view — API_REPORT.md §5.
export interface ChildStudentView {
  student: StudentProfileSummary;
  attendance_summary: AttendanceSummary;
  latest_attendance: { date: string; status: AttendanceStatus; period: string }[];
  channels: {
    id: number;
    name: string;
    type: string;
    read_only: boolean;
    can_send: boolean;
  }[];
  announcements: Announcement[];
  note: string;
}
