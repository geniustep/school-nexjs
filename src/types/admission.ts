// Admissions API types — ADMISSION-CORE-1 / ADMISSION-WORKFLOW-1.

import type { Ref } from './api';
import type { SiblingLine, SiblingsFieldsSource } from './sibling-line';

export type { SiblingLine, SiblingsFieldsSource } from './sibling-line';

export type AdmissionState =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'visit_pending'
  | 'under_review'
  | 'accepted'
  | 'waitlisted'
  | 'offer_sent'
  | 'confirmed'
  | 'lost'
  | 'cancelled'
  | 'duplicate';

export type AdmissionApplicationStatus =
  | 'new'
  | 'follow_up'
  | 'in_assessment'
  | 'decision_pending'
  | 'accepted'
  | 'ready_for_registration'
  | 'registered'
  | 'waitlisted'
  | 'rejected'
  | 'closed'
  | string;

export type AdmissionContactResult =
  | 'reached'
  | 'no_answer'
  | 'wrong_number'
  | 'call_later'
  | 'family_interested'
  | 'family_not_interested'
  | 'appointment_scheduled'
  | 'information_sent'
  | 'other';

export type AdmissionModernActionCode =
  | 'log_contact'
  | 'add_note'
  | 'record_assessment'
  | 'complete_assessment'
  | 'accept'
  | 'reject'
  | 'waitlist'
  | 'request_reassessment'
  | 'record_family_approval'
  | 'accept_and_record_family_approval'
  | 'close'
  | 'reopen'
  | 'return_to_status'
  | 'change_status'
  | 'convert_to_student'
  | 'link_existing_student'
  | string;

/** Backend-provided status target codes (change_status / return_to_status) — never invent locally. */
export type AdmissionStatusTarget =
  | string
  | {
      code?: string | null;
      status?: string | null;
      target_status?: string | null;
      label?: string | null;
      [key: string]: unknown;
    };

/** @deprecated Prefer AdmissionStatusTarget — retained for 14A compatibility. */
export type AdmissionReturnTarget = AdmissionStatusTarget;

export interface AdmissionLastAction {
  code?: string | null;
  label?: string | null;
  result?: string | null;
  result_label?: string | null;
  actor?: Ref | string | null;
  actor_name?: string | null;
  user?: Ref | string | null;
  occurred_at?: string | null;
  at?: string | null;
  note?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
}

export interface AdmissionTimelineItem extends AdmissionLastAction {
  id?: number | string | null;
  is_system?: boolean | null;
}

