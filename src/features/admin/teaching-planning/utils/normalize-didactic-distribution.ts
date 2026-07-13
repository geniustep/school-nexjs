/**
 * Normalizers for Didactic Sequences + Annual Distributions + timeline + batch.
 *
 * Semantic guardrails:
 * - A Didactic Sequence is a lesson/unit plan of session TEMPLATES — NOT a Jathatha
 *   (daily prep sheet) and NOT a scheduled session.
 * - An Annual Distribution is the year-long ordered plan for a Teaching Offering —
 *   NOT the weekly timetable and NOT a timetable requirement.
 * - Timeline entries keep their `kind`: instructional_item (from lines) is never
 *   merged with calendar_marker (from the academic calendar).
 * - Readiness always comes from Backend; we never invent it locally.
 */

import type {
  AnnualDistributionDetail,
  AnnualDistributionLine,
  AnnualDistributionReadiness,
  AnnualDistributionSummary,
  AnnualDistributionTimeline,
  AnnualDistributionTotals,
  AnnualDistributionVersionRef,
  DidacticSequenceDetail,
  DidacticSequenceSessionTemplate,
  DidacticSequenceSummary,
  DidacticSequenceVersioning,
  DistributionBatchApplySummary,
  DistributionBatchRowError,
  DistributionBatchValidationResponse,
  TimelineCalendarMarker,
  TimelineEntry,
  TimelineInstructionalItem,
} from '@/types/teaching-planning';
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  normalizeLanguageRef,
  normalizeNamedRef,
  normalizeTeachingOfferingSummary,
  normalizeTeachingPlanningAllowedActions,
  normalizeTeachingReferenceSummary,
} from './normalize-teaching-planning';

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function listItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  if (record && Array.isArray(record.items)) return record.items as unknown[];
  return [];
}

function unwrapItem(raw: unknown): unknown {
  const record = asRecord(raw);
  return record?.item != null ? record.item : raw;
}

/* --------------------------- Didactic Sequence --------------------------- */

export function normalizeSessionTemplate(
  raw: unknown,
): DidacticSequenceSessionTemplate | null {
  const record = asRecord(raw);
  if (!record) return null;
  const name = asString(record.name)?.trim();
  const sessionType = asString(record.session_type)?.trim();
  if (!name || !sessionType) return null;
  return {
    id: asNumber(record.id),
    order: asNumber(record.order) ?? 0,
    name,
    session_type: sessionType,
    expected_session_count: asNumber(record.expected_session_count) ?? 1,
    objective: asString(record.objective) ?? null,
    pages: asString(record.pages) ?? null,
    completion_criteria: asString(record.completion_criteria) ?? null,
    support_notes: asString(record.support_notes) ?? null,
    active: asBoolean(record.active) ?? true,
  };
}

export function normalizeDidacticSequenceSummary(
  raw: unknown,
): DidacticSequenceSummary | null {
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
    reference: record.reference
      ? normalizeTeachingReferenceSummary(record.reference)
      : null,
    unit: asString(record.unit) ?? null,
    lesson: asString(record.lesson) ?? null,
    state,
    active: asBoolean(record.active) ?? true,
    version_label: asString(record.version_label) ?? null,
    supersedes_id: asNumber(record.supersedes_id) ?? null,
    expected_session_count: asNumber(record.expected_session_count) ?? 0,
    session_template_count: asNumber(record.session_template_count) ?? 0,
    allowed_actions: normalizeTeachingPlanningAllowedActions(record.allowed_actions),
  };
}

export function normalizeDidacticSequences(raw: unknown): DidacticSequenceSummary[] {
  return listItems(raw)
    .map(normalizeDidacticSequenceSummary)
    .filter((item): item is DidacticSequenceSummary => item != null);
}

