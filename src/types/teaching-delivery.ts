/**
 * Actual Delivery / Class Journal / Teaching Progress contracts —
 * synced with ODOO-TEACHING-DELIVERY-JOURNAL-PROGRESS-8.
 *
 * Semantic guards (non-negotiable):
 * - Teacher Jathatha ≠ Actual Delivery Record
 * - Actual Delivery Record ≠ Class Teaching Journal Entry
 * - Class Teaching Journal Entry ≠ Teaching Progress
 * - Annual Distribution Line ≠ Actual Delivery Record
 * - Journal is generated and read-only
 * - Progress is derived and read-only
 */

import type {
  TeachingPlanningAllowedActions,
  TeachingPlanningNamedRef,
} from '@/types/teaching-planning';
import type {
  SessionOccurrenceDetail,
  SessionOccurrenceSummary,
  TeacherJathathaState,
} from '@/types/jathatha';

export type ActualDeliveryState =
  | 'draft'
  | 'confirmed'
  | 'corrected'
  | 'superseded'
  | 'voided'
  | string;

export type ActualDeliveryReviewState =
  | 'not_reviewed'
  | 'reviewed'
  | 'correction_requested'
  | string;

export type DeliveryCompletionState = 'completed' | 'partial' | 'not_completed' | string;

export type DeliveryDeviationType =
  | 'none'
  | 'reordered'
  | 'support_needed'
  | 'assessment_adjustment'
  | 'class_pace'
  | 'calendar_disruption'
  | 'teacher_decision'
  | 'other'
  | string;

export type DeliveryActivityResultState =
  | 'completed'
  | 'partial'
  | 'skipped'
  | 'added'
  | string;

export type ClassJournalEntryState = 'current' | 'superseded' | 'voided' | string;

export type TeachingProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'overdelivered'
  | string;

export const ACTUAL_DELIVERY_STATES = [
  'draft',
  'confirmed',
  'corrected',
  'superseded',
  'voided',
] as const;

export const ACTUAL_DELIVERY_REVIEW_STATES = [
  'not_reviewed',
  'reviewed',
  'correction_requested',
] as const;

export const DELIVERY_COMPLETION_STATES = [
  'completed',
  'partial',
  'not_completed',
] as const;

export const DELIVERY_DEVIATION_TYPES = [
  'none',
  'reordered',
  'support_needed',
  'assessment_adjustment',
  'class_pace',
  'calendar_disruption',
  'teacher_decision',
  'other',
] as const;

export const DELIVERY_ACTIVITY_RESULT_STATES = [
  'completed',
  'partial',
  'skipped',
  'added',
] as const;

export const CLASS_JOURNAL_ENTRY_STATES = ['current', 'superseded', 'voided'] as const;

export const TEACHING_PROGRESS_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
  'delayed',
  'overdelivered',
] as const;

export interface DeliveryNamedRef {
  id: number;
  name: string;
  code?: string | null;
}

export interface DeliveryDistributionLineRef {
  id: number;
  name: string;
  sequence_order?: number | null;
  title?: string | null;
  planned_window_start?: string | null;
  planned_window_end?: string | null;
  planned_sessions?: number | null;
  remaining_units?: number | null;
  coverage_percent?: number | null;
  progress_status?: TeachingProgressStatus | null;
  delayed?: boolean;
  completed?: boolean;
}

export interface DeliveryReadiness {
  ready?: boolean;
  occurrence_ready?: boolean;
  occurrence_finished?: boolean;
  assignment_ready?: boolean;
  offering_ready?: boolean;
  distribution_ready?: boolean;
  delivered_line_ready?: boolean;
  completion_ready?: boolean;
  content_ready?: boolean;
  duration_valid?: boolean;
  deviation_ready?: boolean;
  ready_for_confirmation?: boolean;
  blockers: string[];
  warnings: string[];
  [key: string]: unknown;
}

export interface DeliveryActivityResult {
  id?: number | null;
  sequence_order: number;
  teacher_jathatha_activity_id?: number | null;
  name: string;
  result_state: DeliveryActivityResultState;
  actual_duration_minutes?: number | null;
  completion_percent?: number | null;
  notes?: string | null;
  active?: boolean;
}

export interface ActualDeliveryRevisionSummary {
  id: number;
  revision_no: number;
  state: ActualDeliveryState;
  review_state?: ActualDeliveryReviewState | null;
  is_current?: boolean;
  is_correction?: boolean;
  correction_reason?: string | null;
  void_reason?: string | null;
  created_at?: string | null;
  confirmed_at?: string | null;
  supersedes_id?: number | null;
  journal_state?: ClassJournalEntryState | null;
}

