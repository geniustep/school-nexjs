import type { Ref } from '@/types/api';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import type { StudentNameFields } from '@/types/student';

export type AttendanceOperationStatus =
  | 'completed'
  | 'in_progress'
  | 'not_started'
  | 'closed'
  | 'empty';

export interface AttendanceCalendarGate {
  allowed: boolean | null;
  hard_blocked: boolean | null;
  provisional_only: boolean | null;
  closure_kind: string | null;
  status: string | null;
  causing_event: unknown;
  day_part: string | null;
}

export interface AttendanceOperationsAllowedActions {
  can_view: boolean;
  can_manage: boolean;
  can_record_today: boolean;
}

export interface AttendanceClassAllowedActions {
  can_view: boolean;
  can_open_class?: boolean;
  can_record_today: boolean;
  can_correct: boolean;
}

export interface AttendanceOverviewSummary {
  classes_total: number;
  classes_expected_to_record: number;
  classes_completed: number;
  classes_in_progress: number;
  classes_not_started: number;
  classes_closed: number;
  classes_empty: number;
  expected_students: number;
  recorded_students: number;
  unrecorded_students: number;
  recording_completion_pct: number;
  present: number;
  absent: number;
  late: number;
  left_early: number;
  attendance_rate: number | null;
  absence_rate: number | null;
  late_rate: number | null;
}

export interface AttendanceOverviewClass {
  id: number;
  name: string;
  level: Ref | null;
  expected_students: number;
  recorded_students: number;
  unrecorded_students: number;
  completion_pct: number;
  operation_status: AttendanceOperationStatus;
  counts: Record<AttendanceStatus, number>;
  attendance_rate: number | null;
  absence_rate: number | null;
  late_rate: number | null;
  recorders: Array<Ref & { count: number }>;
  completed_by: Ref | null;
  completed_at: string | null;
  last_recorded_by: Ref | null;
  last_recorded_at: string | null;
  last_modified_by: Ref | null;
  last_modified_at: string | null;
  calendar_gate: AttendanceCalendarGate;
  allowed_actions: AttendanceClassAllowedActions;
}

export interface AttendanceLongAbsenceRow {
  student: { id: number } & StudentNameFields;
  class: Ref | null;
  consecutive_absence_records: number;
  absences_in_window: number;
  window_days: number;
  last_present_date: string | null;
}

export interface AttendanceOperationsOverview {
  date: string;
  academic_year: Ref;
  roster_basis: 'active_operational_enrollment' | string;
  summary: AttendanceOverviewSummary;
  classes: AttendanceOverviewClass[];
  attention: {
    long_absences: AttendanceLongAbsenceRow[];
    policy: {
      consecutive_absence_records_threshold: number;
      window_days: number;
      limit: number;
      missing_attendance_is_absence: boolean;
    };
  };
  allowed_actions: AttendanceOperationsAllowedActions;
}

export interface AttendanceClassSummary {
  present: number;
  absent: number;
  late: number;
  left_early: number;
  total_students: number;
  recorded_students: number;
  unrecorded_students: number;
  recording_completion_pct: number;
  attendance_rate: number | null;
  absence_rate: number | null;
}

export interface AttendanceClassNotRecordedStudent extends StudentNameFields {
  id: number;
}

export interface AttendanceClassDetails {
  date: string;
  class_id: number;
  class_name: string;
  level: Ref | null;
  roster_basis: 'active_operational_enrollment' | string;
  recording_allowed: boolean;
  calendar_gate: AttendanceCalendarGate;
  recorded: AttendanceRecord[];
  not_recorded: AttendanceClassNotRecordedStudent[];
  summary: AttendanceClassSummary;
  allowed_actions: AttendanceClassAllowedActions;
}

export interface AttendanceClassBatchItem {
  student_id: number;
  status: AttendanceStatus;
  note?: string;
  expected_write_date?: string;
  expected_missing?: boolean;
}

export interface AttendanceClassBatchRequest {
  date: string;
  items: AttendanceClassBatchItem[];
}

export interface AttendanceClassBatchResult {
  saved: number;
  failed: number;
  items: Array<{
    student_id: number;
    attendance_id: number;
    status: AttendanceStatus;
  }>;
  errors: Array<{
    student_id: number | null;
    error: string;
  }>;
}