function normalizeSequenceVersioning(raw: unknown): DidacticSequenceVersioning {
  const record = asRecord(raw) ?? {};
  return {
    version_label: asString(record.version_label) ?? null,
    supersedes_id: asNumber(record.supersedes_id) ?? null,
    superseded_by_id: asNumber(record.superseded_by_id) ?? null,
    is_latest_version: asBoolean(record.is_latest_version) ?? true,
  };
}

export function normalizeDidacticSequenceDetail(
  raw: unknown,
): DidacticSequenceDetail | null {
  const payload = unwrapItem(raw);
  const summary = normalizeDidacticSequenceSummary(payload);
  if (!summary) return null;
  const detail = asRecord(payload) ?? {};
  const templates = Array.isArray(detail.session_templates)
    ? detail.session_templates
        .map(normalizeSessionTemplate)
        .filter((s): s is DidacticSequenceSessionTemplate => s != null)
        .sort((a, b) => a.order - b.order)
    : [];
  return {
    ...summary,
    objectives: asString(detail.objectives) ?? null,
    prerequisites: asString(detail.prerequisites) ?? null,
    concepts_and_skills: asString(detail.concepts_and_skills) ?? null,
    pages: asString(detail.pages) ?? null,
    completion_criteria: asString(detail.completion_criteria) ?? null,
    support_activities: asString(detail.support_activities) ?? null,
    notes: asString(detail.notes) ?? null,
    versioning: normalizeSequenceVersioning(detail.versioning),
    session_templates: templates,
    approved_by_id: asNumber(detail.approved_by_id) ?? null,
    approved_at: asString(detail.approved_at) ?? null,
    reset_reason: asString(detail.reset_reason) ?? null,
    archived_by_id: asNumber(detail.archived_by_id) ?? null,
    archived_at: asString(detail.archived_at) ?? null,
  };
}

export function unwrapDidacticSequenceMutationData(
  raw: unknown,
): DidacticSequenceDetail | null {
  return normalizeDidacticSequenceDetail(raw);
}

/* -------------------------- Annual Distribution -------------------------- */

function normalizeDistributionTotals(raw: unknown): AnnualDistributionTotals {
  const record = asRecord(raw) ?? {};
  return {
    line_count: asNumber(record.line_count) ?? 0,
    sequence_count: asNumber(record.sequence_count) ?? 0,
    total_sessions: asNumber(record.total_sessions) ?? 0,
  };
}

function normalizeDistributionReadiness(raw: unknown): AnnualDistributionReadiness {
  const record = asRecord(raw) ?? {};
  return {
    has_lines: asBoolean(record.has_lines) === true,
    sequences_resolved: asBoolean(record.sequences_resolved) === true,
    dates_valid: asBoolean(record.dates_valid) === true,
    ready_for_approval: asBoolean(record.ready_for_approval) === true,
    ready_for_activation: asBoolean(record.ready_for_activation) === true,
    blockers: stringArray(record.blockers),
  };
}

function normalizeVersionRef(raw: unknown): AnnualDistributionVersionRef | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  return {
    id: Number(record.id),
    version_label: asString(record.version_label) ?? null,
    state: asString(record.state) ?? 'draft',
  };
}

export function normalizeDistributionLine(raw: unknown): AnnualDistributionLine | null {
  const record = asRecord(raw);
  if (!record) return null;
  const itemType = asString(record.item_type)?.trim() ?? 'other';
  return {
    id: asNumber(record.id),
    order: asNumber(record.order) ?? 0,
    item_type: itemType,
    sequence: record.sequence ? normalizeDidacticSequenceSummary(record.sequence) : null,
    name: asString(record.name) ?? null,
    period_label: asString(record.period_label) ?? null,
    date_start: asString(record.date_start) ?? null,
    date_end: asString(record.date_end) ?? null,
    session_count: asNumber(record.session_count) ?? null,
    external_reference: asString(record.external_reference) ?? null,
    notes: asString(record.notes) ?? null,
  };
}