export interface ProgressSummarySnippet {
  coverage_percent?: number | null;
  planned_units?: number | null;
  delivered_units?: number | null;
  remaining_units?: number | null;
  status?: TeachingProgressStatus | null;
  delayed_count?: number | null;
  completed_count?: number | null;
  last_delivery_at?: string | null;
  summary?: string | null;
}

export interface ActualDeliverySummary {
  id: number;
  occurrence?: SessionOccurrenceSummary | null;
  session_date?: string | null;
  session_start_time?: string | null;
  session_end_time?: string | null;
  teacher: TeachingPlanningNamedRef | null;
  class: TeachingPlanningNamedRef | null;
  subject: TeachingPlanningNamedRef | null;
  offering: TeachingPlanningNamedRef | null;
  distribution?: TeachingPlanningNamedRef | null;
  planned_distribution_line?: DeliveryDistributionLineRef | null;
  delivered_distribution_line?: DeliveryDistributionLineRef | null;
  delivered_title?: string | null;
  completion_state?: DeliveryCompletionState | null;
  completion_percent?: number | null;
  deviation_type?: DeliveryDeviationType | null;
  state: ActualDeliveryState;
  review_state: ActualDeliveryReviewState;
  revision_no: number;
  is_current?: boolean;
  is_correction?: boolean;
  readiness?: DeliveryReadiness | null;
  correction_requested?: boolean;
  allowed_actions?: TeachingPlanningAllowedActions;
}

export interface ActualDeliveryDetail extends ActualDeliverySummary {
  school?: TeachingPlanningNamedRef | null;
  academic_year?: TeachingPlanningNamedRef | null;
  assignment?: TeachingPlanningNamedRef | null;
  teacher_jathatha_id?: number | null;
  teacher_jathatha?: TeachingPlanningNamedRef | null;
  occurrence_id?: number | null;
  planned_distribution_line_id?: number | null;
  delivered_distribution_line_id?: number | null;
  content_summary?: string | null;
  objective_achievement_summary?: string | null;
  actual_pages_label?: string | null;
  assessment_summary?: string | null;
  difficulties_observed?: string | null;
  remediation_action?: string | null;
  next_step?: string | null;
  teacher_notes?: string | null;
  journal_text?: string | null;
  actual_start_datetime?: string | null;
  actual_end_datetime?: string | null;
  actual_duration_minutes?: number | null;
  deviation_reason?: string | null;
  correction_reason?: string | null;
  void_reason?: string | null;
  supersedes_id?: number | null;
  current_journal_entry_id?: number | null;
  activities: DeliveryActivityResult[];
  attachment_ids: number[];
  blockers: string[];
  warnings: string[];
  revision_history?: ActualDeliveryRevisionSummary[];
  progress_summary?: ProgressSummarySnippet | null;
  review_requested_by?: TeachingPlanningNamedRef | null;
  review_requested_at?: string | null;
  review_request_reason?: string | null;
  reviewed_by?: TeachingPlanningNamedRef | null;
  reviewed_at?: string | null;
}

export interface ActualDeliveryCreatePayload {
  session_occurrence_id: number;
  teacher_jathatha_id?: number | null;
  delivered_distribution_line_id: number;
  completion_state: DeliveryCompletionState;
  completion_percent?: number | null;
  deviation_type: DeliveryDeviationType;
  deviation_reason?: string | null;
}

export interface ActualDeliveryUpdatePayload {
  delivered_title?: string | null;
  content_summary?: string | null;
  objective_achievement_summary?: string | null;
  actual_pages_label?: string | null;
  assessment_summary?: string | null;
  difficulties_observed?: string | null;
  remediation_action?: string | null;
  next_step?: string | null;
  teacher_notes?: string | null;
  journal_text?: string | null;
  actual_start_datetime?: string | null;
  actual_end_datetime?: string | null;
  actual_duration_minutes?: number | null;
  completion_state?: DeliveryCompletionState;
  completion_percent?: number | null;
  deviation_type?: DeliveryDeviationType;
  deviation_reason?: string | null;
  delivered_distribution_line_id?: number | null;
  activities?: DeliveryActivityResult[];
  attachment_ids?: number[];
}

export interface ActualDeliveryCorrectionPayload {
  correction_reason: string;
}

export interface ActualDeliveryVoidPayload {
  void_reason: string;
}

export interface ActualDeliveryRequestCorrectionPayload {
  reason: string;
}

