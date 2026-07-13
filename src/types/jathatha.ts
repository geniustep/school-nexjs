/**
 * Jathatha + Session Occurrence contracts — synced with ODOO-TEACHING-JATHATHA-CONTRACT-6.
 *
 * Semantic guards (non-negotiable):
 * - Reference Jathatha ≠ Teaching Reference
 * - Teacher Jathatha ≠ Reference Jathatha
 * - Teacher Jathatha ≠ Didactic Sequence Session Template
 * - Teacher Jathatha ≠ Actual Delivery Record
 * - Teacher Jathatha ≠ Class Teaching Journal
 * - Session Occurrence ≠ Weekly Slot
 */

import type {
  TeachingPlanningAllowedActions,
  TeachingPlanningLanguageRef,
  TeachingPlanningNamedRef,
} from '@/types/teaching-planning';

export type JathathaDetailLevel = 'compact' | 'standard' | 'detailed' | string;

export type ReferenceJathathaState =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'archived'
  | string;

export type TeacherJathathaState =
  | 'draft'
  | 'ready'
  | 'confirmed'
  | 'corrected'
  | 'superseded'
  | 'voided'
  | string;

export type TeacherJathathaReviewState =
  | 'not_reviewed'
  | 'reviewed'
  | 'correction_requested'
  | string;

export type JathathaActivityType =
  | 'situation'
  | 'exercise'
  | 'discussion'
  | 'experiment'
  | 'assessment'
  | 'support'
  | 'project'
  | 'institutionalization'
  | 'other'
  | string;

export type JathathaPhaseType =
  | 'didactic_contract'
  | 'action'
  | 'formulation'
  | 'discussion'
  | 'validation'
  | 'institutionalization'
  | 'practice'
  | 'assessment'
  | 'support'
  | 'synthesis'
  | 'custom'
  | string;

export type SessionOccurrenceState =
  | 'planned'
  | 'confirmed'
  | 'in_progress'
  | 'held'
  | 'not_held'
  | 'cancelled'
  | 'superseded'
  | string;

export interface JathathaNamedRef {
  id: number;
  name: string;
  code?: string | null;
}

export interface JathathaReadiness {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  [key: string]: unknown;
}

export interface JathathaPhase {
  id?: number | null;
  sequence_order: number;
  phase_type: JathathaPhaseType;
  custom_name?: string | null;
  partial_objective?: string | null;
  planned_duration_minutes?: number | null;
  instruction?: string | null;
  teacher_activity?: string | null;
  learner_activity?: string | null;
  work_organization?: string | null;
  materials?: string | null;
  expected_output?: string | null;
  expected_errors?: string | null;
  teacher_intervention?: string | null;
  guiding_questions?: string | null;
  verification_indicator?: string | null;
  transition_criterion?: string | null;
  didactic_notes?: string | null;
  source_phase_id?: number | null;
}

export interface JathathaActivity {
  id?: number | null;
  sequence_order: number;
  name: string;
  activity_type: JathathaActivityType;
  partial_objective?: string | null;
  planned_duration_minutes?: number | null;
  work_mode?: string | null;
  grouping?: string | null;
  materials?: string | null;
  instructions?: string | null;
  teacher_activity?: string | null;
  learner_activity?: string | null;
  expected_output?: string | null;
  quick_assessment?: string | null;
  alternative_plan?: string | null;
  notes?: string | null;
  phases: JathathaPhase[];
  source_activity_id?: number | null;
}

export interface ReferenceJathathaSummary {
  id: number;
  name: string;
  school: TeachingPlanningNamedRef | null;
  reference: TeachingPlanningNamedRef | null;
  sequence: TeachingPlanningNamedRef | null;
  session_template: TeachingPlanningNamedRef | null;
  session_type?: string | null;
  level: TeachingPlanningNamedRef | null;
  subject: TeachingPlanningNamedRef | null;
  teaching_language: TeachingPlanningLanguageRef | null;
  track: TeachingPlanningNamedRef | null;
  default_detail_level: JathathaDetailLevel;
  activity_count: number;
  phase_count: number;
  planned_duration_minutes: number | null;
  state: ReferenceJathathaState;
  version_label: string | null;
  approved_at: string | null;
  readiness?: JathathaReadiness | null;
  allowed_actions?: TeachingPlanningAllowedActions;
}

export interface ReferenceJathathaDetail extends ReferenceJathathaSummary {
  external_reference?: string | null;
  objectives?: string | null;
  prerequisites?: string | null;
  materials_summary?: string | null;
  pages?: string | null;
  quick_assessment_plan?: string | null;
  fallback_plan?: string | null;
  expected_difficulties?: string | null;
  general_guidance?: string | null;
  correction_elements?: string | null;
  support_activities?: string | null;
  notes?: string | null;
  activities: JathathaActivity[];
  attachment_ids: number[];
  blockers: string[];
  warnings: string[];
  approved_by?: TeachingPlanningNamedRef | null;
  supersedes_id?: number | null;
  version_history?: ReferenceJathathaSummary[];
}

