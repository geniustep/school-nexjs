/**
 * Teaching Assessment / Support / Remediation contracts —
 * synced with Odoo 18.0.1.0.221 (commit c3b615bf2fbe440dab5b4101239387a18516f3ab).
 *
 * Semantic guards:
 * - Observation ≠ Gradebook score (adjacent pedagogical layer)
 * - Difficulty is manual — never inferred from score
 * - Support Decision / Plan do not mutate Curriculum Progress
 * - Reassessment preserves the original observation
 * - Support Plan completion only via Backend delivery sync
 */

export const MASTERY_BATCH_LIMIT = 500;

export type MasteryObservationState = 'draft' | 'confirmed' | 'superseded' | 'voided' | string;
export type ParticipationState =
  | 'taken'
  | 'absent'
  | 'absent_justified'
  | 'not_assessed'
  | 'exempted'
  | string;
export type AssessmentDomain =
  | 'classroom_informal'
  | 'diagnostic'
  | 'continuous_gradebook'
  | 'formal_exam'
  | string;
export type DifficultyState = 'draft' | 'confirmed' | 'resolved' | 'superseded' | 'voided' | string;
export type SupportDecisionType =
  | 'individual_support'
  | 'group_support'
  | 'monitor'
  | 'focused_remediation'
  | 'enrichment'
  | 'no_action'
  | string;
export type SupportDecisionState = 'draft' | 'confirmed' | 'superseded' | 'voided' | string;
export type SupportGroupType = 'support' | 'focused_remediation' | 'enrichment' | string;
export type SupportPlanType =
  | 'support'
  | 'consolidation'
  | 'focused_remediation'
  | 'enrichment'
  | 'synthesis'
  | string;
export type SupportPlanState =
  | 'draft'
  | 'planned'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'superseded'
  | string;
export type OrganizationMode = 'individual' | 'pair' | 'group' | 'whole_class' | string;
export type ReassessmentOutcome =
  | 'mastered'
  | 'improved_needs_follow_up'
  | 'needs_focused_remediation'
  | 'not_assessed'
  | string;

export interface LearningObjectiveSummary {
  id: number;
  school_id?: number | null;
  academic_year_id?: number | null;
  code?: string | null;
  name?: string | null;
  subject_id?: number | null;
  level_id?: number | null;
  teaching_offering_id?: number | null;
  annual_distribution_line_id?: number | null;
  didactic_sequence_id?: number | null;
  state?: string | null;
  active?: boolean;
  version?: number | null;
  supersedes_id?: number | null;
}

export interface LearningObjectiveDetail extends LearningObjectiveSummary {
  description?: string | null;
  success_criteria?: string | null;
  language?: string | null;
}

export interface MasteryScaleLevel {
  id: number;
  scale_id?: number | null;
  code?: string | null;
  name?: string | null;
  sequence?: number | null;
  is_mastered?: boolean;
  color?: string | null;
  active?: boolean;
}

export interface MasteryScale {
  id: number;
  school_id?: number | null;
  name?: string | null;
  code?: string | null;
  state?: string | null;
  is_default?: boolean;
  version?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;
  levels?: MasteryScaleLevel[];
}

export interface MasteryObservation {
  id: number;
  school_id?: number | null;
  academic_year_id?: number | null;
  class_id?: number | null;
  student_id?: number | null;
  student_name?: string | null;
  subject_id?: number | null;
  learning_objective_id?: number | null;
  mastery_scale_id?: number | null;
  mastery_level_id?: number | null;
  mastery_scale_code?: string | null;
  mastery_level_code?: string | null;
  participation_state?: ParticipationState | null;
  assessment_domain?: AssessmentDomain | null;
  source_model?: string | null;
  source_res_id?: number | null;
  attempt_no?: number | null;
  state?: MasteryObservationState | null;
  is_current?: boolean;
  supersedes_id?: number | null;
  observed_at?: string | null;
  reference_score?: number | null;
  reference_score_is_set?: boolean;
  observation_text?: string | null;
  correction_reason?: string | null;
}

export interface MasteryMatrixCell {
  student_id: number;
  learning_objective_id: number;
  observation: MasteryObservation | null;
}

export interface MasteryMatrixStudent {
  id: number;
  name: string;
}

export interface MasteryMatrixPayload {
  school_id: number;
  academic_year_id: number;
  class_id: number;
  subject_id: number;
  students: MasteryMatrixStudent[];
  objectives: LearningObjectiveSummary[];
  cells: MasteryMatrixCell[];
  cell_count: number;
}

export interface MasteryBatchRow {
  student_id: number;
  learning_objective_id: number;
  participation_state?: ParticipationState;
  mastery_level_id?: number | null;
  observation_text?: string | null;
  attempt_no?: number;
  source_model?: string | null;
  source_res_id?: number | null;
  assessment_domain?: AssessmentDomain | null;
  reference_score?: number | null;
  reference_score_is_set?: boolean;
}