export interface AdmissionModernAllowedAction {
  code: string;
  allowed: boolean;
  label?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

export interface AdmissionNavigation {
  student?: { available?: boolean; id?: number | null; href?: string | null; url?: string | null } | null;
}

export interface AdmissionBlockingReason {
  code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ExecuteAdmissionActionPayload {
  action: string;
  result?: string;
  note?: string;
  reason?: string;
  target_status?: string;
  confirm_family_approval?: boolean;
  next_action?: string;
  next_action_date?: string;
  scheduled_at?: string;
  appointment_at?: string;
  [key: string]: unknown;
}

export interface ExecuteAdmissionsBulkActionPayload {
  action: 'change_status' | string;
  application_ids: number[];
  target_status: string;
  note: string;
  confirm_family_approval?: boolean;
  [key: string]: unknown;
}

export interface AdmissionsBulkActionBlocker {
  application_id?: number | null;
  id?: number | null;
  code?: string | null;
  message?: string | null;
  [key: string]: unknown;
}

export interface AdmissionsBulkActionResult {
  changed_count?: number | null;
  application_ids?: number[] | null;
  blockers?: AdmissionsBulkActionBlocker[] | null;
  items?: AdmissionDetail[] | null;
  [key: string]: unknown;
}

export type ActivityType = 'note' | 'call' | 'whatsapp' | 'follow_up' | 'visit_note';

export type DecisionType =
  | 'accepted'
  | 'accepted_with_condition' // legacy read-only; not creatable in UI
  | 'waitlisted'
  | 'rejected'
  | 'needs_reassessment';

/** Backend-derived registration outcome — display/filter only, not a writable state. */
export type AdmissionRegistrationStatus =
  | 'awaiting_registration'
  | 'registered'
  | 'not_applicable';

export type AdmissionOfferState =
  | 'not_applicable'
  | 'not_created'
  | 'draft'
  | 'sent'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'withdrawn'
  | string;

/** Odoo 18.0.1.0.185 processing stages (Backend source of truth). */
export type AdmissionProcessingStage =
  | 'new'
  | 'initial_follow_up'
  | 'assessment_ready'
  | 'assessment_in_progress'
  | 'decision_ready'
  | string;

export type AdmissionAssessmentProgress =
  | 'not_required'
  | 'not_started'
  | 'in_progress'
  | 'additional_required'
  | 'completed'
  | 'ready_for_decision'
  | string;

export type AdmissionRegistrationReadiness =
  | 'not_applicable'
  | 'blocked'
  | 'awaiting_offer_creation'
  | 'awaiting_offer_response'
  | 'ready'
  | 'registered'
  | string;

export type AdmissionRegistrationRequirementSeverity =
  | 'blocking'
  | 'warning'
  | 'information'
  | string;

export type AdmissionRegistrationRequirement = {
  code?: string | null;
  key?: string | null;
  severity?: AdmissionRegistrationRequirementSeverity | null;
  level?: AdmissionRegistrationRequirementSeverity | null;
  message?: string | null;
  label?: string | null;
  title?: string | null;
  description?: string | null;
  [key: string]: unknown;
};

export type AdmissionAssessmentSummary = {
  progress?: AdmissionAssessmentProgress | null;
  required_count?: number | null;
  completed_count?: number | null;
  open_count?: number | null;
  optional_count?: number | null;
  next_assessment?: Record<string, unknown> | null;
  blocking_assessments?: Array<Record<string, unknown>> | null;
  assessments?: Array<Record<string, unknown>> | null;
  [key: string]: unknown;
};

export type AdmissionOfferSummary = {
  required?: boolean | null;
  offer_required?: boolean | null;
  state?: string | null;
  offer_state?: string | null;
  offer_id?: number | null;
  sent_at?: string | null;
  deadline_date?: string | null;
  expires_at?: string | null;
  policy_note?: string | null;
  reason?: string | null;
  [key: string]: unknown;
};

export type AdmissionNextAction =
  | string
  | {
      code?: string | null;
      key?: string | null;
      action?: string | null;
      label?: string | null;
      message?: string | null;
      description?: string | null;
      [key: string]: unknown;
    }
  | null;

export type AdmissionStatusWarningCode =
  | 'accepted_state_without_decision'
  | 'student_linked_state_mismatch'
  | 'registration_linked_without_student'
  | 'rejected_decision_state_mismatch'
  | 'accepted_offer_application_state_mismatch'
  | string;

export interface AdmissionRequestedService {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface AdmissionRequestedServiceCount {
  service_id: number;
  code?: string | null;
  name: string;
  count: number;
}

export interface AdmissionsDashboard {
  total_open: number;
  new_count: number;
  visit_pending_count: number;
  under_review_count: number;
  accepted_count: number;
  offer_sent_count: number;
  confirmed_count: number;
  lost_count: number;
  today_appointments: number;
  overdue_next_actions: number;
  /** Backend outcome counters — prefer these over legacy accepted_count for registration UX. */
  awaiting_registration_count?: number;
  registered_count?: number;
  school_rejected_count?: number;
  family_declined_count?: number;
  expired_offer_count?: number;
  /** Official application_status tallies (prefer over legacy confirmed_count / outcome proxies). */
  ready_for_registration_count?: number;
  application_status_counts?: Partial<Record<string, number>>;
  application_status_new_count?: number;
  application_status_follow_up_count?: number;
  application_status_in_assessment_count?: number;
  application_status_decision_pending_count?: number;
  application_status_accepted_count?: number;
  application_status_ready_for_registration_count?: number;
  application_status_registered_count?: number;
  application_status_waitlisted_count?: number;
  application_status_rejected_count?: number;
  application_status_closed_count?: number;
  /** Workspace queue counters from dashboard (not derived from list rows). */
  follow_up_workspace_count?: number;
  awaiting_decision_workspace_count?: number;
  post_acceptance_workspace_count?: number;
  closed_workspace_count?: number;
  /** Requested school services dashboard tallies. */
  requested_service_counts?: AdmissionRequestedServiceCount[] | null;
  any_requested_services_count?: number | null;
  no_requested_services_count?: number | null;
}

export interface AdmissionListItem {
  id: number;
  /** Application reference (ADM-…); Kanban projection may send this as `name`. */
  reference?: string | null;
  /** Backend display name / reference alias — prefer `reference` after normalize. */
  name?: string | null;
  external_reference?: string | null;
  /** Family batch linkage — present when the request belongs to a multi-child family submission. */
  family_batch_id?: number | null;
  family_reference?: string | null;
  family_size?: number | null;
  student_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  source: Ref | string | null;
  requested_level: Ref | string | null;
  previous_school?: string | null;
  has_siblings?: boolean | null;
  siblings_levels?: string | null;
  siblings_raw_text?: string | null;
  sibling_count?: number | null;
  siblings_summary?: string | null;
  sibling_lines?: SiblingLine[] | null;
  state: AdmissionState | string;
  /** Backend workspace queue assignment — prefer over local inference. */
  admission_workspace?:
    | 'follow_up'
    | 'awaiting_decision'
    | 'post_acceptance'
    | 'closed'
    | string
    | null;
  /** Odoo 18.0.1.0.185 — Backend source of truth when present. */
  processing_stage?: AdmissionProcessingStage | null;
  assessment_progress?: AdmissionAssessmentProgress | null;
  assessment_summary?: AdmissionAssessmentSummary | null;
  offer_required?: boolean | null;
  offer_summary?: AdmissionOfferSummary | null;
  registration_readiness?: AdmissionRegistrationReadiness | null;
  registration_requirements?: AdmissionRegistrationRequirement[] | null;
  /**
   * Linkage fields — optional on the list payload. Present only when the
   * backend serializes them; used to surface a "converted to student" badge.
   * No new fields are assumed beyond the existing admission contract.
   */
  student_id?: number | false | null;
  registration_flow_state?: AdmissionRegistrationFlowState | null;
  /** Normalized nested decision — list may also carry flat decision string before normalize. */
  decision?: AdmissionDecision | string | false | null;
  decision_date?: string | false | null;
  decision_notes?: string | false | null;
  decision_user?: Ref | string | false | null;
  registration_status?: AdmissionRegistrationStatus | null;
  is_school_rejected?: boolean | null;
  status_warnings?: AdmissionStatusWarningCode[] | null;
  converted_at?: string | false | null;
  next_action: AdmissionNextAction;
  next_action_date: string | null;
  duplicate_count: number;
  offer_state: AdmissionOfferState | false | null;
  assigned_user: Ref | string | null;
  priority: string | null;
  application_status?: AdmissionApplicationStatus | null;
  last_action?: AdmissionLastAction | null;
  timeline?: AdmissionTimelineItem[] | null;
  primary_next_action?: AdmissionNextAction;
  modern_allowed_actions?: AdmissionModernAllowedAction[] | string[] | null;
  exception_actions?: AdmissionModernAllowedAction[] | string[] | null;
  /** Backend source of truth for return_to_status targets (list seed, 14A). */
  allowed_return_targets?: AdmissionStatusTarget[] | null;
  /** Backend source of truth for unified change_status targets. */
  allowed_status_targets?: AdmissionStatusTarget[] | null;
  navigation?: AdmissionNavigation | null;
  warnings?: Array<string | Record<string, unknown>> | null;
  blocking_reasons?: AdmissionBlockingReason[] | null;
  requested_services?: AdmissionRequestedService[] | null;
  requested_service_ids?: number[] | null;
  has_requested_services?: boolean | null;
  /** Optional terminal reason fields — present on rejected/closed rows (incl. kanban projection). */
  rejection?: AdmissionRejection | null;
  lost_reason?: string | null;
}

/**
 * Lightweight Kanban list row — subset of list fields under `projection=kanban`.
 * Kept for documentation/boundaries; runtime still normalizes into AdmissionListItem.
 */
export type AdmissionKanbanItem = Pick<
  AdmissionListItem,
  | 'id'
  | 'name'
  | 'reference'
  | 'student_name'
  | 'guardian_name'
  | 'guardian_phone'
  | 'requested_level'
  | 'application_status'
  | 'allowed_status_targets'
  | 'primary_next_action'
  | 'next_action_date'
  | 'last_action'
  | 'requested_services'
  | 'rejection'
  | 'lost_reason'
>;

export interface AdmissionAllowedActions {
  edit?: boolean;
  change_state?: boolean;
  change_processing_stage?: boolean;
  schedule_appointment?: boolean;
  add_assessment?: boolean;
  update_assessment?: boolean;
  decide?: boolean;
  create_offer?: boolean;
  send_offer?: boolean;
  accept_offer?: boolean;
  decline_offer?: boolean;
  get_prefill?: boolean;
  link_student?: boolean;
  reopen?: boolean;
  [key: string]: boolean | undefined;
}

export interface AdmissionRejection {
  is_rejected: boolean;
  reason?: string | null;
  decided_at?: string | null;
  decided_by?: Ref | { id: number; name: string } | null;
}

export type AdmissionRegistrationFlowState =
  | 'not_started'
  | 'in_progress'
  | 'linked'
  | string;

export interface AdmissionActivity {
  id: number;
  activity_type: string;
  note: string | null;
  user: Ref | string | null;
  date: string;
  next_action: string | null;
  next_action_date: string | null;
}

export interface AdmissionAppointment {
  id: number;
  appointment_type: string;
  state: string;
  scheduled_at: string;
  assigned_user: Ref | string | null;
  notes: string | null;
  result_notes: string | null;
}

export interface AdmissionAssessment {
  id: number;
  assessment_type: string;
  assessment_type_label?: string | null;
  state: string;
  assessment_date: string;
  evaluator_id?: number | null;
  evaluator?: Ref | { id: number; name: string } | null;
  requested_level?: Ref | null;
  subject_id?: number | false | null;
  subject?: Ref | { id: number; name: string } | null;
  subject_label?: string | null;
  score: number | null;
  max_score: number | null;
  result: string | null;
  result_label?: string | null;
  recommendation: string | null;
  recommendation_label?: string | null;
  teacher_notes: string | null;
}

export interface AdmissionDecision {
  decision: string | null;
  decision_date: string | null;
  decision_user: Ref | string | null;
  decision_notes: string | null;
  conditions: string | null;
}

export interface AdmissionOffer {
  id: number;
  state: string;
  level: Ref | string | null;
  proposed_class: Ref | string | null;
  registration_fee: number | null;
  monthly_fee: number | null;
  deadline_date: string | null;
  required_documents: string | null;
  notes: string | null;
}

export interface AdmissionDuplicate {
  id: number;
  reference?: string | null;
  student_name: string;
  state: string;
  guardian_phone?: string | null;
}

export interface AdmissionDetail extends SiblingsFieldsSource {
  id: number;
  reference?: string | null;
  name?: string | null;
  family_batch_id?: number | null;
  family_reference?: string | null;
  family_size?: number | null;
  state: AdmissionState | string;
  admission_workspace?:
    | 'follow_up'
    | 'awaiting_decision'
    | 'post_acceptance'
    | 'closed'
    | string
    | null;
  processing_stage?: AdmissionProcessingStage | null;
  assessment_progress?: AdmissionAssessmentProgress | null;
  assessment_summary?: AdmissionAssessmentSummary | null;
  offer_required?: boolean | null;
  offer_summary?: AdmissionOfferSummary | null;
  registration_readiness?: AdmissionRegistrationReadiness | null;
  registration_requirements?: AdmissionRegistrationRequirement[] | null;
  student_id?: number | false | null;
  registration_flow_state?: AdmissionRegistrationFlowState | null;
  student_name: string;
  student_first_name?: string | null;
  student_last_name?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  external_reference?: string | null;
  residence_address?: string | null;
  previous_school?: string | null;
  massar_code?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_whatsapp?: string | null;
  guardian_email?: string | null;
  relationship?: string | null;
  /** Multi-guardian source of truth when present (Backend multi-guardian contract). */
  guardians?: import('@/features/admin/admissions/guardians/types').AdmissionGuardianRead[] | null;
  warning_details?: import('@/features/admin/admissions/guardians/types').AdmissionWarningDetail[] | null;
  school?: Ref | null;
  academic_year?: Ref | null;
  source?: Ref | null;
  requested_level?: Ref | null;
  requested_class?: Ref | null;
  assigned_user?: Ref | null;
  next_action?: AdmissionNextAction;
  next_action_date?: string | null;
  first_contact_date?: string | null;
  internal_notes?: string | null;
  priority?: string | null;
  duplicate_count?: number;
  offer_state?: AdmissionOfferState | false | null;
  activities?: AdmissionActivity[];
  appointments?: AdmissionAppointment[];
  assessments?: AdmissionAssessment[];
  /**
   * After normalizeAdmissionDetail: always nested AdmissionDecision | null.
   * Raw Odoo may send a flat string plus sibling decision_* fields.
   */
  decision?: AdmissionDecision | string | false | null;
  decision_date?: string | false | null;
  decision_notes?: string | false | null;
  decision_user?: Ref | string | false | null;
  conditions?: string | false | null;
  registration_status?: AdmissionRegistrationStatus | null;
  is_school_rejected?: boolean | null;
  status_warnings?: AdmissionStatusWarningCode[] | null;
  converted_at?: string | false | null;
  offers?: AdmissionOffer[];
  duplicates?: AdmissionDuplicate[];
  allowed_actions: AdmissionAllowedActions;
  readiness?: Record<string, unknown> | null;
  prefill_status?: string | null;
  lost_reason?: string | null;
  state_before_close?: string | null;
  is_terminal?: boolean;
  can_reopen?: boolean;
  can_link_student?: boolean;
  rejection?: AdmissionRejection | null;
  application_status?: AdmissionApplicationStatus | null;
  last_action?: AdmissionLastAction | null;
  timeline?: AdmissionTimelineItem[] | null;
  primary_next_action?: AdmissionNextAction;
  modern_allowed_actions?: AdmissionModernAllowedAction[] | string[] | null;
  exception_actions?: AdmissionModernAllowedAction[] | string[] | null;
  /** Backend source of truth for return_to_status Select options (14A). */
  allowed_return_targets?: AdmissionStatusTarget[] | null;
  /** Backend source of truth for unified change_status Select options. */
  allowed_status_targets?: AdmissionStatusTarget[] | null;
  navigation?: AdmissionNavigation | null;
  warnings?: Array<string | Record<string, unknown>> | null;
  blocking_reasons?: AdmissionBlockingReason[] | null;
  requested_services?: AdmissionRequestedService[] | null;
  requested_service_ids?: number[] | null;
  has_requested_services?: boolean | null;
}

export interface AdmissionPrefill {
  source?: Record<string, unknown> | null;
  student?: Record<string, unknown> | null;
  guardian?: Record<string, unknown> | null;
  academic?: Record<string, unknown> | null;
  admission?: Record<string, unknown> | null;
  readiness?: Record<string, unknown> | null;
  warnings?: string[];
  blocking_issues?: string[];
}

export interface AdmissionPrefillApiEnvelope {
  prefill?: AdmissionPrefill | null;
  allowed_actions?: string[] | AdmissionAllowedActions;
}

export interface AdmissionOptionItem {
  id?: number | string;
  value?: number | string;
  code?: string;
  label: string;
}

export interface AdmissionCycleOption {
  id?: number;
  code: string;
  name: string;
  sequence?: number;
}

export interface AdmissionLevelOption {
  id: number;
  name: string;
  code?: string;
  cycle: string;
  requires_stream: boolean;
}

export interface AdmissionStreamOption {
  id: number;
  name: string;
  code?: string;
  level_id: number;
}

export interface AdmissionEvaluatorOption {
  id: number;
  name: string;
  role: string;
}

export interface AdmissionAcademicYearOption {
  id: number;
  name: string;
  code?: string;
  is_current?: boolean;
  state?: string;
}

export interface AdmissionValueLabelOption {
  value: string;
  label: string;
}

export interface AdmissionSubjectOption {
  id: number;
  name: string;
  label: string;
  code?: string;
  level_ids?: number[];
  cycle?: string;
}

export interface AdmissionOptions {
  states: AdmissionOptionItem[];
  priorities: AdmissionOptionItem[];
  relationships: AdmissionOptionItem[];
  sources: AdmissionOptionItem[];
  academic_years: AdmissionAcademicYearOption[];
  cycles: AdmissionCycleOption[];
  levels: AdmissionLevelOption[];
  streams: AdmissionStreamOption[];
  evaluators: AdmissionEvaluatorOption[];
  subjects: AdmissionSubjectOption[];
  assessment_types: AdmissionValueLabelOption[];
  assessment_results: AdmissionValueLabelOption[];
  assessment_recommendations: AdmissionValueLabelOption[];
}

export interface AdmissionOptionsPayload {
  states?: AdmissionOptionItem[];
  priorities?: AdmissionOptionItem[];
  relationships?: AdmissionOptionItem[];
  sources?: AdmissionOptionItem[];
  academic_years?: AdmissionAcademicYearOption[];
  cycles?: AdmissionCycleOption[];
  levels?: AdmissionLevelOption[];
  streams?: AdmissionStreamOption[];
  evaluators?: AdmissionEvaluatorOption[];
  subjects?: AdmissionSubjectOption[];
  assessment_types?: AdmissionValueLabelOption[];
  assessment_results?: AdmissionValueLabelOption[];
  assessment_recommendations?: AdmissionValueLabelOption[];
}

export interface CreateAdmissionPayload {
  child_first_name_ar?: string;
  child_last_name_ar?: string;
  child_first_name_fr?: string;
  child_last_name_fr?: string;
  child_name?: string;
  student_name?: string;
  student_first_name?: string;
  student_last_name?: string;
  birth_date?: string;
  birth_place?: string;
  nationality_id?: number;
  gender?: string;
  school_id?: number;
  academic_year_id?: number;
  source_id?: number;
  requested_cycle_code?: string;
  requested_cycle?: string;
  requested_level_id?: number;
  requested_stream_id?: number;
  requested_class_id?: number;
  external_reference?: string;
  residence_address?: string;
  previous_school?: string;
  has_siblings?: boolean;
  siblings_levels?: string;
  siblings_raw_text?: string;
  sibling_lines?: SiblingLine[];
  massar_code?: string;
  school_number?: string;
  code?: string;
  admission_date?: string;
  registration_type?: string;
  actual_join_date?: string;
  is_repeating?: boolean;
  registration_notes?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_whatsapp?: string;
  guardian_email?: string;
  guardian_relationship?: string;
  relationship?: string;
  /** Multi-guardian write contract — preferred source of truth. */
  guardians?: import('@/features/admin/admissions/guardians/types').AdmissionGuardianWritePayload[];
  first_contact_date?: string;
  next_action?: string;
  next_action_date?: string;
  internal_notes?: string;
  requested_service_ids?: number[];
}

export interface PatchAdmissionPayload {
  next_action?: string;
  next_action_date?: string;
  external_reference?: string;
  residence_address?: string;
  previous_school?: string;
  has_siblings?: boolean;
  siblings_levels?: string;
  siblings_raw_text?: string;
  sibling_lines?: SiblingLine[];
  internal_notes?: string;
  assigned_user_id?: number;
  priority?: string;
  state?: string;
  processing_stage?: string;
  /** Reimport upsert — student / guardian / academic fields */
  child_first_name_ar?: string;
  child_last_name_ar?: string;
  child_first_name_fr?: string;
  child_last_name_fr?: string;
  child_name?: string;
  student_name?: string;
  birth_date?: string;
  gender?: string;
  massar_code?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_whatsapp?: string;
  guardian_email?: string;
  guardian_relationship?: string;
  relationship?: string;
  guardians?: import('@/features/admin/admissions/guardians/types').AdmissionGuardianWritePayload[];
  first_contact_date?: string;
  academic_year_id?: number;
  source_id?: number;
  requested_level_id?: number;
  requested_stream_id?: number;
  requested_class_id?: number;
  requested_service_ids?: number[];
}

export interface CreateActivityPayload {
  activity_type: ActivityType | string;
  note?: string;
  next_action?: string;
  next_action_date?: string;
}

export interface CreateAppointmentPayload {
  appointment_type: string;
  scheduled_at: string;
  duration_minutes?: number;
  assigned_user_id?: number;
  notes?: string;
}

export interface CreateAssessmentPayload {
  assessment_type: string;
  assessment_date: string;
  evaluator_id?: number;
  requested_level_id?: number;
  subject_id?: number;
  score?: number;
  max_score?: number;
  result?: string;
  recommendation?: string;
  teacher_notes?: string;
}

export interface CreateDecisionPayload {
  decision: DecisionType | string;
  decision_notes?: string;
  conditions?: string;
}

export interface ReopenAdmissionPayload {
  target_state?: string;
  note?: string;
}

export interface CreateOfferPayload {
  level_id?: number;
  proposed_class_id?: number;
  registration_fee?: number;
  monthly_fee?: number;
  deadline_date?: string;
  required_documents?: string;
  notes?: string;
}

/** SSC-API-2026.07.002 — Family admission batch (multi-child intake). */
export interface FamilyBatchChildPayload {
  child_first_name_ar?: string;
  child_last_name_ar?: string;
  child_first_name_fr?: string;
  child_last_name_fr?: string;
  child_name?: string;
  birth_date?: string;
  gender?: string;
  requested_cycle_code?: string;
  requested_level_id?: number;
  requested_stream_id?: number;
  previous_school?: string;
  massar_code?: string;
  residence_address?: string;
  external_reference?: string;
}

export interface FamilyBatchSharedContactPayload {
  guardian_id?: number;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_whatsapp?: string;
  guardian_email?: string;
  relationship?: string;
}

export interface CreateFamilyBatchPayload {
  idempotency_key: string;
  school_id: number;
  academic_year_id?: number;
  source_id?: number;
  /** Primary guardian projection only — derived from guardians[primary]. */
  shared_contact: FamilyBatchSharedContactPayload;
  shared_address?: string;
  first_contact_date?: string;
  /** Shared family notes when supported by the batch contract. */
  notes?: string;
  /** Multi-guardian source of truth. */
  guardians?: import('@/features/admin/admissions/guardians/types').AdmissionGuardianWritePayload[];
  children: FamilyBatchChildPayload[];
}

export interface FamilyBatchApplicationSummary {
  id: number;
  /** Backend admission reference label, e.g. ADM/2026/04158 */
  name?: string | null;
  reference?: string | null;
  student_name: string;
  state: AdmissionState | string;
  admission_workspace?:
    | 'follow_up'
    | 'awaiting_decision'
    | 'post_acceptance'
    | 'closed'
    | string
    | null;
  processing_stage?: AdmissionProcessingStage | null;
  assessment_progress?: AdmissionAssessmentProgress | null;
  assessment_summary?: AdmissionAssessmentSummary | null;
  offer_required?: boolean | null;
  offer_summary?: AdmissionOfferSummary | null;
  registration_readiness?: AdmissionRegistrationReadiness | null;
  registration_requirements?: AdmissionRegistrationRequirement[] | null;
  next_action?: AdmissionNextAction;
  allowed_actions?: AdmissionAllowedActions | string[] | null;
  requested_level_id?: number | null;
  requested_level?: Ref | string | null;
  student_id?: number | false | null;
  registration_flow_state?: AdmissionRegistrationFlowState | null;
  decision?: AdmissionDecision | string | false | null;
  decision_date?: string | false | null;
  decision_notes?: string | false | null;
  decision_user?: Ref | string | false | null;
  registration_status?: AdmissionRegistrationStatus | null;
  is_school_rejected?: boolean | null;
  status_warnings?: AdmissionStatusWarningCode[] | null;
  offer_state?: AdmissionOfferState | false | null;
  converted_at?: string | false | null;
}

/** POST /admin/admissions/family-batches — create response envelope data */
export interface FamilyBatchCreateResponse {
  batch_id: number;
  name?: string | null;
  family_reference: string;
  school_id?: number;
  application_count: number;
  applications: FamilyBatchApplicationSummary[];
  replay?: boolean;
  idempotent_replay?: boolean;
}

export interface FamilyBatchSharedContact {
  guardian_id?: number | false | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_whatsapp?: string | null;
  guardian_email?: string | null;
  relationship?: string | null;
}

/** GET /admin/admissions/family-batches/<batch_id> */
export interface FamilyBatchAllowedActions {
  edit_guardians?: boolean;
  edit_guardians_reason?: string | null;
}

export interface FamilyBatchDetail {
  batch_id: number;
  name?: string | null;
  family_reference: string;
  school_id?: number;
  academic_year_id?: number;
  source_id?: number;
  shared_contact?: FamilyBatchSharedContact | null;
  shared_address?: string | null;
  guardians?: import('@/features/admin/admissions/guardians/types').AdmissionGuardianRead[] | null;
  warning_details?: import('@/features/admin/admissions/guardians/types').AdmissionWarningDetail[] | null;
  /** Count of primary contacts in guardians[] (Backend may return 0|1). */
  primary_count?: number | null;
  allowed_actions?: FamilyBatchAllowedActions | null;
  application_count: number;
  applications: FamilyBatchApplicationSummary[];
}

/** PATCH /admin/admissions/family-batches/<batch_id>/guardians — full replacement. */
export type PatchFamilyBatchGuardiansPayload = {
  guardians: import('@/features/admin/admissions/guardians/types').AdmissionGuardianWritePayload[];
};
