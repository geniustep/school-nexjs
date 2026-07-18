/**
 * Normalization for Odoo 221 Assessment Support payloads — Backend SoT.
 */

import type {
  AdminAssessmentSupportSummary,
  AdminStudentAssessmentDetail,
  DifficultyCategory,
  DifficultyRecord,
  LearningObjectiveDetail,
  LearningObjectiveSummary,
  MasteryBatchResult,
  MasteryMatrixPayload,
  MasteryObservation,
  MasteryScale,
  MasteryScaleLevel,
  ReassessmentRecord,
  SupportDecision,
  SupportGroup,
  SupportGroupMembership,
  SupportPlan,
} from '@/types/teaching-assessment-support';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : value == null ? null : String(value);
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function listItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  if (Array.isArray(record?.items)) return record.items;
  if (Array.isArray(record?.data)) return record.data;
  return [];
}

function unwrap(raw: unknown): unknown {
  const record = asRecord(raw);
  if (record && 'data' in record && record.data != null) return record.data;
  return raw;
}

export function normalizeLearningObjective(
  raw: unknown,
  detail = false,
): LearningObjectiveSummary | LearningObjectiveDetail | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const base: LearningObjectiveSummary = {
    id,
    school_id: asNumber(r.school_id),
    academic_year_id: asNumber(r.academic_year_id),
    code: asString(r.code),
    name: asString(r.name),
    subject_id: asNumber(r.subject_id),
    level_id: asNumber(r.level_id),
    teaching_offering_id: asNumber(r.teaching_offering_id),
    annual_distribution_line_id: asNumber(r.annual_distribution_line_id),
    didactic_sequence_id: asNumber(r.didactic_sequence_id),
    state: asString(r.state),
    active: asBoolean(r.active),
    version: asNumber(r.version),
    supersedes_id: asNumber(r.supersedes_id),
  };
  if (!detail) return base;
  return {
    ...base,
    description: asString(r.description),
    success_criteria: asString(r.success_criteria),
    language: asString(r.language),
  };
}

export function normalizeLearningObjectives(raw: unknown): LearningObjectiveSummary[] {
  return listItems(unwrap(raw))
    .map((item) => normalizeLearningObjective(item, false))
    .filter((item): item is LearningObjectiveSummary => item != null);
}

export function normalizeMasteryScaleLevel(raw: unknown): MasteryScaleLevel | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    scale_id: asNumber(r.scale_id),
    code: asString(r.code),
    name: asString(r.name),
    sequence: asNumber(r.sequence),
    is_mastered: asBoolean(r.is_mastered),
    color: asString(r.color),
    active: asBoolean(r.active),
  };
}

export function normalizeMasteryScale(raw: unknown): MasteryScale | null {
  const r = asRecord(unwrap(raw));
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const levels = Array.isArray(r.levels)
    ? r.levels
        .map(normalizeMasteryScaleLevel)
        .filter((item): item is MasteryScaleLevel => item != null)
    : [];
  return {
    id,
    school_id: asNumber(r.school_id),
    name: asString(r.name),
    code: asString(r.code),
    state: asString(r.state),
    is_default: asBoolean(r.is_default),
    version: asNumber(r.version),
    effective_from: asString(r.effective_from),
    effective_to: asString(r.effective_to),
    levels,
  };
}

export function normalizeMasteryObservation(raw: unknown): MasteryObservation | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    school_id: asNumber(r.school_id),
    academic_year_id: asNumber(r.academic_year_id),
    class_id: asNumber(r.class_id),
    student_id: asNumber(r.student_id),
    student_name: asString(r.student_name),
    subject_id: asNumber(r.subject_id),
    learning_objective_id: asNumber(r.learning_objective_id),
    mastery_scale_id: asNumber(r.mastery_scale_id),
    mastery_level_id: asNumber(r.mastery_level_id),
    mastery_scale_code: asString(r.mastery_scale_code),
    mastery_level_code: asString(r.mastery_level_code),
    participation_state: asString(r.participation_state),
    assessment_domain: asString(r.assessment_domain),
    source_model: asString(r.source_model),
    source_res_id: asNumber(r.source_res_id),
    attempt_no: asNumber(r.attempt_no),
    state: asString(r.state),
    is_current: asBoolean(r.is_current),
    supersedes_id: asNumber(r.supersedes_id),
    observed_at: asString(r.observed_at),
    reference_score: asNumber(r.reference_score),
    reference_score_is_set: asBoolean(r.reference_score_is_set),
    observation_text: asString(r.observation_text),
    correction_reason: asString(r.correction_reason),
  };
}

