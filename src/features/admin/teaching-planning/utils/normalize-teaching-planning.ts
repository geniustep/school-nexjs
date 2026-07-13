import type {
  TeachingOfferingAssignmentSummary,
  TeachingOfferingDetail,
  TeachingOfferingLifecycleAction,
  TeachingOfferingReadiness,
  TeachingOfferingSummary,
  TeachingPlanningAllowedActions,
  TeachingPlanningLanguageRef,
  TeachingPlanningNamedRef,
  TeachingReferenceDetail,
  TeachingReferenceLifecycleAction,
  TeachingReferenceSummary,
} from '@/types/teaching-planning';
import { normalizeAnnualDistributionSummary } from './normalize-didactic-distribution';

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

export function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asNumber(item))
    .filter((n): n is number => n != null);
}

export function normalizeNamedRef(raw: unknown): TeachingPlanningNamedRef | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
  };
}

export function normalizeLanguageRef(raw: unknown): TeachingPlanningLanguageRef | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const code = asString(record.code)?.trim();
  const name = asString(record.name)?.trim();
  if (!code || !name) return null;
  return { id: Number(record.id), code, name };
}

/** Strict boolean-map allowed_actions — no array coercion, no hyphen aliases. */
export function normalizeTeachingPlanningAllowedActions(
  raw: unknown,
): TeachingPlanningAllowedActions | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const map: TeachingPlanningAllowedActions = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'boolean') map[key] = value;
  }
  return map;
}

/** True only when API explicitly sets the exact action key to true. */
export function teachingPlanningAllowsAction(
  source:
    | { allowed_actions?: TeachingPlanningAllowedActions }
    | TeachingPlanningAllowedActions
    | null
    | undefined,
  action: TeachingReferenceLifecycleAction | TeachingOfferingLifecycleAction | string,
): boolean {
  const actions =
    source && typeof source === 'object' && 'allowed_actions' in source
      ? source.allowed_actions
      : (source as TeachingPlanningAllowedActions | undefined);
  if (!actions) return false;
  return (actions as Record<string, boolean | undefined>)[action] === true;
}

export function normalizeTeachingOfferingReadiness(
  raw: unknown,
): TeachingOfferingReadiness | null {
  const record = asRecord(raw);
  if (!record) return null;
  const blockers = Array.isArray(record.blockers)
    ? record.blockers.filter((b): b is string => typeof b === 'string')
    : [];
  return {
    identity_ready: asBoolean(record.identity_ready) === true,
    reference_ready: asBoolean(record.reference_ready) === true,
    assignments_ready: asBoolean(record.assignments_ready) === true,
    assignments_count: asNumber(record.assignments_count) ?? 0,
    classes_count: asNumber(record.classes_count) ?? 0,
    teachers_count: asNumber(record.teachers_count) ?? 0,
    distribution_ready: asBoolean(record.distribution_ready) === true,
    ready_for_approval: asBoolean(record.ready_for_approval) === true,
    ready_for_activation: asBoolean(record.ready_for_activation) === true,
    blockers,
  };
}

function emptyReadiness(): TeachingOfferingReadiness {
  return {
    identity_ready: false,
    reference_ready: false,
    assignments_ready: false,
    assignments_count: 0,
    classes_count: 0,
    teachers_count: 0,
    distribution_ready: false,
    ready_for_approval: false,
    ready_for_activation: false,
    blockers: ['annual_distribution_required'],
  };
}

export function normalizeTeachingReferenceSummary(
  raw: unknown,
): TeachingReferenceSummary | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  const state = asString(record.state)?.trim();
  const school = normalizeNamedRef(record.school);
  const subject = normalizeNamedRef(record.subject);
  const level = normalizeNamedRef(record.level);
  if (!name || !state || !school || !subject || !level) return null;

  return {
    id: Number(record.id),
    name,
    school,
    subject,
    level,
    teaching_language: normalizeLanguageRef(record.teaching_language),
    track: normalizeNamedRef(record.track),
    publisher: asString(record.publisher) ?? null,
    edition: asString(record.edition) ?? null,
    version_label: asString(record.version_label) ?? null,
    reference_code: asString(record.reference_code) ?? null,
    isbn: asString(record.isbn) ?? null,
    state,
    active: asBoolean(record.active) ?? true,
    supersedes_id: asNumber(record.supersedes_id) ?? null,
    offering_count: asNumber(record.offering_count) ?? 0,
    allowed_actions: normalizeTeachingPlanningAllowedActions(record.allowed_actions),
  };
}

export function normalizeTeachingReferences(raw: unknown): TeachingReferenceSummary[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.items)
      ? (asRecord(raw)?.items as unknown[])
      : [];
  return list
    .map(normalizeTeachingReferenceSummary)
    .filter((item): item is TeachingReferenceSummary => item != null);
}