export interface ReferenceJathathaCreatePayload {
  name: string;
  teaching_reference_id: number;
  didactic_sequence_id: number;
  sequence_session_template_id?: number | null;
  default_detail_level?: JathathaDetailLevel;
  version_label?: string | null;
  external_reference?: string | null;
  objectives?: string | null;
  prerequisites?: string | null;
  materials_summary?: string | null;
  pages?: string | null;
  quick_assessment_plan?: string | null;
  fallback_plan?: string | null;
  expected_difficulties?: string | null;
  general_guidance?: string | null;
  correction_elements?: string | null;
  support_activities?: string | null;
  notes?: string | null;
  activities?: JathathaActivity[];
  attachment_ids?: number[];
}

export type ReferenceJathathaUpdatePayload = Partial<ReferenceJathathaCreatePayload>;

export interface SessionOccurrenceAllowedActions {
  view?: boolean;
  view_jathatha?: boolean;
  create_jathatha?: boolean;
  create_correction?: boolean;
  view_delivery?: boolean;
  create_delivery?: boolean;
  view_journal?: boolean;
  view_progress?: boolean;
  [key: string]: boolean | undefined;
}

export interface SessionOccurrenceSummary {
  id: number;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  state: SessionOccurrenceState;
  class: TeachingPlanningNamedRef | null;
  subject: TeachingPlanningNamedRef | null;
  teacher: TeachingPlanningNamedRef | null;
  room?: string | null;
  offering?: TeachingPlanningNamedRef | null;
  distribution?: TeachingPlanningNamedRef | null;
  assignment?: TeachingPlanningNamedRef | null;
  planned_duration_minutes?: number | null;
  is_current?: boolean;
  is_next?: boolean;
  teachable?: boolean;
  current_jathatha_id?: number | null;
  jathatha_state?: TeacherJathathaState | null;
  jathatha_review_state?: TeacherJathathaReviewState | null;
  jathatha_summary?: string | null;
  current_delivery_id?: number | null;
  delivery_state?: string | null;
  delivery_summary?: string | null;
  delivery_review_state?: string | null;
  current_journal_entry_id?: number | null;
  progress_summary?: string | null;
  allowed_actions?: SessionOccurrenceAllowedActions;
}

export interface SessionOccurrenceDetail extends SessionOccurrenceSummary {
  weekly_slot_id?: number | null;
  notes?: string | null;
  track?: TeachingPlanningNamedRef | null;
  teaching_language?: TeachingPlanningLanguageRef | null;
  teaching_reference?: TeachingPlanningNamedRef | null;
  reference?: TeachingPlanningNamedRef | null;
}

export interface TeacherJathathaRevisionSummary {
  id: number;
  revision_number: number;
  state: TeacherJathathaState;
  review_state?: TeacherJathathaReviewState | null;
  created_at?: string | null;
  confirmed_at?: string | null;
  correction_reason?: string | null;
  supersedes_id?: number | null;
  is_current?: boolean;
}

export interface TeacherJathathaSummary {
  id: number;
  name?: string | null;
  session_occurrence: SessionOccurrenceSummary | null;
  teacher: TeachingPlanningNamedRef | null;
  class: TeachingPlanningNamedRef | null;
  subject: TeachingPlanningNamedRef | null;
  offering: TeachingPlanningNamedRef | null;
  distribution: TeachingPlanningNamedRef | null;
  distribution_line: TeachingPlanningNamedRef | null;
  sequence: TeachingPlanningNamedRef | null;
  session_template: TeachingPlanningNamedRef | null;
  reference_jathatha: TeachingPlanningNamedRef | null;
  state: TeacherJathathaState;
  review_state: TeacherJathathaReviewState;
  revision_number: number;
  detail_level: JathathaDetailLevel;
  planned_duration_minutes: number | null;
  readiness?: JathathaReadiness | null;
  correction_requested?: boolean;
  correction_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: TeachingPlanningNamedRef | null;
  session_date?: string | null;
  session_start_time?: string | null;
  session_end_time?: string | null;
  allowed_actions?: TeachingPlanningAllowedActions;
}

export interface TeacherJathathaDetail extends TeacherJathathaSummary {
  session_objective?: string | null;
  materials?: string | null;
  class_adaptation?: string | null;
  quick_assessment?: string | null;
  fallback_plan?: string | null;
  teacher_notes?: string | null;
  activities: JathathaActivity[];
  attachment_ids: number[];
  blockers: string[];
  warnings: string[];
  revisions?: TeacherJathathaRevisionSummary[];
  void_reason?: string | null;
  confirmed_at?: string | null;
  snapshot_source?: {
    reference_jathatha_id?: number | null;
    sequence_session_template_id?: number | null;
    distribution_line_id?: number | null;
  } | null;
  school?: TeachingPlanningNamedRef | null;
  academic_year?: TeachingPlanningNamedRef | null;
}