export interface MasteryBatchPayload {
  academic_year_id: number;
  class_id: number;
  subject_id: number;
  mastery_scale_id: number;
  rows: MasteryBatchRow[];
  confirm?: boolean;
  teacher_assignment_id?: number | null;
  assessment_domain?: AssessmentDomain | null;
}

export interface MasteryBatchResult {
  created_ids: number[];
  updated_ids: number[];
  confirmed: boolean;
  row_count: number;
}

export interface DifficultyCategory {
  id: number;
  school_id?: number | null;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  active?: boolean;
}

export interface DifficultyRecord {
  id: number;
  school_id?: number | null;
  class_id?: number | null;
  student_id?: number | null;
  student_name?: string | null;
  subject_id?: number | null;
  learning_objective_id?: number | null;
  observation_id?: number | null;
  difficulty_category_id?: number | null;
  priority?: string | null;
  state?: DifficultyState | null;
  is_current?: boolean;
  recorded_at?: string | null;
  interpretation_text?: string | null;
  correction_reason?: string | null;
  resolve_note?: string | null;
}

export interface SupportDecision {
  id: number;
  school_id?: number | null;
  class_id?: number | null;
  subject_id?: number | null;
  student_id?: number | null;
  student_name?: string | null;
  support_group_id?: number | null;
  difficulty_id?: number | null;
  learning_objective_id?: number | null;
  decision_type?: SupportDecisionType | null;
  state?: SupportDecisionState | null;
  is_current?: boolean;
  decided_at?: string | null;
  support_plan_id?: number | null;
  reason?: string | null;
  correction_reason?: string | null;
}

export interface SupportGroupMembership {
  id: number;
  group_id?: number | null;
  student_id?: number | null;
  student_name?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
  state?: string | null;
  support_decision_id?: number | null;
}

export interface SupportGroup {
  id: number;
  school_id?: number | null;
  academic_year_id?: number | null;
  class_id?: number | null;
  subject_id?: number | null;
  name?: string | null;
  group_type?: SupportGroupType | null;
  learning_objective_id?: number | null;
  support_goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  state?: string | null;
  active_member_count?: number | null;
  memberships?: SupportGroupMembership[];
}

export interface SupportPlan {
  id: number;
  school_id?: number | null;
  class_id?: number | null;
  subject_id?: number | null;
  student_id?: number | null;
  student_name?: string | null;
  support_group_id?: number | null;
  learning_objective_id?: number | null;
  difficulty_id?: number | null;
  support_decision_id?: number | null;
  plan_type?: SupportPlanType | null;
  organization_mode?: OrganizationMode | null;
  distribution_line_id?: number | null;
  jathatha_id?: number | null;
  occurrence_id?: number | null;
  delivery_id?: number | null;
  planned_date?: string | null;
  state?: SupportPlanState | null;
  therapeutic_goal?: string | null;
  activity_description?: string | null;
  method_or_alternative?: string | null;
}

export interface ReassessmentLevelSnippet {
  observation_id?: number | null;
  mastery_level_id?: number | null;
  participation_state?: ParticipationState | null;
}

export interface ReassessmentRecord {
  id: number;
  school_id?: number | null;
  class_id?: number | null;
  student_id?: number | null;
  student_name?: string | null;
  subject_id?: number | null;
  learning_objective_id?: number | null;
  original_observation_id?: number | null;
  reassessment_observation_id?: number | null;
  support_plan_id?: number | null;
  attempt_no?: number | null;
  outcome?: ReassessmentOutcome | null;
  follow_up_decision_id?: number | null;
  state?: string | null;
  is_current?: boolean;
  before?: ReassessmentLevelSnippet | null;
  after?: ReassessmentLevelSnippet | null;
  task_equivalence_note?: string | null;
  correction_reason?: string | null;
}

export interface AdminAssessmentSupportSummary {
  context: {
    school_id?: number | null;
    academic_year_id?: number | null;
    class_id?: number | null;
    subject_id?: number | null;
  };
  objectives_count: number;
  assessed_students_count: number;
  observations_count: number;
  mastery_distribution_counts: Record<string, number>;
  not_assessed_count: number;
  difficulties_count: number;
  open_support_decisions_count: number;
  active_support_groups_count: number;
  planned_support_count: number;
  delivered_support_count: number;
  reassessment_due_count: number;
  reassessment_outcome_counts: Record<string, number>;
  privacy: {
    includes_student_names: boolean;
    includes_observation_text: boolean;
    includes_interpretation_text: boolean;
    includes_membership_list: boolean;
  };
}

export interface AdminStudentAssessmentDetail {
  student_id: number;
  student_name?: string | null;
  observations: MasteryObservation[];
  difficulties: DifficultyRecord[];
  support_decisions: SupportDecision[];
}

export type TeacherAssessmentSupportTab =
  | 'objectives'
  | 'matrix'
  | 'difficulties'
  | 'decisions'
  | 'groups'
  | 'plans'
  | 'reassessments';