export function normalizeMasteryMatrix(raw: unknown): MasteryMatrixPayload {
  const r = asRecord(unwrap(raw)) ?? {};
  const students = listItems(r.students)
    .map((item) => {
      const row = asRecord(item);
      const id = asNumber(row?.id);
      if (id == null) return null;
      return { id, name: asString(row?.name) ?? `#${id}` };
    })
    .filter((item): item is { id: number; name: string } => item != null);
  const objectives = listItems(r.objectives)
    .map((item) => normalizeLearningObjective(item, false))
    .filter((item): item is LearningObjectiveSummary => item != null);
  const cells = listItems(r.cells)
    .map((item) => {
      const row = asRecord(item);
      const studentId = asNumber(row?.student_id);
      const objectiveId = asNumber(row?.learning_objective_id);
      if (studentId == null || objectiveId == null) return null;
      return {
        student_id: studentId,
        learning_objective_id: objectiveId,
        observation: row?.observation ? normalizeMasteryObservation(row.observation) : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
  return {
    school_id: asNumber(r.school_id) ?? 0,
    academic_year_id: asNumber(r.academic_year_id) ?? 0,
    class_id: asNumber(r.class_id) ?? 0,
    subject_id: asNumber(r.subject_id) ?? 0,
    students,
    objectives,
    cells,
    cell_count: asNumber(r.cell_count) ?? cells.length,
  };
}

export function normalizeMasteryBatchResult(raw: unknown): MasteryBatchResult {
  const r = asRecord(unwrap(raw)) ?? {};
  const created = Array.isArray(r.created_ids)
    ? r.created_ids.map(asNumber).filter((n): n is number => n != null)
    : [];
  const updated = Array.isArray(r.updated_ids)
    ? r.updated_ids.map(asNumber).filter((n): n is number => n != null)
    : [];
  return {
    created_ids: created,
    updated_ids: updated,
    confirmed: Boolean(r.confirmed),
    row_count: asNumber(r.row_count) ?? created.length + updated.length,
  };
}

export function normalizeDifficulty(raw: unknown): DifficultyRecord | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    school_id: asNumber(r.school_id),
    class_id: asNumber(r.class_id),
    student_id: asNumber(r.student_id),
    student_name: asString(r.student_name),
    subject_id: asNumber(r.subject_id),
    learning_objective_id: asNumber(r.learning_objective_id),
    observation_id: asNumber(r.observation_id),
    difficulty_category_id: asNumber(r.difficulty_category_id),
    priority: asString(r.priority),
    state: asString(r.state),
    is_current: asBoolean(r.is_current),
    recorded_at: asString(r.recorded_at),
    interpretation_text: asString(r.interpretation_text),
    correction_reason: asString(r.correction_reason),
    resolve_note: asString(r.resolve_note),
  };
}

export function normalizeDifficulties(raw: unknown): DifficultyRecord[] {
  return listItems(unwrap(raw))
    .map(normalizeDifficulty)
    .filter((item): item is DifficultyRecord => item != null);
}

export function normalizeDifficultyCategory(raw: unknown): DifficultyCategory | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    school_id: asNumber(r.school_id),
    code: asString(r.code),
    name: asString(r.name),
    description: asString(r.description),
    active: asBoolean(r.active),
  };
}

export function normalizeSupportDecision(raw: unknown): SupportDecision | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    school_id: asNumber(r.school_id),
    class_id: asNumber(r.class_id),
    subject_id: asNumber(r.subject_id),
    student_id: asNumber(r.student_id),
    student_name: asString(r.student_name),
    support_group_id: asNumber(r.support_group_id),
    difficulty_id: asNumber(r.difficulty_id),
    learning_objective_id: asNumber(r.learning_objective_id),
    decision_type: asString(r.decision_type),
    state: asString(r.state),
    is_current: asBoolean(r.is_current),
    decided_at: asString(r.decided_at),
    support_plan_id: asNumber(r.support_plan_id),
    reason: asString(r.reason),
    correction_reason: asString(r.correction_reason),
  };
}