export function normalizeAnnualDistributionSummary(
  raw: unknown,
): AnnualDistributionSummary | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const state = asString(record.state)?.trim();
  if (!state) return null;
  const name =
    asString(record.name)?.trim() ||
    asString(record.display_name)?.trim() ||
    `#${Number(record.id)}`;
  return {
    id: Number(record.id),
    name,
    // Offering may be absent to avoid deep nesting; normalize only when present.
    offering: record.offering ? normalizeTeachingOfferingSummary(record.offering) : null,
    reference: record.reference
      ? normalizeTeachingReferenceSummary(record.reference)
      : null,
    academic_year: normalizeNamedRef(record.academic_year),
    school: normalizeNamedRef(record.school),
    subject: normalizeNamedRef(record.subject),
    level: normalizeNamedRef(record.level),
    teaching_language: normalizeLanguageRef(record.teaching_language),
    track: normalizeNamedRef(record.track),
    period_label: asString(record.period_label) ?? null,
    date_start: asString(record.date_start) ?? null,
    date_end: asString(record.date_end) ?? null,
    state,
    active: asBoolean(record.active) ?? false,
    version_label: asString(record.version_label) ?? null,
    supersedes_id: asNumber(record.supersedes_id) ?? null,
    totals: normalizeDistributionTotals(record.totals),
    readiness: normalizeDistributionReadiness(record.readiness),
    allowed_actions: normalizeTeachingPlanningAllowedActions(record.allowed_actions),
  };
}

export function normalizeAnnualDistributions(raw: unknown): AnnualDistributionSummary[] {
  return listItems(raw)
    .map(normalizeAnnualDistributionSummary)
    .filter((item): item is AnnualDistributionSummary => item != null);
}

export function normalizeAnnualDistributionDetail(
  raw: unknown,
): AnnualDistributionDetail | null {
  const payload = unwrapItem(raw);
  const summary = normalizeAnnualDistributionSummary(payload);
  if (!summary) return null;
  const detail = asRecord(payload) ?? {};
  const lines = Array.isArray(detail.lines)
    ? detail.lines
        .map(normalizeDistributionLine)
        .filter((l): l is AnnualDistributionLine => l != null)
        .sort((a, b) => a.order - b.order)
    : [];
  return {
    ...summary,
    notes: asString(detail.notes) ?? null,
    blockers: stringArray(detail.blockers).length
      ? stringArray(detail.blockers)
      : summary.readiness.blockers,
    active_version: normalizeVersionRef(detail.active_version),
    replacement_version: normalizeVersionRef(detail.replacement_version),
    superseded_by_id: asNumber(detail.superseded_by_id) ?? null,
    is_latest_version: asBoolean(detail.is_latest_version) ?? true,
    lines,
    approved_by_id: asNumber(detail.approved_by_id) ?? null,
    approved_at: asString(detail.approved_at) ?? null,
    activated_by_id: asNumber(detail.activated_by_id) ?? null,
    activated_at: asString(detail.activated_at) ?? null,
    reset_reason: asString(detail.reset_reason) ?? null,
    archived_by_id: asNumber(detail.archived_by_id) ?? null,
    archived_at: asString(detail.archived_at) ?? null,
  };
}

export function unwrapAnnualDistributionMutationData(
  raw: unknown,
): AnnualDistributionDetail | null {
  return normalizeAnnualDistributionDetail(raw);
}

/* -------------------------------- Timeline ------------------------------- */

function normalizeInstructionalItem(raw: unknown): TimelineInstructionalItem | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  return {
    kind: 'instructional_item',
    id: Number(record.id),
    order: asNumber(record.order) ?? 0,
    item_type: asString(record.item_type)?.trim() ?? 'other',
    name: asString(record.name)?.trim() ?? '',
    sequence_id: asNumber(record.sequence_id) ?? null,
    period_label: asString(record.period_label) ?? null,
    date_start: asString(record.date_start) ?? null,
    date_end: asString(record.date_end) ?? null,
    session_count: asNumber(record.session_count) ?? null,
  };
}

