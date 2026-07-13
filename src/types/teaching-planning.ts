/** Teaching Reference + Offering types — synced with ODOO-TEACHING-OFFERING-REFERENCE-CONTRACT-2. */

export type TeachingPlanningLifecycleState =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'archived'
  | string;

export type TeachingReferenceLifecycleAction =
  | 'view'
  | 'edit'
  | 'submit_for_review'
  | 'approve'
  | 'reset_to_draft'
  | 'archive'
  | 'duplicate_version'
  | 'delete'
  | 'manage_attachments';

export type TeachingOfferingLifecycleAction =
  | 'view'
  | 'edit'
  | 'submit_for_review'
  | 'approve'
  | 'reset_to_draft'
  | 'archive'
  | 'duplicate'
  | 'delete'
  | 'link_assignments';

export type TeachingPlanningAllowedActions = Partial<
  Record<
    TeachingReferenceLifecycleAction | TeachingOfferingLifecycleAction | string,
    boolean
  >
>;

export interface TeachingPlanningNamedRef {
  id: number;
  name: string;
  code?: string | null;
}

export interface TeachingPlanningLanguageRef {
  id: number;
  code: string;
  name: string;
}

export interface TeachingOfferingReadiness {
  identity_ready: boolean;
  reference_ready: boolean;
  assignments_ready: boolean;
  assignments_count: number;
  classes_count: number;
  teachers_count: number;
  distribution_ready: boolean;
  ready_for_approval: boolean;
  ready_for_activation: boolean;
  blockers: string[];
}

/** Offering activation is a distinct action gated by Backend allowed_actions.activate. */
export type TeachingOfferingActivationAction = TeachingOfferingLifecycleAction | 'activate';

export interface TeachingReferenceSummary {
  id: number;
  name: string;
  school: TeachingPlanningNamedRef;
  subject: TeachingPlanningNamedRef;
  level: TeachingPlanningNamedRef;
  teaching_language: TeachingPlanningLanguageRef | null;
  track: TeachingPlanningNamedRef | null;
  publisher: string | null;
  edition: string | null;
  version_label: string | null;
  reference_code: string | null;
  isbn: string | null;
  state: TeachingPlanningLifecycleState;
  active: boolean;
  supersedes_id: number | null;
  offering_count: number;
  allowed_actions?: TeachingPlanningAllowedActions;
}

export interface TeachingReferenceDetail extends TeachingReferenceSummary {
  notes: string | null;
  approved_by_id: number | null;
  approved_at: string | null;
  reset_reason: string | null;
  archived_by_id: number | null;
  archived_at: string | null;
  student_book_attachment_ids: number[];
  teacher_guide_attachment_ids: number[];
  supplementary_attachment_ids: number[];
}

export interface TeachingOfferingAssignmentSummary {
  id: number;
  class: TeachingPlanningNamedRef | null;
  teacher: TeachingPlanningNamedRef | null;
  subject: TeachingPlanningNamedRef | null;
  state: string;
  active: boolean;
  role: string | null;
}

export interface TeachingOfferingSummary {
  id: number;
  display_name: string;
  school: TeachingPlanningNamedRef;
  academic_year: TeachingPlanningNamedRef;
  level: TeachingPlanningNamedRef;
  subject: TeachingPlanningNamedRef;
  teaching_language: TeachingPlanningLanguageRef | null;
  track: TeachingPlanningNamedRef | null;
  reference: TeachingReferenceSummary | null;
  state: TeachingPlanningLifecycleState;
  active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  assignment_count: number;
  class_count: number;
  teacher_count: number;
  readiness: TeachingOfferingReadiness;
  activation_blockers: string[];
  /** Active Annual Distribution driving readiness, when one exists. */
  active_distribution?: AnnualDistributionSummary | null;
  distribution_count?: number;
  allowed_actions?: TeachingPlanningAllowedActions;
}

export interface TeachingOfferingDetail extends TeachingOfferingSummary {
  notes: string | null;
  approved_by_id: number | null;
  approved_at: string | null;
  reset_reason: string | null;
  archived_by_id: number | null;
  archived_at: string | null;
  assignments: TeachingOfferingAssignmentSummary[];
}

export interface TeachingReferenceCreatePayload {
  name: string;
  school_id: number;
  subject_id: number;
  level_id: number;
  teaching_language_id: number;
  track_id?: number | null;
  publisher?: string | null;
  edition?: string | null;
  version_label?: string | null;
  reference_code?: string | null;
  isbn?: string | null;
  notes?: string | null;
}

export type TeachingReferenceUpdatePayload = Partial<TeachingReferenceCreatePayload>;

export interface TeachingOfferingCreatePayload {
  school_id: number;
  academic_year_id: number;
  level_id: number;
  subject_id: number;
  teaching_language_id: number;
  track_id?: number | null;
  reference_id?: number | null;
  notes?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
}

