import type {
  JathathaActivity,
  JathathaContextCandidateLine,
  JathathaContextCandidateTemplate,
  JathathaContextResponse,
  JathathaPhase,
  JathathaReadiness,
  ReferenceJathathaDetail,
  ReferenceJathathaSummary,
  SessionOccurrenceAllowedActions,
  SessionOccurrenceDetail,
  SessionOccurrenceSummary,
  TeacherJathathaDetail,
  TeacherJathathaRevisionSummary,
  TeacherJathathaSummary,
} from '@/types/jathatha';
import {
  asBoolean,
  asNumber,
  asNumberArray,
  asRecord,
  asString,
  normalizeLanguageRef,
  normalizeNamedRef,
  normalizeTeachingPlanningAllowedActions,
  teachingPlanningAllowsAction,
} from './normalize-teaching-planning';

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function normalizeJathathaPhase(raw: unknown): JathathaPhase | null {
  const record = asRecord(raw);
  const sequenceOrder = asNumber(record?.sequence_order);
  const phaseType = asString(record?.phase_type)?.trim();
  if (!record || sequenceOrder == null || !phaseType) return null;

  return {
    id: asNumber(record.id) ?? null,
    sequence_order: sequenceOrder,
    phase_type: phaseType,
    custom_name: asString(record.custom_name) ?? null,
    partial_objective: asString(record.partial_objective) ?? null,
    planned_duration_minutes: asNumber(record.planned_duration_minutes) ?? null,
    instruction: asString(record.instruction) ?? null,
    teacher_activity: asString(record.teacher_activity) ?? null,
    learner_activity: asString(record.learner_activity) ?? null,
    work_organization: asString(record.work_organization) ?? null,
    materials: asString(record.materials) ?? null,
    expected_output: asString(record.expected_output) ?? null,
    expected_errors: asString(record.expected_errors) ?? null,
    teacher_intervention: asString(record.teacher_intervention) ?? null,
    guiding_questions: asString(record.guiding_questions) ?? null,
    verification_indicator: asString(record.verification_indicator) ?? null,
    transition_criterion: asString(record.transition_criterion) ?? null,
    didactic_notes: asString(record.didactic_notes) ?? null,
    source_phase_id: asNumber(record.source_phase_id) ?? null,
  };
}

export function normalizeJathathaActivity(raw: unknown): JathathaActivity | null {
  const record = asRecord(raw);
  const sequenceOrder = asNumber(record?.sequence_order);
  const name = asString(record?.name)?.trim();
  const activityType = asString(record?.activity_type)?.trim();
  if (!record || sequenceOrder == null || !name || !activityType) return null;

  const rawPhases = Array.isArray(record.phases) ? record.phases : [];
  return {
    id: asNumber(record.id) ?? null,
    sequence_order: sequenceOrder,
    name,
    activity_type: activityType,
    partial_objective: asString(record.partial_objective) ?? null,
    planned_duration_minutes: asNumber(record.planned_duration_minutes) ?? null,
    work_mode: asString(record.work_mode) ?? null,
    grouping: asString(record.grouping) ?? null,
    materials: asString(record.materials) ?? null,
    instructions: asString(record.instructions) ?? null,
    teacher_activity: asString(record.teacher_activity) ?? null,
    learner_activity: asString(record.learner_activity) ?? null,
    expected_output: asString(record.expected_output) ?? null,
    quick_assessment: asString(record.quick_assessment) ?? null,
    alternative_plan: asString(record.alternative_plan) ?? null,
    notes: asString(record.notes) ?? null,
    phases: rawPhases.map(normalizeJathathaPhase).filter((phase): phase is JathathaPhase => phase != null),
    source_activity_id: asNumber(record.source_activity_id) ?? null,
  };
}

export function normalizeJathathaReadiness(raw: unknown): JathathaReadiness | null {
  const record = asRecord(raw);
  const ready = asBoolean(record?.ready);
  if (!record || ready == null) return null;
  return { ...record, ready, blockers: stringArray(record.blockers), warnings: stringArray(record.warnings) };
}

function normalizeActivities(record: Record<string, unknown>): JathathaActivity[] {
  const activities = Array.isArray(record.activities)
    ? record.activities
    : Array.isArray(record.jathatha_activity_ids) &&
        record.jathatha_activity_ids.every((item) => asRecord(item) != null)
      ? record.jathatha_activity_ids
      : [];
  return activities
    .map(normalizeJathathaActivity)
    .filter((activity): activity is JathathaActivity => activity != null);
}