function normalizeCalendarMarker(raw: unknown): TimelineCalendarMarker | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  return {
    kind: 'calendar_marker',
    id: Number(record.id),
    marker_type: asString(record.marker_type)?.trim() ?? 'other',
    name: asString(record.name)?.trim() ?? '',
    date_start: asString(record.date_start) ?? null,
    date_end: asString(record.date_end) ?? null,
    is_instructional_break: asBoolean(record.is_instructional_break) === true,
  };
}

/** Preserve `kind` discrimination — never collapse instructional items and markers. */
export function normalizeTimeline(raw: unknown): AnnualDistributionTimeline {
  const record = asRecord(unwrapItem(raw)) ?? {};
  const instructional = Array.isArray(record.instructional_items)
    ? record.instructional_items
        .map(normalizeInstructionalItem)
        .filter((i): i is TimelineInstructionalItem => i != null)
    : [];
  const markers = Array.isArray(record.calendar_markers)
    ? record.calendar_markers
        .map(normalizeCalendarMarker)
        .filter((m): m is TimelineCalendarMarker => m != null)
    : [];
  const combined: TimelineEntry[] = Array.isArray(record.combined_timeline)
    ? record.combined_timeline
        .map((entry) => {
          const entryRecord = asRecord(entry);
          if (entryRecord?.kind === 'calendar_marker') {
            return normalizeCalendarMarker(entry);
          }
          return normalizeInstructionalItem(entry);
        })
        .filter((e): e is TimelineEntry => e != null)
    : [...instructional, ...markers];
  return {
    instructional_items: instructional,
    calendar_markers: markers,
    combined_timeline: combined,
  };
}

/* ---------------------------- Batch validate/apply ----------------------- */

function normalizeBatchRowError(raw: unknown): DistributionBatchRowError | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    row: asNumber(record.row) ?? 0,
    field: asString(record.field) ?? null,
    code: asString(record.code)?.trim() ?? 'invalid',
    message: asString(record.message)?.trim() ?? '',
  };
}

export function normalizeBatchValidation(
  raw: unknown,
): DistributionBatchValidationResponse {
  const record = asRecord(unwrapItem(raw)) ?? {};
  const errors = Array.isArray(record.errors)
    ? record.errors
        .map(normalizeBatchRowError)
        .filter((e): e is DistributionBatchRowError => e != null)
    : [];
  const normalizedRows = Array.isArray(record.normalized_rows)
    ? (record.normalized_rows as unknown[]).map((row) => {
        const line = normalizeDistributionLine(row);
        return {
          id: line?.id,
          order: line?.order ?? 0,
          item_type: line?.item_type ?? 'other',
          sequence_id: asNumber(asRecord(row)?.sequence_id) ?? null,
          name: line?.name ?? null,
          period_label: line?.period_label ?? null,
          date_start: line?.date_start ?? null,
          date_end: line?.date_end ?? null,
          session_count: line?.session_count ?? null,
          external_reference: line?.external_reference ?? null,
          notes: line?.notes ?? null,
        };
      })
    : [];
  return {
    valid: asBoolean(record.valid) === true && errors.length === 0,
    row_count: asNumber(record.row_count) ?? normalizedRows.length,
    errors,
    normalized_rows: normalizedRows,
  };
}

export function normalizeBatchApplySummary(
  raw: unknown,
): DistributionBatchApplySummary {
  const record = asRecord(unwrapItem(raw)) ?? {};
  const errors = Array.isArray(record.errors)
    ? record.errors
        .map(normalizeBatchRowError)
        .filter((e): e is DistributionBatchRowError => e != null)
    : [];
  return {
    created: asNumber(record.created) ?? 0,
    updated: asNumber(record.updated) ?? 0,
    skipped: asNumber(record.skipped) ?? 0,
    errors,
  };
}