export type TeachingOfferingUpdatePayload = Partial<TeachingOfferingCreatePayload>;

export interface TeachingPlanningResetPayload {
  reason?: string;
  reset_reason?: string;
}

/* -------------------------------------------------------------------------- */
/* Didactic Sequence                                                          */
/*                                                                            */
/* A Didactic Sequence is the pedagogical plan for ONE lesson/unit — the      */
/* ordered set of session TEMPLATES a teacher expects to run. It is NOT a     */
/* Jathatha (daily lesson-preparation sheet) and NOT the timetable.           */
/* -------------------------------------------------------------------------- */

export type DidacticSequenceState =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'archived'
  | string;

export type DidacticSessionType =
  | 'construction'
  | 'practice'
  | 'consolidation'
  | 'assessment'
  | 'support'
  | 'support_impact_assessment'
  | 'focused_remediation'
  | 'enrichment'
  | 'synthesis'
  | 'project'
  | 'experiment'
  | 'review'
  | 'other'
  | string;

export type DidacticSequenceLifecycleAction =
  | 'view'
  | 'edit'
  | 'submit_for_review'
  | 'approve'
  | 'reset_to_draft'
  | 'archive'
  | 'duplicate_version'
  | 'delete';

/**
 * A planned session inside a sequence — a TEMPLATE, not a scheduled/actual
 * session. `expected_session_count` is how many real sessions this template is
 * expected to cover.
 */
export interface DidacticSequenceSessionTemplate {
  id?: number;
  order: number;
  name: string;
  session_type: DidacticSessionType;
  expected_session_count: number;
  objective: string | null;
  pages: string | null;
  completion_criteria: string | null;
  support_notes: string | null;
  active: boolean;
}

export interface DidacticSequenceVersioning {
  version_label: string | null;
  supersedes_id: number | null;
  superseded_by_id: number | null;
  is_latest_version: boolean;
}

export interface DidacticSequenceSummary {
  id: number;
  name: string;
  school: TeachingPlanningNamedRef;
  subject: TeachingPlanningNamedRef;
  level: TeachingPlanningNamedRef;
  teaching_language: TeachingPlanningLanguageRef | null;
  track: TeachingPlanningNamedRef | null;
  reference: TeachingReferenceSummary | null;
  unit: string | null;
  lesson: string | null;
  state: DidacticSequenceState;
  active: boolean;
  version_label: string | null;
  supersedes_id: number | null;
  expected_session_count: number;
  session_template_count: number;
  allowed_actions?: TeachingPlanningAllowedActions;
}

export interface DidacticSequenceDetail extends DidacticSequenceSummary {
  objectives: string | null;
  prerequisites: string | null;
  concepts_and_skills: string | null;
  pages: string | null;
  completion_criteria: string | null;
  support_activities: string | null;
  notes: string | null;
  versioning: DidacticSequenceVersioning;
  session_templates: DidacticSequenceSessionTemplate[];
  approved_by_id: number | null;
  approved_at: string | null;
  reset_reason: string | null;
  archived_by_id: number | null;
  archived_at: string | null;
}

export interface DidacticSequenceSessionTemplatePayload {
  id?: number;
  order: number;
  name: string;
  session_type: DidacticSessionType;
  expected_session_count: number;
  objective?: string | null;
  pages?: string | null;
  completion_criteria?: string | null;
  support_notes?: string | null;
  active?: boolean;
}

export interface DidacticSequenceCreatePayload {
  name: string;
  school_id: number;
  subject_id: number;
  level_id: number;
  teaching_language_id: number;
  track_id?: number | null;
  reference_id?: number | null;
  unit?: string | null;
  lesson?: string | null;
  objectives?: string | null;
  prerequisites?: string | null;
  concepts_and_skills?: string | null;
  pages?: string | null;
  completion_criteria?: string | null;
  support_activities?: string | null;
  notes?: string | null;
  version_label?: string | null;
  session_templates?: DidacticSequenceSessionTemplatePayload[];
}

export type DidacticSequenceUpdatePayload = Partial<DidacticSequenceCreatePayload>;

/* -------------------------------------------------------------------------- */
/* Annual Distribution                                                        */
/*                                                                            */
/* An Annual Distribution is the year-long ordered plan of instructional      */
/* items for one Teaching Offering. It is NOT the timetable (weekly slots)    */
/* and NOT a timetable requirement. Approving/activating a distribution is    */
/* what satisfies the offering's `distribution_ready` readiness flag.         */
/* -------------------------------------------------------------------------- */

export type AnnualDistributionState =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'archived'
  | string;

export type AnnualDistributionLifecycleAction =
  | 'view'
  | 'edit'
  | 'submit_for_review'
  | 'approve'
  | 'reset_to_draft'
  | 'archive'
  | 'duplicate_version'
  | 'activate'
  | 'manage_lines'
  | 'delete';