export function normalizeReferenceJathathaSummary(raw: unknown): ReferenceJathathaSummary | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const name = asString(record?.name)?.trim();
  const state = asString(record?.state)?.trim();
  if (!record || id == null || !name || !state) return null;
  return {
    id,
    name,
    school: normalizeNamedRef(record.school),
    reference: normalizeNamedRef(record.reference),
    sequence: normalizeNamedRef(record.sequence),
    session_template: normalizeNamedRef(record.session_template),
    session_type: asString(record.session_type) ?? null,
    level: normalizeNamedRef(record.level),
    subject: normalizeNamedRef(record.subject),
    teaching_language: normalizeLanguageRef(record.teaching_language),
    track: normalizeNamedRef(record.track),
    default_detail_level: asString(record.default_detail_level) ?? 'standard',
    activity_count: asNumber(record.activity_count) ?? 0,
    phase_count: asNumber(record.phase_count) ?? 0,
    planned_duration_minutes: asNumber(record.planned_duration_minutes) ?? null,
    state,
    version_label: asString(record.version_label) ?? null,
    approved_at: asString(record.approved_at) ?? null,
    readiness: normalizeJathathaReadiness(record.readiness),
    allowed_actions: normalizeTeachingPlanningAllowedActions(record.allowed_actions),
  };
}

export function normalizeReferenceJathathaDetail(raw: unknown): ReferenceJathathaDetail | null {
  const record = asRecord(raw);
  const payload = record?.item ?? raw;
  const summary = normalizeReferenceJathathaSummary(payload);
  const detail = asRecord(payload);
  if (!summary || !detail) return null;
  const history = Array.isArray(detail.version_history)
    ? detail.version_history
        .map(normalizeReferenceJathathaSummary)
        .filter((item): item is ReferenceJathathaSummary => item != null)
    : [];
  return {
    ...summary,
    external_reference: asString(detail.external_reference) ?? null,
    objectives: asString(detail.objectives) ?? null,
    prerequisites: asString(detail.prerequisites) ?? null,
    materials_summary: asString(detail.materials_summary) ?? null,
    pages: asString(detail.pages) ?? null,
    quick_assessment_plan: asString(detail.quick_assessment_plan) ?? null,
    fallback_plan: asString(detail.fallback_plan) ?? null,
    expected_difficulties: asString(detail.expected_difficulties) ?? null,
    general_guidance: asString(detail.general_guidance) ?? null,
    correction_elements: asString(detail.correction_elements) ?? null,
    support_activities: asString(detail.support_activities) ?? null,
    notes: asString(detail.notes) ?? null,
    activities: normalizeActivities(detail),
    attachment_ids: asNumberArray(detail.attachment_ids),
    blockers: stringArray(detail.blockers),
    warnings: stringArray(detail.warnings),
    approved_by: normalizeNamedRef(detail.approved_by),
    supersedes_id: asNumber(detail.supersedes_id) ?? null,
    version_history: history,
  };
}

export function normalizeReferenceJathathas(raw: unknown): ReferenceJathathaSummary[] {
  const record = asRecord(raw);
  const items = Array.isArray(raw) ? raw : Array.isArray(record?.items) ? record.items : [];
  return items
    .map(normalizeReferenceJathathaSummary)
    .filter((item): item is ReferenceJathathaSummary => item != null);
}

function normalizeSessionAllowedActions(raw: unknown): SessionOccurrenceAllowedActions | undefined {
  const actions = normalizeTeachingPlanningAllowedActions(raw);
  if (!actions) return undefined;
  return {
    view: actions.view,
    view_jathatha: actions.view_jathatha,
    create_jathatha: actions.create_jathatha,
    create_correction: actions.create_correction,
    view_delivery: actions.view_delivery,
    create_delivery: actions.create_delivery,
    view_journal: actions.view_journal,
    view_progress: actions.view_progress,
  };
}

