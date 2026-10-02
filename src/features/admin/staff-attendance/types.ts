export type StaffAttendanceStatus = 'present' | 'no_record';

export interface StaffAttendanceSourceRef {
  id: number;
  source_device_id: string;
  name: string;
  vendor: string;
}

export interface StaffAttendanceTodayRow {
  staff_relationship_id: number;
  name: string;
  name_ar?: string | null;
  name_fr?: string | null;
  role?: string | null;
  relationship_category?: string | null;
  status: StaffAttendanceStatus;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  observations_count: number;
  first_source_device?: StaffAttendanceSourceRef | null;
  last_source_device?: StaffAttendanceSourceRef | null;
}

export interface StaffAttendanceSummary {
  total_staff: number;
  present_today: number;
  no_record_today: number;
}

export interface StaffAttendanceTodayMeta {
  local_date: string;
  timezone: string;
  day_start_at: string;
  day_end_at: string;
  status_filter: 'all' | StaffAttendanceStatus;
  search?: string | null;
  summary: StaffAttendanceSummary;
}

export interface StaffAttendanceHistoryRow {
  id: number;
  staff_relationship_id: number;
  occurred_at: string;
  local_date: string;
  local_time: string;
  source_device?: StaffAttendanceSourceRef | null;
  external_person_id?: string | null;
  event_kind?: string | null;
  verification_method?: string | null;
  state: 'accepted';
}