export type AnnualDistributionItemType =
  | 'sequence'
  | 'assessment'
  | 'support'
  | 'synthesis'
  | 'project'
  | 'review'
  | 'other'
  | string;

export interface AnnualDistributionTotals {
  line_count: number;
  sequence_count: number;
  total_sessions: number;
}

export interface AnnualDistributionReadiness {
  has_lines: boolean;
  sequences_resolved: boolean;
  dates_valid: boolean;
  ready_for_approval: boolean;
  ready_for_activation: boolean;
  blockers: string[];
}

export interface AnnualDistributionVersionRef {
  id: number;
  version_label: string | null;
  state: AnnualDistributionState;
}

export interface AnnualDistributionLine {
  id?: number;
  order: number;
  item_type: AnnualDistributionItemType;
  sequence: DidacticSequenceSummary | null;
  name: string | null;
  period_label: string | null;
  date_start: string | null;
  date_end: string | null;
  session_count: number | null;
  external_reference: string | null;
  notes: string | null;
}

export interface AnnualDistributionSummary {
  id: number;
  name: string;
  offering: TeachingOfferingSummary | null;
  reference: TeachingReferenceSummary | null;
  academic_year: TeachingPlanningNamedRef | null;
  school: TeachingPlanningNamedRef | null;
  subject: TeachingPlanningNamedRef | null;
  level: TeachingPlanningNamedRef | null;
  teaching_language: TeachingPlanningLanguageRef | null;
  track: TeachingPlanningNamedRef | null;
  period_label: string | null;
  date_start: string | null;
  date_end: string | null;
  state: AnnualDistributionState;
  active: boolean;
  version_label: string | null;
  supersedes_id: number | null;
  totals: AnnualDistributionTotals;
  readiness: AnnualDistributionReadiness;
  allowed_actions?: TeachingPlanningAllowedActions;
}

export interface AnnualDistributionDetail extends AnnualDistributionSummary {
  notes: string | null;
  blockers: string[];
  active_version: AnnualDistributionVersionRef | null;
  replacement_version: AnnualDistributionVersionRef | null;
  superseded_by_id: number | null;
  is_latest_version: boolean;
  lines: AnnualDistributionLine[];
  approved_by_id: number | null;
  approved_at: string | null;
  activated_by_id: number | null;
  activated_at: string | null;
  reset_reason: string | null;
  archived_by_id: number | null;
  archived_at: string | null;
}

export interface AnnualDistributionCreatePayload {
  offering_id: number;
  name?: string | null;
  period_label?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  notes?: string | null;
  version_label?: string | null;
}

export type AnnualDistributionUpdatePayload = Partial<
  Omit<AnnualDistributionCreatePayload, 'offering_id'>
>;

export interface AnnualDistributionLinePayload {
  id?: number;
  order: number;
  item_type: AnnualDistributionItemType;
  sequence_id?: number | null;
  name?: string | null;
  period_label?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  session_count?: number | null;
  external_reference?: string | null;
  notes?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/*                                                                            */
/* Instructional Item ≠ Calendar Marker. Instructional items come from the    */
/* distribution's lines (what to teach). Calendar markers come from the       */
/* academic calendar (holidays, exam windows, term boundaries). The combined  */
/* timeline interleaves both, preserving `kind` so the two are never merged.  */
/* -------------------------------------------------------------------------- */

export interface TimelineInstructionalItem {
  kind: 'instructional_item';
  id: number;
  order: number;
  item_type: AnnualDistributionItemType;
  name: string;
  sequence_id: number | null;
  period_label: string | null;
  date_start: string | null;
  date_end: string | null;
  session_count: number | null;
}

export interface TimelineCalendarMarker {
  kind: 'calendar_marker';
  id: number;
  marker_type: string;
  name: string;
  date_start: string | null;
  date_end: string | null;
  is_instructional_break: boolean;
}

export type TimelineEntry = TimelineInstructionalItem | TimelineCalendarMarker;

export interface AnnualDistributionTimeline {
  instructional_items: TimelineInstructionalItem[];
  calendar_markers: TimelineCalendarMarker[];
  combined_timeline: TimelineEntry[];
}

/* -------------------------------------------------------------------------- */
/* Batch validate / apply for distribution lines                             */
/* -------------------------------------------------------------------------- */

export type DistributionBatchApplyMode = 'append' | 'replace' | 'upsert';

export interface DistributionBatchRowError {
  row: number;
  field: string | null;
  code: string;
  message: string;
}

export interface DistributionBatchValidationResponse {
  valid: boolean;
  row_count: number;
  errors: DistributionBatchRowError[];
  normalized_rows: AnnualDistributionLinePayload[];
}

export interface DistributionBatchApplySummary {
  created: number;
  updated: number;
  skipped: number;
  errors: DistributionBatchRowError[];
}