export function normalizeSessionOccurrenceSummary(raw: unknown): SessionOccurrenceSummary | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const state = asString(record?.state)?.trim();
  if (!record || id == null || !state) return null;
  return {
    id,
    date: asString(record.date) ?? null,
    start_time: asString(record.start_time) ?? null,
    end_time: asString(record.end_time) ?? null,
    state,
    class: normalizeNamedRef(record.class),
    subject: normalizeNamedRef(record.subject),
    teacher: normalizeNamedRef(record.teacher),
    room: asString(record.room) ?? null,
    offering: normalizeNamedRef(record.offering),
    distribution: normalizeNamedRef(record.distribution),
    assignment: normalizeNamedRef(record.assignment),
    planned_duration_minutes: asNumber(record.planned_duration_minutes) ?? null,
    is_current: asBoolean(record.is_current),
    is_next: asBoolean(record.is_next),
    teachable: asBoolean(record.teachable),
    current_jathatha_id: asNumber(record.current_jathatha_id) ?? null,
    jathatha_state: asString(record.jathatha_state) ?? null,
    jathatha_review_state: asString(record.jathatha_review_state) ?? null,
    jathatha_summary: asString(record.jathatha_summary) ?? null,
    current_delivery_id: asNumber(record.current_delivery_id) ?? null,
    delivery_state: asString(record.delivery_state) ?? null,
    delivery_summary: asString(record.delivery_summary) ?? null,
    delivery_review_state: asString(record.delivery_review_state) ?? null,
    current_journal_entry_id: asNumber(record.current_journal_entry_id) ?? null,
    progress_summary: asString(record.progress_summary) ?? null,
    allowed_actions: normalizeSessionAllowedActions(record.allowed_actions),
  };
}

export function normalizeSessionOccurrenceDetail(raw: unknown): SessionOccurrenceDetail | null {
  const record = asRecord(raw);
  const payload = record?.item ?? raw;
  const summary = normalizeSessionOccurrenceSummary(payload);
  const detail = asRecord(payload);
  if (!summary || !detail) return null;
  return {
    ...summary,
    weekly_slot_id: asNumber(detail.weekly_slot_id) ?? null,
    notes: asString(detail.notes) ?? null,
  };
}

export function normalizeSessionOccurrences(raw: unknown): SessionOccurrenceSummary[] {
  const record = asRecord(raw);
  const items = Array.isArray(raw) ? raw : Array.isArray(record?.items) ? record.items : [];
  return items
    .map(normalizeSessionOccurrenceSummary)
    .filter((item): item is SessionOccurrenceSummary => item != null);
}

export function normalizeTeacherJathathaSummary(raw: unknown): TeacherJathathaSummary | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const state = asString(record?.state)?.trim();
  const reviewState = asString(record?.review_state)?.trim();
  if (!record || id == null || !state || !reviewState) return null;
  return {
    id,
    name: asString(record.name) ?? null,
    session_occurrence: normalizeSessionOccurrenceSummary(record.session_occurrence),
    teacher: normalizeNamedRef(record.teacher),
    class: normalizeNamedRef(record.class),
    subject: normalizeNamedRef(record.subject),
    offering: normalizeNamedRef(record.offering),
    distribution: normalizeNamedRef(record.distribution),
    distribution_line: normalizeNamedRef(record.distribution_line),
    sequence: normalizeNamedRef(record.sequence),
    session_template: normalizeNamedRef(record.session_template),
    reference_jathatha: normalizeNamedRef(record.reference_jathatha),
    state,
    review_state: reviewState,
    revision_number: asNumber(record.revision_number) ?? 0,
    detail_level: asString(record.detail_level) ?? 'standard',
    planned_duration_minutes: asNumber(record.planned_duration_minutes) ?? null,
    readiness: normalizeJathathaReadiness(record.readiness),
    correction_requested: asBoolean(record.correction_requested),
    correction_reason: asString(record.correction_reason) ?? null,
    reviewed_at: asString(record.reviewed_at) ?? null,
    reviewed_by: normalizeNamedRef(record.reviewed_by),
    session_date: asString(record.session_date) ?? null,
    session_start_time: asString(record.session_start_time) ?? null,
    session_end_time: asString(record.session_end_time) ?? null,
    allowed_actions: normalizeTeachingPlanningAllowedActions(record.allowed_actions),
  };
}

function normalizeRevision(raw: unknown): TeacherJathathaRevisionSummary | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const revisionNumber = asNumber(record?.revision_number);
  const state = asString(record?.state);
  if (!record || id == null || revisionNumber == null || !state) return null;
  return {
    id,
    revision_number: revisionNumber,
    state,
    review_state: asString(record.review_state) ?? null,
    created_at: asString(record.created_at) ?? null,
    confirmed_at: asString(record.confirmed_at) ?? null,
    correction_reason: asString(record.correction_reason) ?? null,
    supersedes_id: asNumber(record.supersedes_id) ?? null,
    is_current: asBoolean(record.is_current),
  };
}