export interface DeliveryContextResponse {
  occurrence: SessionOccurrenceDetail | null;
  assignment: TeachingPlanningNamedRef | null;
  offering: TeachingPlanningNamedRef | null;
  active_distribution: TeachingPlanningNamedRef | null;
  current_jathatha: TeachingPlanningNamedRef | null;
  current_jathatha_state?: TeacherJathathaState | null;
  planned_distribution_line: DeliveryDistributionLineRef | null;
  remaining_distribution_lines: DeliveryDistributionLineRef[];
  current_delivery: ActualDeliverySummary | null;
  current_journal_entry: ClassJournalEntrySummary | null;
  progress_summary: ProgressSummarySnippet | null;
  readiness: DeliveryReadiness | null;
  blockers: string[];
  warnings: string[];
  allowed_actions: TeachingPlanningAllowedActions;
}

export interface ClassJournalEntrySummary {
  id: number;
  session_date?: string | null;
  session_start_time?: string | null;
  session_end_time?: string | null;
  teacher: TeachingPlanningNamedRef | null;
  class: TeachingPlanningNamedRef | null;
  subject: TeachingPlanningNamedRef | null;
  offering?: TeachingPlanningNamedRef | null;
  distribution?: TeachingPlanningNamedRef | null;
  distribution_line?: DeliveryDistributionLineRef | null;
  delivered_title?: string | null;
  revision_no?: number | null;
  state: ClassJournalEntryState;
  deviation_type?: DeliveryDeviationType | null;
  source_delivery_id?: number | null;
  occurrence_id?: number | null;
}

export interface ClassJournalEntryDetail extends ClassJournalEntrySummary {
  school?: TeachingPlanningNamedRef | null;
  academic_year?: TeachingPlanningNamedRef | null;
  content_summary?: string | null;
  objective_achievement_summary?: string | null;
  actual_pages_label?: string | null;
  assessment_summary?: string | null;
  journal_text?: string | null;
  deviation_reason?: string | null;
  completion_state?: DeliveryCompletionState | null;
  completion_percent?: number | null;
  fingerprint?: string | null;
  supersedes_id?: number | null;
  source_delivery?: ActualDeliverySummary | null;
  revision_lineage?: ActualDeliveryRevisionSummary[];
}

export interface TeachingProgressLineSummary {
  id: number;
  sequence_order?: number | null;
  title?: string | null;
  name?: string | null;
  class: TeachingPlanningNamedRef | null;
  subject: TeachingPlanningNamedRef | null;
  teacher?: TeachingPlanningNamedRef | null;
  offering: TeachingPlanningNamedRef | null;
  distribution?: TeachingPlanningNamedRef | null;
  distribution_line?: DeliveryDistributionLineRef | null;
  planned_sessions?: number | null;
  delivered_units?: number | null;
  remaining_units?: number | null;
  coverage_percent?: number | null;
  status: TeachingProgressStatus;
  delayed?: boolean;
  planned_window_start?: string | null;
  planned_window_end?: string | null;
  last_delivery_at?: string | null;
  last_delivery_id?: number | null;
}

export interface TeachingProgressLineDetail extends TeachingProgressLineSummary {
  school?: TeachingPlanningNamedRef | null;
  academic_year?: TeachingPlanningNamedRef | null;
  delayed_explanation?: string | null;
  contributing_deliveries?: ActualDeliverySummary[];
  planned_dates?: string[];
}

export interface TeachingProgressSummary {
  coverage_percent?: number | null;
  planned_lines?: number | null;
  started_lines?: number | null;
  completed_lines?: number | null;
  delayed_lines?: number | null;
  current_lines?: TeachingProgressLineSummary[];
  next_remaining_lines?: TeachingProgressLineSummary[];
  last_delivery?: ActualDeliverySummary | null;
  classes_needing_attention?: TeachingPlanningNamedRef[];
  counts?: Record<string, number>;
}

export const DELIVERY_ERROR_CODES = [
  'delivery_occurrence_required',
  'delivery_occurrence_not_teachable',
  'delivery_occurrence_not_started',
  'delivery_occurrence_not_finished',
  'delivery_assignment_required',
  'delivery_offering_required',
  'delivery_offering_not_active',
  'delivery_active_distribution_required',
  'delivery_delivered_line_required',
  'delivery_delivered_line_mismatch',
  'delivery_completion_invalid',
  'delivery_content_required',
  'delivery_duration_invalid',
  'delivery_deviation_reason_required',
  'delivery_current_revision_exists',
  'delivery_revision_conflict',
  'delivery_immutable',
  'delivery_correction_reason_required',
  'delivery_void_reason_required',
  'delivery_review_state_invalid',
  'delivery_scope_mismatch',
  'class_journal_read_only',
  'class_journal_source_delivery_required',
  'teaching_progress_read_only',
  'teaching_progress_context_mismatch',
  'teaching_progress_recompute_failed',
] as const;

export type DeliveryNamedRefAlias = DeliveryNamedRef;
