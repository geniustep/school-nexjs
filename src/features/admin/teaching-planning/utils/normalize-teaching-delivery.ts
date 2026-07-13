/**
 * Actual Delivery / Class Journal / Teaching Progress normalizers —
 * mirrors src/types/teaching-delivery.ts contracts.
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
  ActualDeliveryDetail,
  ActualDeliveryRevisionSummary,
  ActualDeliverySummary,
  ClassJournalEntryDetail,
  ClassJournalEntrySummary,
  DeliveryActivityResult,
  DeliveryContextResponse,
  DeliveryDistributionLineRef,
  DeliveryReadiness,
  ProgressSummarySnippet,
  TeachingProgressLineDetail,
  TeachingProgressLineSummary,
  TeachingProgressSummary,
} from '@/types/teaching-delivery';
import type {
  TeachingPlanningAllowedActions,
  TeachingPlanningNamedRef,
} from '@/types/teaching-planning';
import {
  asBoolean,
  asNumber,
  asNumberArray,
  asRecord,
  asString,
  normalizeNamedRef,
  normalizeTeachingPlanningAllowedActions,
  teachingPlanningAllowsAction,
} from './normalize-teaching-planning';
import {
  normalizeSessionOccurrenceDetail,
  normalizeSessionOccurrenceSummary,
} from './normalize-jathatha';

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
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

export function normalizeDeliveryDistributionLineRef(
  raw: unknown,
): DeliveryDistributionLineRef | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const name = asString(record?.name)?.trim();
  if (!record || id == null || !name) return null;
  return {
    id,
    name,
    sequence_order: asNumber(record.sequence_order) ?? null,
    title: asString(record.title) ?? null,
    planned_window_start: asString(record.planned_window_start) ?? null,
    planned_window_end: asString(record.planned_window_end) ?? null,
    planned_sessions: asNumber(record.planned_sessions) ?? null,
    remaining_units: asNumber(record.remaining_units) ?? null,
    coverage_percent: asNumber(record.coverage_percent) ?? null,
    progress_status: asString(record.progress_status) ?? null,
    delayed: asBoolean(record.delayed),
    completed: asBoolean(record.completed),
  };
}

export function normalizeDeliveryReadiness(raw: unknown): DeliveryReadiness | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    ...record,
    blockers: stringArray(record.blockers),
    warnings: stringArray(record.warnings),
  } as DeliveryReadiness;
}

export function normalizeDeliveryActivityResult(raw: unknown): DeliveryActivityResult | null {
  const record = asRecord(raw);
  const sequenceOrder = asNumber(record?.sequence_order);
  const name = asString(record?.name)?.trim();
  const resultState = asString(record?.result_state)?.trim();
  if (!record || sequenceOrder == null || !name || !resultState) return null;
  return {
    id: asNumber(record.id) ?? null,
    sequence_order: sequenceOrder,
    teacher_jathatha_activity_id: asNumber(record.teacher_jathatha_activity_id) ?? null,
    name,
    result_state: resultState,
    actual_duration_minutes: asNumber(record.actual_duration_minutes) ?? null,
    completion_percent: asNumber(record.completion_percent) ?? null,
    notes: asString(record.notes) ?? null,
    active: asBoolean(record.active) ?? true,
  };
}

export function normalizeDeliveryActivityResults(raw: unknown): DeliveryActivityResult[] {
  return Array.isArray(raw)
    ? raw.map(normalizeDeliveryActivityResult).filter((item): item is DeliveryActivityResult => item != null)
    : [];
}

export function normalizeActualDeliveryRevisionSummary(
  raw: unknown,
): ActualDeliveryRevisionSummary | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const revisionNo = asNumber(record?.revision_no);
  const state = asString(record?.state)?.trim();
  if (!record || id == null || revisionNo == null || !state) return null;
  return {
    id,
    revision_no: revisionNo,
    state,
    review_state: asString(record.review_state) ?? null,
    is_current: asBoolean(record.is_current),
    is_correction: asBoolean(record.is_correction),
    correction_reason: asString(record.correction_reason) ?? null,
    void_reason: asString(record.void_reason) ?? null,
    created_at: asString(record.created_at) ?? null,
    confirmed_at: asString(record.confirmed_at) ?? null,
    supersedes_id: asNumber(record.supersedes_id) ?? null,
    journal_state: asString(record.journal_state) ?? null,
  };
}

export function normalizeProgressSummarySnippet(raw: unknown): ProgressSummarySnippet | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    coverage_percent: asNumber(record.coverage_percent) ?? null,
    planned_units: asNumber(record.planned_units) ?? null,
    delivered_units: asNumber(record.delivered_units) ?? null,
    remaining_units: asNumber(record.remaining_units) ?? null,
    status: asString(record.status) ?? null,
    delayed_count: asNumber(record.delayed_count) ?? null,
    completed_count: asNumber(record.completed_count) ?? null,
    last_delivery_at: asString(record.last_delivery_at) ?? null,
    summary: asString(record.summary) ?? null,
  };
}

export function normalizeActualDeliverySummary(raw: unknown): ActualDeliverySummary | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const state = asString(record?.state)?.trim();
  const reviewState = asString(record?.review_state)?.trim();
  if (!record || id == null || !state || !reviewState) return null;
  return {
    id,
    occurrence: normalizeSessionOccurrenceSummary(record.occurrence),
    session_date: asString(record.session_date) ?? null,
    session_start_time: asString(record.session_start_time) ?? null,
    session_end_time: asString(record.session_end_time) ?? null,
    teacher: normalizeNamedRef(record.teacher),
    class: normalizeNamedRef(record.class),
    subject: normalizeNamedRef(record.subject),
    offering: normalizeNamedRef(record.offering),
    distribution: normalizeNamedRef(record.distribution),
    planned_distribution_line: normalizeDeliveryDistributionLineRef(record.planned_distribution_line),
    delivered_distribution_line: normalizeDeliveryDistributionLineRef(record.delivered_distribution_line),
    delivered_title: asString(record.delivered_title) ?? null,
    completion_state: asString(record.completion_state) ?? null,
    completion_percent: asNumber(record.completion_percent) ?? null,
    deviation_type: asString(record.deviation_type) ?? null,
    state,
    review_state: reviewState,
    revision_no: asNumber(record.revision_no) ?? 0,
    is_current: asBoolean(record.is_current),
    is_correction: asBoolean(record.is_correction),
    readiness: normalizeDeliveryReadiness(record.readiness),
    correction_requested: asBoolean(record.correction_requested),
    allowed_actions: normalizeTeachingPlanningAllowedActions(record.allowed_actions),
  };
}

export function normalizeActualDeliveries(raw: unknown): ActualDeliverySummary[] {
  return listItems(raw)
    .map(normalizeActualDeliverySummary)
    .filter((item): item is ActualDeliverySummary => item != null);
}

export function normalizeActualDeliveryDetail(raw: unknown): ActualDeliveryDetail | null {
  const payload = unwrapItem(raw);
  const summary = normalizeActualDeliverySummary(payload);
  const detail = asRecord(payload);
  if (!summary || !detail) return null;
  return {
    ...summary,
    school: normalizeNamedRef(detail.school),
    academic_year: normalizeNamedRef(detail.academic_year),
    assignment: normalizeNamedRef(detail.assignment),
    teacher_jathatha_id: asNumber(detail.teacher_jathatha_id) ?? null,
    teacher_jathatha: normalizeNamedRef(detail.teacher_jathatha),
    occurrence_id: asNumber(detail.occurrence_id) ?? null,
    planned_distribution_line_id: asNumber(detail.planned_distribution_line_id) ?? null,
    delivered_distribution_line_id: asNumber(detail.delivered_distribution_line_id) ?? null,
    content_summary: asString(detail.content_summary) ?? null,
    objective_achievement_summary: asString(detail.objective_achievement_summary) ?? null,
    actual_pages_label: asString(detail.actual_pages_label) ?? null,
    assessment_summary: asString(detail.assessment_summary) ?? null,
    difficulties_observed: asString(detail.difficulties_observed) ?? null,
    remediation_action: asString(detail.remediation_action) ?? null,
    next_step: asString(detail.next_step) ?? null,
    teacher_notes: asString(detail.teacher_notes) ?? null,
    journal_text: asString(detail.journal_text) ?? null,
    actual_start_datetime: asString(detail.actual_start_datetime) ?? null,
    actual_end_datetime: asString(detail.actual_end_datetime) ?? null,
    actual_duration_minutes: asNumber(detail.actual_duration_minutes) ?? null,
    deviation_reason: asString(detail.deviation_reason) ?? null,
    correction_reason: asString(detail.correction_reason) ?? null,
    void_reason: asString(detail.void_reason) ?? null,
    supersedes_id: asNumber(detail.supersedes_id) ?? null,
    current_journal_entry_id: asNumber(detail.current_journal_entry_id) ?? null,
    activities: normalizeDeliveryActivityResults(detail.activities),
    attachment_ids: asNumberArray(detail.attachment_ids),
    blockers: stringArray(detail.blockers),
    warnings: stringArray(detail.warnings),
    revision_history: Array.isArray(detail.revision_history)
      ? detail.revision_history
          .map(normalizeActualDeliveryRevisionSummary)
          .filter((item): item is ActualDeliveryRevisionSummary => item != null)
      : [],
    progress_summary: normalizeProgressSummarySnippet(detail.progress_summary),
    review_requested_by: normalizeNamedRef(detail.review_requested_by),
    review_requested_at: asString(detail.review_requested_at) ?? null,
    review_request_reason: asString(detail.review_request_reason) ?? null,
    reviewed_by: normalizeNamedRef(detail.reviewed_by),
    reviewed_at: asString(detail.reviewed_at) ?? null,
  };
}

export function unwrapActualDeliveryMutationData(raw: unknown): ActualDeliveryDetail | null {
  return normalizeActualDeliveryDetail(raw);
}

export function normalizeClassJournalEntrySummary(raw: unknown): ClassJournalEntrySummary | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const state = asString(record?.state)?.trim();
  if (!record || id == null || !state) return null;
  return {
    id,
    session_date: asString(record.session_date) ?? null,
    session_start_time: asString(record.session_start_time) ?? null,
    session_end_time: asString(record.session_end_time) ?? null,
    teacher: normalizeNamedRef(record.teacher),
    class: normalizeNamedRef(record.class),
    subject: normalizeNamedRef(record.subject),
    offering: normalizeNamedRef(record.offering),
    distribution: normalizeNamedRef(record.distribution),
    distribution_line: normalizeDeliveryDistributionLineRef(record.distribution_line),
    delivered_title: asString(record.delivered_title) ?? null,
    revision_no: asNumber(record.revision_no) ?? null,
    state,
    deviation_type: asString(record.deviation_type) ?? null,
    source_delivery_id: asNumber(record.source_delivery_id) ?? null,
    occurrence_id: asNumber(record.occurrence_id) ?? null,
  };
}

export function normalizeClassJournalEntries(raw: unknown): ClassJournalEntrySummary[] {
  return listItems(raw)
    .map(normalizeClassJournalEntrySummary)
    .filter((item): item is ClassJournalEntrySummary => item != null);
}

export function normalizeClassJournalEntryDetail(raw: unknown): ClassJournalEntryDetail | null {
  const payload = unwrapItem(raw);
  const summary = normalizeClassJournalEntrySummary(payload);
  const detail = asRecord(payload);
  if (!summary || !detail) return null;
  return {
    ...summary,
    school: normalizeNamedRef(detail.school),
    academic_year: normalizeNamedRef(detail.academic_year),
    content_summary: asString(detail.content_summary) ?? null,
    objective_achievement_summary: asString(detail.objective_achievement_summary) ?? null,
    actual_pages_label: asString(detail.actual_pages_label) ?? null,
    assessment_summary: asString(detail.assessment_summary) ?? null,
    journal_text: asString(detail.journal_text) ?? null,
    deviation_reason: asString(detail.deviation_reason) ?? null,
    completion_state: asString(detail.completion_state) ?? null,
    completion_percent: asNumber(detail.completion_percent) ?? null,
    fingerprint: asString(detail.fingerprint) ?? null,
    supersedes_id: asNumber(detail.supersedes_id) ?? null,
    source_delivery: normalizeActualDeliverySummary(detail.source_delivery),
    revision_lineage: Array.isArray(detail.revision_lineage)
      ? detail.revision_lineage
          .map(normalizeActualDeliveryRevisionSummary)
          .filter((item): item is ActualDeliveryRevisionSummary => item != null)
      : [],
  };
}

export function normalizeTeachingProgressLineSummary(
  raw: unknown,
): TeachingProgressLineSummary | null {
  const record = asRecord(raw);
  const id = asNumber(record?.id);
  const status = asString(record?.status)?.trim();
  if (!record || id == null || !status) return null;
  return {
    id,
    sequence_order: asNumber(record.sequence_order) ?? null,
    title: asString(record.title) ?? null,
    name: asString(record.name) ?? null,
    class: normalizeNamedRef(record.class),
    subject: normalizeNamedRef(record.subject),
    teacher: normalizeNamedRef(record.teacher),
    offering: normalizeNamedRef(record.offering),
    distribution: normalizeNamedRef(record.distribution),
    distribution_line: normalizeDeliveryDistributionLineRef(record.distribution_line),
    planned_sessions: asNumber(record.planned_sessions) ?? null,
    delivered_units: asNumber(record.delivered_units) ?? null,
    remaining_units: asNumber(record.remaining_units) ?? null,
    coverage_percent: asNumber(record.coverage_percent) ?? null,
    status,
    delayed: asBoolean(record.delayed),
    planned_window_start: asString(record.planned_window_start) ?? null,
    planned_window_end: asString(record.planned_window_end) ?? null,
    last_delivery_at: asString(record.last_delivery_at) ?? null,
    last_delivery_id: asNumber(record.last_delivery_id) ?? null,
  };
}

export function normalizeTeachingProgressLines(raw: unknown): TeachingProgressLineSummary[] {
  return listItems(raw)
    .map(normalizeTeachingProgressLineSummary)
    .filter((item): item is TeachingProgressLineSummary => item != null);
}

export function normalizeTeachingProgressLineDetail(
  raw: unknown,
): TeachingProgressLineDetail | null {
  const payload = unwrapItem(raw);
  const summary = normalizeTeachingProgressLineSummary(payload);
  const detail = asRecord(payload);
  if (!summary || !detail) return null;
  return {
    ...summary,
    school: normalizeNamedRef(detail.school),
    academic_year: normalizeNamedRef(detail.academic_year),
    delayed_explanation: asString(detail.delayed_explanation) ?? null,
    contributing_deliveries: Array.isArray(detail.contributing_deliveries)
      ? detail.contributing_deliveries
          .map(normalizeActualDeliverySummary)
          .filter((item): item is ActualDeliverySummary => item != null)
      : [],
    planned_dates: stringArray(detail.planned_dates),
  };
}

export function normalizeTeachingProgressSummary(raw: unknown): TeachingProgressSummary {
  const record = asRecord(unwrapItem(raw)) ?? {};
  const classesNeedingAttention = Array.isArray(record.classes_needing_attention)
    ? record.classes_needing_attention
        .map(normalizeNamedRef)
        .filter((item): item is TeachingPlanningNamedRef => item != null)
    : [];
  const counts = asRecord(record.counts);
  return {
    coverage_percent: asNumber(record.coverage_percent) ?? null,
    planned_lines: asNumber(record.planned_lines) ?? null,
    started_lines: asNumber(record.started_lines) ?? null,
    completed_lines: asNumber(record.completed_lines) ?? null,
    delayed_lines: asNumber(record.delayed_lines) ?? null,
    current_lines: normalizeTeachingProgressLines(record.current_lines),
    next_remaining_lines: normalizeTeachingProgressLines(record.next_remaining_lines),
    last_delivery: normalizeActualDeliverySummary(record.last_delivery),
    classes_needing_attention: classesNeedingAttention,
    counts: counts
      ? Object.fromEntries(
          Object.entries(counts)
            .map(([key, value]) => [key, asNumber(value)] as const)
            .filter((entry): entry is [string, number] => entry[1] != null),
        )
      : {},
  };
}

export function normalizeDeliveryContextResponse(raw: unknown): DeliveryContextResponse | null {
  const payload = asRecord(unwrapItem(raw));
  if (!payload) return null;
  return {
    occurrence: normalizeSessionOccurrenceDetail(payload.occurrence),
    assignment: normalizeNamedRef(payload.assignment),
    offering: normalizeNamedRef(payload.offering),
    active_distribution: normalizeNamedRef(payload.active_distribution),
    current_jathatha: normalizeNamedRef(payload.current_jathatha),
    current_jathatha_state: asString(payload.current_jathatha_state) ?? null,
    planned_distribution_line: normalizeDeliveryDistributionLineRef(payload.planned_distribution_line),
    remaining_distribution_lines: Array.isArray(payload.remaining_distribution_lines)
      ? payload.remaining_distribution_lines
          .map(normalizeDeliveryDistributionLineRef)
          .filter((item): item is DeliveryDistributionLineRef => item != null)
      : [],
    current_delivery: normalizeActualDeliverySummary(payload.current_delivery),
    current_journal_entry: normalizeClassJournalEntrySummary(payload.current_journal_entry),
    progress_summary: normalizeProgressSummarySnippet(payload.progress_summary),
    readiness: normalizeDeliveryReadiness(payload.readiness),
    blockers: stringArray(payload.blockers),
    warnings: stringArray(payload.warnings),
    allowed_actions: normalizeTeachingPlanningAllowedActions(payload.allowed_actions) ?? {},
  };
}

export function deliveryAllowsAction(
  source:
    | { allowed_actions?: TeachingPlanningAllowedActions }
    | TeachingPlanningAllowedActions
    | null
    | undefined,
  action: string,
): boolean {
  return teachingPlanningAllowsAction(source, action);
}