export function normalizeSupportDecisions(raw: unknown): SupportDecision[] {
  return listItems(unwrap(raw))
    .map(normalizeSupportDecision)
    .filter((item): item is SupportDecision => item != null);
}

export function normalizeSupportMembership(raw: unknown): SupportGroupMembership | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    group_id: asNumber(r.group_id),
    student_id: asNumber(r.student_id),
    student_name: asString(r.student_name),
    joined_at: asString(r.joined_at),
    left_at: asString(r.left_at),
    state: asString(r.state),
    support_decision_id: asNumber(r.support_decision_id),
  };
}

export function normalizeSupportGroup(raw: unknown): SupportGroup | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const memberships = Array.isArray(r.memberships)
    ? r.memberships
        .map(normalizeSupportMembership)
        .filter((item): item is SupportGroupMembership => item != null)
    : undefined;
  return {
    id,
    school_id: asNumber(r.school_id),
    academic_year_id: asNumber(r.academic_year_id),
    class_id: asNumber(r.class_id),
    subject_id: asNumber(r.subject_id),
    name: asString(r.name),
    group_type: asString(r.group_type),
    learning_objective_id: asNumber(r.learning_objective_id),
    support_goal: asString(r.support_goal),
    start_date: asString(r.start_date),
    end_date: asString(r.end_date),
    state: asString(r.state),
    active_member_count: asNumber(r.active_member_count),
    memberships,
  };
}

export function normalizeSupportGroups(raw: unknown): SupportGroup[] {
  return listItems(unwrap(raw))
    .map(normalizeSupportGroup)
    .filter((item): item is SupportGroup => item != null);
}

export function normalizeSupportPlan(raw: unknown): SupportPlan | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    school_id: asNumber(r.school_id),
    class_id: asNumber(r.class_id),
    subject_id: asNumber(r.subject_id),
    student_id: asNumber(r.student_id),
    student_name: asString(r.student_name),
    support_group_id: asNumber(r.support_group_id),
    learning_objective_id: asNumber(r.learning_objective_id),
    difficulty_id: asNumber(r.difficulty_id),
    support_decision_id: asNumber(r.support_decision_id),
    plan_type: asString(r.plan_type),
    organization_mode: asString(r.organization_mode),
    distribution_line_id: asNumber(r.distribution_line_id),
    jathatha_id: asNumber(r.jathatha_id),
    occurrence_id: asNumber(r.occurrence_id),
    delivery_id: asNumber(r.delivery_id),
    planned_date: asString(r.planned_date),
    state: asString(r.state),
    therapeutic_goal: asString(r.therapeutic_goal),
    activity_description: asString(r.activity_description),
    method_or_alternative: asString(r.method_or_alternative),
  };
}

export function normalizeSupportPlans(raw: unknown): SupportPlan[] {
  return listItems(unwrap(raw))
    .map(normalizeSupportPlan)
    .filter((item): item is SupportPlan => item != null);
}

export function normalizeReassessment(raw: unknown): ReassessmentRecord | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const before = asRecord(r.before);
  const after = asRecord(r.after);
  return {
    id,
    school_id: asNumber(r.school_id),
    class_id: asNumber(r.class_id),
    student_id: asNumber(r.student_id),
    student_name: asString(r.student_name),
    subject_id: asNumber(r.subject_id),
    learning_objective_id: asNumber(r.learning_objective_id),
    original_observation_id: asNumber(r.original_observation_id),
    reassessment_observation_id: asNumber(r.reassessment_observation_id),
    support_plan_id: asNumber(r.support_plan_id),
    attempt_no: asNumber(r.attempt_no),
    outcome: asString(r.outcome),
    follow_up_decision_id: asNumber(r.follow_up_decision_id),
    state: asString(r.state),
    is_current: asBoolean(r.is_current),
    before: before
      ? {
          observation_id: asNumber(before.observation_id),
          mastery_level_id: asNumber(before.mastery_level_id),
          participation_state: asString(before.participation_state),
        }
      : null,
    after: after
      ? {
          observation_id: asNumber(after.observation_id),
          mastery_level_id: asNumber(after.mastery_level_id),
          participation_state: asString(after.participation_state),
        }
      : null,
    task_equivalence_note: asString(r.task_equivalence_note),
    correction_reason: asString(r.correction_reason),
  };
}

