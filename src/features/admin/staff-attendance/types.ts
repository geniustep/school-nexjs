export type StaffAttendanceStatus = 'present' | 'no_record';
export type StaffAttendanceDayStatus = 'no_record' | 'single_morning_record' | 'single_record' | 'insufficient_interval' | 'present_complete';

export interface StaffAttendanceSourceRef { id:number; source_device_id:string; name:string; vendor:string; }
export interface StaffAttendanceTodayRow {
  staff_relationship_id:number; name:string; name_ar?:string|null; name_fr?:string|null; role?:string|null; relationship_category?:string|null;
  status:StaffAttendanceStatus; day_status?:StaffAttendanceDayStatus; recorded_work_day?:boolean;
  first_seen_at?:string|null; last_seen_at?:string|null; observations_count:number;
  attendance_duration_minutes?:number|null; attendance_duration_display?:string|null; note_code?:string|null; note?:string|null;
  first_source_device?:StaffAttendanceSourceRef|null; last_source_device?:StaffAttendanceSourceRef|null;
}
export interface StaffAttendanceSummary {
  total_staff:number; present_today:number; no_record_today:number;
  complete_today?:number; single_morning_record_today?:number; single_record_today?:number; insufficient_interval_today?:number;
}
export interface StaffAttendanceTodayMeta { local_date:string; timezone:string; day_start_at:string; day_end_at:string; status_filter:string; search?:string|null; summary:StaffAttendanceSummary; }
export interface StaffAttendanceHistoryRow {
  id:number; staff_relationship_id:number; occurred_at:string; local_date:string; local_time:string;
  source_device?:StaffAttendanceSourceRef|null; external_person_id?:string|null; event_kind?:string|null; verification_method?:string|null; state:'accepted';
}
export interface StaffAttendanceMonthlyRow {
  staff_relationship_id:number; name:string; name_ar?:string|null; name_fr?:string|null; role?:string|null; relationship_category?:string|null;
  days_with_records:number; recorded_work_days:number; complete_days:number; duration_complete_days?:number;
  single_morning_record_days?:number; single_record_days:number; insufficient_interval_days?:number;
  total_attendance_duration_minutes:number; average_attendance_duration_minutes?:number|null; average_attendance_duration_display?:string|null;
}
export interface StaffAttendanceMonthlyDay {
  local_date:string; first_seen_at?:string|null; last_seen_at?:string|null; observations_count:number; status:StaffAttendanceStatus;
  day_status:StaffAttendanceDayStatus; recorded_work_day:boolean; attendance_duration_minutes?:number|null; attendance_duration_display?:string|null;
  note_code?:string|null; note?:string|null;
}
export interface StaffAttendanceMonthlyDetail extends StaffAttendanceMonthlyRow { days:StaffAttendanceMonthlyDay[]; }
