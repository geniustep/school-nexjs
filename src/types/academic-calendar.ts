/**
 * Admin academic calendars / holidays — School API
 * Namespace: /api/v1/admin/academic-calendars
 * Backend: smart_school_connect (school DB)
 *
 * Field names and paths match the live Odoo contract
 * (evidence: calendar id 20 on school DB, module 18.0.1.0.188).
 */

export type AcademicCalendarState =
  | 'draft'
  | 'under_review'
  | 'published'
  | 'archived'
  | (string & {});

export type AcademicCalendarEventStatus =
  | 'confirmed'
  | 'provisional'
  | 'cancelled'
  | (string & {});

export type AcademicCalendarEventType =
  | 'inter_term_break'
  | 'national_holiday'
  | 'school_closure'
  | 'mid_year_break'
  | 'religious_holiday'
  | (string & {});

export type AcademicCalendarDayPart = 'full_day' | 'morning' | 'afternoon' | (string & {});

export type AcademicCalendarScopeType = 'school' | 'cycle' | 'level' | 'class' | (string & {});

/** Exact allowed_actions keys returned by School API. */
export type AcademicCalendarLifecycleAction =
  | 'view'
  | 'edit'
  | 'add_event'
  | 'edit_event'
  | 'delete_event'
  | 'submit_review'
  | 'reset_to_draft'
  | 'publish'
  | 'duplicate'
  | 'archive';

export type AcademicCalendarAllowedActions = Partial<
  Record<AcademicCalendarLifecycleAction | string, boolean>
>;

export interface AcademicCalendarWarning {
  code?: string;
  message: string;
  severity?: 'info' | 'warning' | 'error' | string;
  field?: string;
}

export interface AcademicCalendarRef {
  id: number;
  name: string;
}

export interface AcademicCalendarYearRef {
  id: number;
  name: string;
  date_start?: string | null;
  date_end?: string | null;
}

/** Backend summary block — display only; never recompute locally. */
export interface AcademicCalendarSummaryBlock {
  event_count: number | null;
  provisional_event_count: number | null;
  confirmed_event_count: number | null;
  cancelled_event_count: number | null;
  calendar_day_count: number | null;
  study_day_count: number | null;
  study_day_count_reliable: boolean | null;
  warnings: AcademicCalendarWarning[];
}

export interface AcademicCalendarEvent {
  id: number;
  name: string;
  event_type: string;
  date_from: string;
  date_to: string;
  day_part?: string | null;
  time_from?: string | null;
  time_to?: string | null;
  status: string;
  scope_type?: string | null;
  cycle?: AcademicCalendarRef | null;
  level?: AcademicCalendarRef | null;
  class?: AcademicCalendarRef | null;
  is_school_closed?: boolean | null;
  blocks_timetable?: boolean | null;
  blocks_attendance?: boolean | null;
  blocks_exams?: boolean | null;
  affects_services?: boolean | null;
  source_type?: string | null;
  source_reference?: string | null;
  is_local_override?: boolean | null;
  notes?: string | null;
  sequence?: number | null;
  active?: boolean | null;
}

export interface AcademicCalendarSummary {
  id: number;
  name: string;
  display_name?: string | null;
  state: string;
  version_number?: number | null;
  school?: AcademicCalendarRef | null;
  school_id?: number | null;
  academic_year?: AcademicCalendarYearRef | null;
  academic_year_id?: number | null;
  academic_year_name?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  source_type?: string | null;
  source_reference?: string | null;
  published_at?: string | null;
  summary?: AcademicCalendarSummaryBlock | null;
  event_count?: number | null;
  provisional_event_count?: number | null;
  warnings?: AcademicCalendarWarning[];
  allowed_actions?: AcademicCalendarAllowedActions;
}

export interface AcademicCalendarDetail extends AcademicCalendarSummary {
  change_reason?: string | null;
  notes?: string | null;
  source_calendar?: AcademicCalendarRef | null;
  published_by?: AcademicCalendarRef | null;
  events?: AcademicCalendarEvent[];
  provisional_events?: AcademicCalendarEvent[];
  /** Present on create-event responses. */
  created_event?: AcademicCalendarEvent | null;
  /** Present on update-event responses (`event` + `calendar` envelope). */
  updated_event?: AcademicCalendarEvent | null;
}

export interface AcademicCalendarCreatePayload {
  name: string;
  academic_year_id: number;
  notes?: string;
}

export interface AcademicCalendarUpdatePayload {
  name?: string;
  notes?: string;
}

export interface AcademicCalendarEventPayload {
  name: string;
  event_type: string;
  date_from: string;
  date_to: string;
  day_part?: string;
  scope_type?: string;
  status?: string;
  is_school_closed?: boolean;
  blocks_timetable?: boolean;
  blocks_attendance?: boolean;
  blocks_exams?: boolean;
  affects_services?: boolean;
  /** Backend float hours (8.5) or display HH:MM — adapter converts on send. */
  time_from?: number | string | null;
  time_to?: number | string | null;
  notes?: string | null;
  cycle_id?: number | null;
  level_id?: number | null;
  class_id?: number | null;
}

export interface AcademicCalendarDuplicatePayload {
  name?: string;
  academic_year_id?: number;
}

export interface AcademicCalendarEffectiveEventsData {
  academic_year_id: number | null;
  school_id: number | null;
  date_from: string | null;
  date_to: string | null;
  events: AcademicCalendarEvent[];
}

export interface AcademicCalendarClosureScopeApplied {
  cycle_id: number | null;
  level_id: number | null;
  class_id: number | null;
}

export interface AcademicCalendarClosureContext {
  date: string;
  is_closed: boolean;
  is_closed_confirmed: boolean;
  provisional_only: boolean;
  includes_provisional: boolean;
  closure_kind: string;
  day_part: string | null;
  status: string | null;
  calendar_id: number | null;
  scope_applied: AcademicCalendarClosureScopeApplied | null;
  causing_event: AcademicCalendarEvent | null;
  events: AcademicCalendarEvent[];
  warnings: AcademicCalendarWarning[];
}