export function normalizeReassessments(raw: unknown): ReassessmentRecord[] {
  return listItems(unwrap(raw))
    .map(normalizeReassessment)
    .filter((item): item is ReassessmentRecord => item != null);
}

export function normalizeAdminAssessmentSupportSummary(
  raw: unknown,
): AdminAssessmentSupportSummary {
  const r = asRecord(unwrap(raw)) ?? {};
  const context = asRecord(r.context) ?? {};
  const privacy = asRecord(r.privacy) ?? {};
  const mastery = asRecord(r.mastery_distribution_counts) ?? {};
  const outcomes = asRecord(r.reassessment_outcome_counts) ?? {};
  const masteryCounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(mastery)) {
    const n = asNumber(v);
    if (n != null) masteryCounts[k] = n;
  }
  const outcomeCounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(outcomes)) {
    const n = asNumber(v);
    if (n != null) outcomeCounts[k] = n;
  }
  // Hard privacy belt — never keep accidental PII on summary.
  const banned = ['student_name', 'observation_text', 'interpretation_text', 'memberships'];
  for (const key of banned) delete (r as Record<string, unknown>)[key];

  return {
    context: {
      school_id: asNumber(context.school_id),
      academic_year_id: asNumber(context.academic_year_id),
      class_id: asNumber(context.class_id),
      subject_id: asNumber(context.subject_id),
    },
    objectives_count: asNumber(r.objectives_count) ?? 0,
    assessed_students_count: asNumber(r.assessed_students_count) ?? 0,
    observations_count: asNumber(r.observations_count) ?? 0,
    mastery_distribution_counts: masteryCounts,
    not_assessed_count: asNumber(r.not_assessed_count) ?? 0,
    difficulties_count: asNumber(r.difficulties_count) ?? 0,
    open_support_decisions_count: asNumber(r.open_support_decisions_count) ?? 0,
    active_support_groups_count: asNumber(r.active_support_groups_count) ?? 0,
    planned_support_count: asNumber(r.planned_support_count) ?? 0,
    delivered_support_count: asNumber(r.delivered_support_count) ?? 0,
    reassessment_due_count: asNumber(r.reassessment_due_count) ?? 0,
    reassessment_outcome_counts: outcomeCounts,
    privacy: {
      includes_student_names: Boolean(privacy.includes_student_names),
      includes_observation_text: Boolean(privacy.includes_observation_text),
      includes_interpretation_text: Boolean(privacy.includes_interpretation_text),
      includes_membership_list: Boolean(privacy.includes_membership_list),
    },
  };
}

export function normalizeAdminStudentDetail(raw: unknown): AdminStudentAssessmentDetail {
  const r = asRecord(unwrap(raw)) ?? {};
  return {
    student_id: asNumber(r.student_id) ?? 0,
    student_name: asString(r.student_name),
    observations: listItems(r.observations)
      .map(normalizeMasteryObservation)
      .filter((item): item is MasteryObservation => item != null),
    difficulties: listItems(r.difficulties)
      .map(normalizeDifficulty)
      .filter((item): item is DifficultyRecord => item != null),
    support_decisions: listItems(r.support_decisions)
      .map(normalizeSupportDecision)
      .filter((item): item is SupportDecision => item != null),
  };
}

/** Never invent Session Hub links without a positive occurrence id from Backend. */
export function supportPlanSessionHref(
  plan: SupportPlan,
  returnTo?: string | null,
): string | null {
  const occurrenceId = plan.occurrence_id;
  if (occurrenceId == null || occurrenceId <= 0) return null;
  const q = new URLSearchParams({ tab: 'delivery' });
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    q.set('return_to', returnTo);
  }
  return `/teacher/sessions/${occurrenceId}?${q.toString()}`;
}