export function normalizeTeacherJathathaDetail(raw: unknown): TeacherJathathaDetail | null {
  const record = asRecord(raw);
  const payload = record?.item ?? raw;
  const summary = normalizeTeacherJathathaSummary(payload);
  const detail = asRecord(payload);
  if (!summary || !detail) return null;
  return {
    ...summary,
    session_objective: asString(detail.session_objective) ?? null,
    materials: asString(detail.materials) ?? null,
    class_adaptation: asString(detail.class_adaptation) ?? null,
    quick_assessment: asString(detail.quick_assessment) ?? null,
    fallback_plan: asString(detail.fallback_plan) ?? null,
    teacher_notes: asString(detail.teacher_notes) ?? null,
    activities: normalizeActivities(detail),
    attachment_ids: asNumberArray(detail.attachment_ids),
    blockers: stringArray(detail.blockers),
    warnings: stringArray(detail.warnings),
    revisions: Array.isArray(detail.revisions)
      ? detail.revisions.map(normalizeRevision).filter((item): item is TeacherJathathaRevisionSummary => item != null)
      : [],
    void_reason: asString(detail.void_reason) ?? null,
    confirmed_at: asString(detail.confirmed_at) ?? null,
    snapshot_source: asRecord(detail.snapshot_source)
      ? {
          reference_jathatha_id: asNumber(asRecord(detail.snapshot_source)?.reference_jathatha_id) ?? null,
          sequence_session_template_id:
            asNumber(asRecord(detail.snapshot_source)?.sequence_session_template_id) ?? null,
          distribution_line_id: asNumber(asRecord(detail.snapshot_source)?.distribution_line_id) ?? null,
        }
      : null,
    school: normalizeNamedRef(detail.school),
    academic_year: normalizeNamedRef(detail.academic_year),
  };
}

export function normalizeTeacherJathathas(raw: unknown): TeacherJathathaSummary[] {
  const record = asRecord(raw);
  const items = Array.isArray(raw) ? raw : Array.isArray(record?.items) ? record.items : [];
  return items
    .map(normalizeTeacherJathathaSummary)
    .filter((item): item is TeacherJathathaSummary => item != null);
}

export function normalizeJathathaContextResponse(raw: unknown): JathathaContextResponse | null {
  const record = asRecord(raw);
  const payload = asRecord(record?.item ?? raw);
  if (!payload) return null;
  const candidateLines = Array.isArray(payload.candidate_distribution_lines)
    ? payload.candidate_distribution_lines
        .map((item): JathathaContextCandidateLine | null => {
          const line = asRecord(item);
          const id = asNumber(line?.id);
          const name = asString(line?.name)?.trim();
          return line && id != null && name
            ? { id, name, item_type: asString(line.item_type) ?? null, sequence: normalizeNamedRef(line.sequence), recommended: asBoolean(line.recommended), planned_date: asString(line.planned_date) ?? null, order: asNumber(line.order) ?? null }
            : null;
        })
        .filter((item): item is JathathaContextCandidateLine => item != null)
    : [];
  const candidateTemplates = Array.isArray(payload.candidate_session_templates)
    ? payload.candidate_session_templates
        .map((item): JathathaContextCandidateTemplate | null => {
          const template = asRecord(item);
          const id = asNumber(template?.id);
          const name = asString(template?.name)?.trim();
          return template && id != null && name
            ? { id, name, session_type: asString(template.session_type) ?? null, sequence_id: asNumber(template.sequence_id) ?? null, recommended: asBoolean(template.recommended), order: asNumber(template.order) ?? null }
            : null;
        })
        .filter((item): item is JathathaContextCandidateTemplate => item != null)
    : [];
  return {
    occurrence: normalizeSessionOccurrenceDetail(payload.occurrence),
    assignment: normalizeNamedRef(payload.assignment),
    offering: normalizeNamedRef(payload.offering),
    active_distribution: normalizeNamedRef(payload.active_distribution),
    candidate_distribution_lines: candidateLines,
    candidate_session_templates: candidateTemplates,
    approved_reference_jathatha: normalizeReferenceJathathaSummary(payload.approved_reference_jathatha),
    current_teacher_jathatha: normalizeTeacherJathathaSummary(payload.current_teacher_jathatha),
    readiness: normalizeJathathaReadiness(payload.readiness),
    blockers: stringArray(payload.blockers),
    warnings: stringArray(payload.warnings),
    allowed_actions: normalizeTeachingPlanningAllowedActions(payload.allowed_actions),
  };
}

export function unwrapReferenceJathathaMutationData(raw: unknown): ReferenceJathathaDetail | null {
  return normalizeReferenceJathathaDetail(raw);
}

export function unwrapTeacherJathathaMutationData(raw: unknown): TeacherJathathaDetail | null {
  return normalizeTeacherJathathaDetail(raw);
}

export function jathathaAllowsAction(
  source: { allowed_actions?: Record<string, boolean | undefined> } | Record<string, boolean | undefined> | null | undefined,
  action: string,
): boolean {
  return teachingPlanningAllowsAction(source, action);
}