export function normalizeTeachingReferenceDetail(
  raw: unknown,
): TeachingReferenceDetail | null {
  const record = asRecord(raw);
  const payload = record?.item != null ? record.item : raw;
  const summary = normalizeTeachingReferenceSummary(payload);
  if (!summary) return null;
  const detail = asRecord(payload) ?? {};
  return {
    ...summary,
    notes: asString(detail.notes) ?? null,
    approved_by_id: asNumber(detail.approved_by_id) ?? null,
    approved_at: asString(detail.approved_at) ?? null,
    reset_reason: asString(detail.reset_reason) ?? null,
    archived_by_id: asNumber(detail.archived_by_id) ?? null,
    archived_at: asString(detail.archived_at) ?? null,
    student_book_attachment_ids: asNumberArray(detail.student_book_attachment_ids),
    teacher_guide_attachment_ids: asNumberArray(detail.teacher_guide_attachment_ids),
    supplementary_attachment_ids: asNumberArray(detail.supplementary_attachment_ids),
  };
}

export function unwrapTeachingReferenceMutationData(
  raw: unknown,
): TeachingReferenceDetail | null {
  return normalizeTeachingReferenceDetail(raw);
}

function normalizeAssignmentSummary(
  raw: unknown,
): TeachingOfferingAssignmentSummary | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  return {
    id: Number(record.id),
    class: normalizeNamedRef(record.class),
    teacher: normalizeNamedRef(record.teacher),
    subject: normalizeNamedRef(record.subject),
    state: asString(record.state) ?? 'active',
    active: asBoolean(record.active) ?? true,
    role: asString(record.role) ?? null,
  };
}

export function normalizeTeachingOfferingSummary(
  raw: unknown,
): TeachingOfferingSummary | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const displayName = asString(record.display_name)?.trim();
  const state = asString(record.state)?.trim();
  const school = normalizeNamedRef(record.school);
  const academicYear = normalizeNamedRef(record.academic_year);
  const level = normalizeNamedRef(record.level);
  const subject = normalizeNamedRef(record.subject);
  if (!displayName || !state || !school || !academicYear || !level || !subject) return null;

  const readiness =
    normalizeTeachingOfferingReadiness(record.readiness) ?? emptyReadiness();
  const blockers = Array.isArray(record.activation_blockers)
    ? record.activation_blockers.filter((b): b is string => typeof b === 'string')
    : readiness.blockers;

  return {
    id: Number(record.id),
    display_name: displayName,
    school,
    academic_year: academicYear,
    level,
    subject,
    teaching_language: normalizeLanguageRef(record.teaching_language),
    track: normalizeNamedRef(record.track),
    reference: record.reference ? normalizeTeachingReferenceSummary(record.reference) : null,
    state,
    active: asBoolean(record.active) ?? true,
    effective_from: asString(record.effective_from) ?? null,
    effective_to: asString(record.effective_to) ?? null,
    assignment_count: asNumber(record.assignment_count) ?? readiness.assignments_count,
    class_count: asNumber(record.class_count) ?? readiness.classes_count,
    teacher_count: asNumber(record.teacher_count) ?? readiness.teachers_count,
    readiness,
    activation_blockers: blockers,
    active_distribution: record.active_distribution
      ? normalizeAnnualDistributionSummary(record.active_distribution)
      : null,
    distribution_count: asNumber(record.distribution_count) ?? 0,
    allowed_actions: normalizeTeachingPlanningAllowedActions(record.allowed_actions),
  };
}

export function normalizeTeachingOfferings(raw: unknown): TeachingOfferingSummary[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.items)
      ? (asRecord(raw)?.items as unknown[])
      : [];
  return list
    .map(normalizeTeachingOfferingSummary)
    .filter((item): item is TeachingOfferingSummary => item != null);
}

export function normalizeTeachingOfferingDetail(
  raw: unknown,
): TeachingOfferingDetail | null {
  const record = asRecord(raw);
  const payload = record?.item != null ? record.item : raw;
  const summary = normalizeTeachingOfferingSummary(payload);
  if (!summary) return null;
  const detail = asRecord(payload) ?? {};
  const assignments = Array.isArray(detail.assignments)
    ? detail.assignments
        .map(normalizeAssignmentSummary)
        .filter((a): a is TeachingOfferingAssignmentSummary => a != null)
    : [];
  return {
    ...summary,
    notes: asString(detail.notes) ?? null,
    approved_by_id: asNumber(detail.approved_by_id) ?? null,
    approved_at: asString(detail.approved_at) ?? null,
    reset_reason: asString(detail.reset_reason) ?? null,
    archived_by_id: asNumber(detail.archived_by_id) ?? null,
    archived_at: asString(detail.archived_at) ?? null,
    assignments,
  };
}

export function unwrapTeachingOfferingMutationData(
  raw: unknown,
): TeachingOfferingDetail | null {
  return normalizeTeachingOfferingDetail(raw);
}

/** Collect unique teaching languages from list payloads for create forms. */
export function collectTeachingLanguageOptions(
  sources: Array<TeachingReferenceSummary | TeachingOfferingSummary | null | undefined>,
): TeachingPlanningLanguageRef[] {
  const map = new Map<number, TeachingPlanningLanguageRef>();
  for (const source of sources) {
    if (!source?.teaching_language) continue;
    map.set(source.teaching_language.id, source.teaching_language);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