export interface TeacherJathathaCreatePayload {
  session_occurrence_id: number;
  distribution_line_id: number;
  sequence_session_template_id?: number | null;
  reference_jathatha_id?: number | null;
  detail_level?: JathathaDetailLevel;
}

export interface TeacherJathathaUpdatePayload {
  session_objective?: string | null;
  materials?: string | null;
  class_adaptation?: string | null;
  quick_assessment?: string | null;
  fallback_plan?: string | null;
  teacher_notes?: string | null;
  detail_level?: JathathaDetailLevel;
  activities?: JathathaActivity[];
  attachment_ids?: number[];
}

export interface TeacherJathathaCorrectionPayload {
  reason: string;
}

export interface TeacherJathathaVoidPayload {
  reason: string;
}

export interface AdminRequestCorrectionPayload {
  reason: string;
}

export interface JathathaContextCandidateLine {
  id: number;
  name: string;
  item_type?: string | null;
  sequence?: TeachingPlanningNamedRef | null;
  recommended?: boolean;
  planned_date?: string | null;
  order?: number | null;
}

export interface JathathaContextCandidateTemplate {
  id: number;
  name: string;
  session_type?: string | null;
  sequence_id?: number | null;
  recommended?: boolean;
  order?: number | null;
}

export interface JathathaContextResponse {
  occurrence: SessionOccurrenceDetail | null;
  assignment: TeachingPlanningNamedRef | null;
  offering: TeachingPlanningNamedRef | null;
  active_distribution: TeachingPlanningNamedRef | null;
  candidate_distribution_lines: JathathaContextCandidateLine[];
  candidate_session_templates: JathathaContextCandidateTemplate[];
  approved_reference_jathatha: ReferenceJathathaSummary | null;
  current_teacher_jathatha: TeacherJathathaSummary | null;
  readiness?: JathathaReadiness | null;
  blockers: string[];
  warnings: string[];
  allowed_actions?: TeachingPlanningAllowedActions;
}

export const JATHATHA_ACTIVITY_TYPES: JathathaActivityType[] = [
  'situation',
  'exercise',
  'discussion',
  'experiment',
  'assessment',
  'support',
  'project',
  'institutionalization',
  'other',
];

export const JATHATHA_PHASE_TYPES: JathathaPhaseType[] = [
  'didactic_contract',
  'action',
  'formulation',
  'discussion',
  'validation',
  'institutionalization',
  'practice',
  'assessment',
  'support',
  'synthesis',
  'custom',
];

export const JATHATHA_DETAIL_LEVELS: JathathaDetailLevel[] = [
  'compact',
  'standard',
  'detailed',
];

export const REFERENCE_JATHATHA_STATES: ReferenceJathathaState[] = [
  'draft',
  'under_review',
  'approved',
  'archived',
];

export const TEACHER_JATHATHA_STATES: TeacherJathathaState[] = [
  'draft',
  'ready',
  'confirmed',
  'corrected',
  'superseded',
  'voided',
];

export const TEACHER_JATHATHA_REVIEW_STATES: TeacherJathathaReviewState[] = [
  'not_reviewed',
  'reviewed',
  'correction_requested',
];

/** Known backend error codes for friendly mapping. */
export const JATHATHA_ERROR_CODES = [
  'reference_jathatha_duplicate_approved',
  'reference_jathatha_context_mismatch',
  'reference_jathatha_template_required',
  'reference_jathatha_template_mismatch',
  'reference_jathatha_immutable',
  'reference_jathatha_in_use',
  'jathatha_occurrence_required',
  'jathatha_occurrence_not_teachable',
  'jathatha_assignment_required',
  'jathatha_assignment_ambiguous',
  'jathatha_offering_required',
  'jathatha_offering_not_active',
  'jathatha_active_distribution_required',
  'jathatha_distribution_line_required',
  'jathatha_distribution_line_mismatch',
  'jathatha_sequence_template_required',
  'jathatha_sequence_template_mismatch',
  'jathatha_reference_not_approved',
  'jathatha_current_revision_exists',
  'jathatha_revision_conflict',
  'jathatha_not_ready',
  'jathatha_duration_invalid',
  'jathatha_duration_exceeds_occurrence',
  'jathatha_immutable',
  'jathatha_correction_reason_required',
  'jathatha_void_reason_required',
  'jathatha_review_state_invalid',
  'jathatha_scope_mismatch',
] as const;
