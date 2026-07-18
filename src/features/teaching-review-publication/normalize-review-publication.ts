/**
 * Normalization for Odoo 224 Teaching Stage 9 payloads — Backend SoT.
 * Never surfaces payload / payload_json in UI-facing structures.
 */

import type {
  TeacherClosureStatus,
  TeachingArchiveItem,
  TeachingArchiveListPayload,
  TeachingClosureBlocker,
  TeachingClosureEvent,
  TeachingClosureListPayload,
  TeachingClosurePreview,
  TeachingClosureWarning,
  TeachingDocumentVersionsPayload,
  TeachingExportRequest,
  TeachingIdRef,
  TeachingOfficialPublication,
  TeachingPagination,
  TeachingPeriodClosure,
  TeachingPeriodException,
  TeachingPrintLocale,
  TeachingPublicationEvent,
  TeachingReviewAllowedActions,
  TeachingReviewQueueCounts,
  TeachingReviewQueueItem,
  TeachingReviewQueuePayload,
  TeachingReviewStatus,
} from '@/types/teaching-review-publication';
import { TEACHING_PRINT_LOCALES } from '@/types/teaching-review-publication';

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

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function listItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  if (Array.isArray(record?.items)) return record.items;
  if (Array.isArray(record?.data)) return record.data;
  return [];
}

export function unwrapTeachingData(raw: unknown): unknown {
  const record = asRecord(raw);
  if (record && 'data' in record && record.data != null) return record.data;
  return raw;
}

function normalizeIdRef(raw: unknown): TeachingIdRef | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (id == null) return null;
  return { id, name: asString(r?.name) };
}

function normalizeAllowedActions(raw: unknown): TeachingReviewAllowedActions {
  const r = asRecord(raw) ?? {};
  return {
    mark_reviewed: asBoolean(r.mark_reviewed),
    request_changes: asBoolean(r.request_changes, true),
    approve_official: asBoolean(r.approve_official),
    view_versions: asBoolean(r.view_versions, true),
  };
}

function normalizeLocales(raw: unknown): TeachingPrintLocale[] {
  if (!Array.isArray(raw)) return [];
  const out: TeachingPrintLocale[] = [];
  for (const item of raw) {
    const locale = asString(item);
    if (locale && (TEACHING_PRINT_LOCALES as readonly string[]).includes(locale)) {
      out.push(locale as TeachingPrintLocale);
    }
  }
  return out;
}

export function normalizePagination(
  raw: unknown,
  fallback: Partial<TeachingPagination> = {},
): TeachingPagination {
  const r = asRecord(raw) ?? {};
  return {
    page: asNumber(r.page) ?? fallback.page ?? 1,
    page_size: asNumber(r.page_size) ?? fallback.page_size ?? 50,
    total: asNumber(r.total) ?? fallback.total ?? 0,
    has_more:
      typeof r.has_more === 'boolean'
        ? r.has_more
        : fallback.has_more,
  };
}

export function normalizeReviewQueueItem(raw: unknown): TeachingReviewQueueItem | null {
  const r = asRecord(raw);
  const documentId = asNumber(r?.document_id);
  const documentType = asString(r?.document_type);
  if (!r || documentId == null || !documentType) return null;
  return {
    document_type: documentType,
    document_id: documentId,
    reference: asString(r.reference),
    title: asString(r.title),
    owner_teacher: normalizeIdRef(r.owner_teacher),
    class: normalizeIdRef(r.class),
    offering: normalizeIdRef(r.offering),
    academic_year_id: asNumber(r.academic_year_id),
    period_id: asNumber(r.period_id),
    source_state: asString(r.source_state),
    review_state: asString(r.review_state),
    submitted_at: asString(r.submitted_at),
    reviewed_at: asString(r.reviewed_at),
    correction_requested: asBoolean(r.correction_requested),
    latest_correction_reason: asString(r.latest_correction_reason),
    officially_published: asBoolean(r.officially_published),
    latest_publication_no: asString(r.latest_publication_no),
    latest_publication_status: asString(r.latest_publication_status),
    allowed_actions: normalizeAllowedActions(r.allowed_actions),
  };
}

export function normalizeReviewQueueCounts(raw: unknown): TeachingReviewQueueCounts {
  const r = asRecord(raw) ?? {};
  const byTypeRaw = asRecord(r.by_document_type) ?? {};
  const byType: Record<string, number> = {};
  for (const [key, value] of Object.entries(byTypeRaw)) {
    const n = asNumber(value);
    if (n != null) byType[key] = n;
  }
  return {
    by_document_type: byType,
    pending_review: asNumber(r.pending_review) ?? 0,
    correction_requested: asNumber(r.correction_requested) ?? 0,
    reviewed_not_officially_published:
      asNumber(r.reviewed_not_officially_published) ?? 0,
    officially_published: asNumber(r.officially_published) ?? 0,
    zero_state: asBoolean(r.zero_state),
  };
}

export function normalizeReviewQueuePayload(raw: unknown): TeachingReviewQueuePayload {
  const data = asRecord(unwrapTeachingData(raw)) ?? {};
  return {
    items: listItems(data.items)
      .map(normalizeReviewQueueItem)
      .filter((item): item is TeachingReviewQueueItem => item != null),
    pagination: normalizePagination(data.pagination),
    counts: normalizeReviewQueueCounts(data.counts),
  };
}

export function normalizePublicationEvent(raw: unknown): TeachingPublicationEvent | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const meta = asRecord(r.metadata);
  return {
    id,
    publication_id: asNumber(r.publication_id),
    school_id: asNumber(r.school_id),
    event_type: asString(r.event_type),
    actor_id: asNumber(r.actor_id),
    event_at: asString(r.event_at),
    reason: asString(r.reason),
    metadata: meta,
  };
}

/**
 * Strips payload / payload_json from publication envelopes.
 * Detail mode may retain audit events but never raw snapshots.
 */
export function normalizeOfficialPublication(
  raw: unknown,
  options: { includeEvents?: boolean } = {},
): TeachingOfficialPublication | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const pub: TeachingOfficialPublication = {
    id,
    name: asString(r.name),
    publication_no: asString(r.publication_no),
    document_type: asString(r.document_type) ?? 'unknown',
    source_model: asString(r.source_model),
    source_res_id: asNumber(r.source_res_id),
    school_id: asNumber(r.school_id),
    academic_year_id: asNumber(r.academic_year_id),
    period_id: asNumber(r.period_id),
    owner_teacher_id: asNumber(r.owner_teacher_id),
    owner_teacher_name: asString(r.owner_teacher_name),
    source_revision_no: asNumber(r.source_revision_no),
    source_fingerprint: asString(r.source_fingerprint),
    payload_checksum: asString(r.payload_checksum),
    status: asString(r.status),
    approved_by_id: asNumber(r.approved_by_id),
    approved_at: asString(r.approved_at),
    review_note: asString(r.review_note),
    supersedes_publication_id: asNumber(r.supersedes_publication_id),
    superseded_by_publication_id: asNumber(r.superseded_by_publication_id),
    archived_at: asString(r.archived_at),
    attachment_id: asNumber(r.attachment_id),
  };
  if (options.includeEvents && Array.isArray(r.events)) {
    pub.events = r.events
      .map(normalizePublicationEvent)
      .filter((e): e is TeachingPublicationEvent => e != null);
  }
  return pub;
}

export function normalizeDocumentVersions(
  raw: unknown,
): TeachingDocumentVersionsPayload | null {
  const data = asRecord(unwrapTeachingData(raw));
  if (!data) return null;
  const documentId = asNumber(data.document_id);
  const documentType = asString(data.document_type);
  if (documentId == null || !documentType) return null;
  return {
    document_type: documentType,
    document_id: documentId,
    versions: Array.isArray(data.versions) ? data.versions : [],
    publications: listItems(data.publications)
      .map((item) => normalizeOfficialPublication(item, { includeEvents: false }))
      .filter((item): item is TeachingOfficialPublication => item != null),
  };
}

export function normalizeArchiveItem(raw: unknown): TeachingArchiveItem | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const actions = asRecord(r.allowed_actions) ?? {};
  return {
    id,
    publication_no: asString(r.publication_no),
    document_type: asString(r.document_type) ?? 'unknown',
    source_reference: asString(r.source_reference),
    school_id: asNumber(r.school_id),
    academic_year_id: asNumber(r.academic_year_id),
    period_id: asNumber(r.period_id),
    owner_teacher: normalizeIdRef(r.owner_teacher),
    approved_by_id: asNumber(r.approved_by_id),
    approved_at: asString(r.approved_at),
    status: asString(r.status),
    supersedes_publication_id: asNumber(r.supersedes_publication_id),
    superseded_by_publication_id: asNumber(r.superseded_by_publication_id),
    attachment_ready: asBoolean(r.attachment_ready),
    locales_available: normalizeLocales(r.locales_available),
    allowed_actions: {
      download: asBoolean(actions.download, true),
      view: asBoolean(actions.view, true),
      archive: asBoolean(actions.archive),
    },
  };
}

export function normalizeArchiveList(raw: unknown): TeachingArchiveListPayload {
  const data = asRecord(unwrapTeachingData(raw)) ?? {};
  return {
    items: listItems(data.items)
      .map(normalizeArchiveItem)
      .filter((item): item is TeachingArchiveItem => item != null),
    pagination: normalizePagination(data.pagination),
  };
}

export function normalizeReviewStatus(raw: unknown): TeachingReviewStatus | null {
  const data = asRecord(unwrapTeachingData(raw));
  if (!data) return null;
  const documentId = asNumber(data.document_id);
  const documentType = asString(data.document_type);
  if (documentId == null || !documentType) return null;
  return {
    document_type: documentType,
    document_id: documentId,
    source_state: asString(data.source_state),
    review_state: asString(data.review_state),
    revision_no: asNumber(data.revision_no),
    source_fingerprint: asString(data.source_fingerprint),
    submitted_at: asString(data.submitted_at),
    reviewed_at: asString(data.reviewed_at),
    latest_correction_reason: asString(data.latest_correction_reason),
    officially_published: asBoolean(data.officially_published),
    latest_publication: normalizeOfficialPublication(data.latest_publication),
    versions: Array.isArray(data.versions) ? data.versions : [],
  };
}

export function normalizeExportRequest(raw: unknown): TeachingExportRequest | null {
  const r = asRecord(unwrapTeachingData(raw));
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const documentTypes = Array.isArray(r.document_types)
    ? r.document_types.map((v) => asString(v)).filter((v): v is string => !!v)
    : [];
  return {
    id,
    name: asString(r.name),
    reference: asString(r.reference),
    school_id: asNumber(r.school_id),
    academic_year_id: asNumber(r.academic_year_id),
    period_id: asNumber(r.period_id),
    export_type: asString(r.export_type),
    document_types: documentTypes,
    locale: asString(r.locale),
    status: asString(r.status),
    requested_by_id: asNumber(r.requested_by_id),
    requested_at: asString(r.requested_at),
    generated_at: asString(r.generated_at),
    expires_at: asString(r.expires_at),
    record_count: asNumber(r.record_count),
    file_size: asNumber(r.file_size),
    checksum: asString(r.checksum),
    error_code: asString(r.error_code),
    error_message: asString(r.error_message),
    download_ready: asBoolean(r.download_ready),
    filters: asRecord(r.filters),
  };
}

function normalizeWarning(raw: unknown): TeachingClosureWarning | null {
  const r = asRecord(raw);
  if (!r) return null;
  const code = asString(r.code);
  if (!code) return null;
  return {
    code,
    count: asNumber(r.count) ?? undefined,
    kind: asString(r.kind),
    message: asString(r.message),
  };
}

function normalizeBlocker(raw: unknown): TeachingClosureBlocker | null {
  const r = asRecord(raw);
  if (!r) return null;
  const code = asString(r.code);
  if (!code) return null;
  return { code, message: asString(r.message) };
}

export function normalizeClosureEvent(raw: unknown): TeachingClosureEvent | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    closure_id: asNumber(r.closure_id),
    event_type: asString(r.event_type),
    closure_revision: asNumber(r.closure_revision),
    actor_id: asNumber(r.actor_id),
    event_at: asString(r.event_at),
    reason: asString(r.reason),
    snapshot_checksum: asString(r.snapshot_checksum),
  };
}

export function normalizePeriodException(raw: unknown): TeachingPeriodException | null {
  const r = asRecord(raw);
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  return {
    id,
    closure_id: asNumber(r.closure_id),
    school_id: asNumber(r.school_id),
    document_type: asString(r.document_type),
    source_model: asString(r.source_model),
    source_res_id: asNumber(r.source_res_id),
    allowed_action: asString(r.allowed_action),
    reason: asString(r.reason),
    authorized_by_id: asNumber(r.authorized_by_id),
    authorized_at: asString(r.authorized_at),
    expires_at: asString(r.expires_at),
    used_by_id: asNumber(r.used_by_id),
    used_at: asString(r.used_at),
    state: asString(r.state),
  };
}

export function normalizePeriodClosure(
  raw: unknown,
  detail = false,
): TeachingPeriodClosure | null {
  const r = asRecord(unwrapTeachingData(raw));
  const id = asNumber(r?.id);
  if (!r || id == null) return null;
  const closure: TeachingPeriodClosure = {
    id,
    name: asString(r.name),
    reference: asString(r.reference),
    school_id: asNumber(r.school_id),
    academic_year_id: asNumber(r.academic_year_id),
    scope_type: asString(r.scope_type),
    term_id: asNumber(r.term_id),
    state: asString(r.state),
    closure_revision: asNumber(r.closure_revision),
    current_snapshot_checksum: asString(r.current_snapshot_checksum),
    closed_by_id: asNumber(r.closed_by_id),
    closed_at: asString(r.closed_at),
    close_reason: asString(r.close_reason),
    reopened_by_id: asNumber(r.reopened_by_id),
    reopened_at: asString(r.reopened_at),
    reopen_reason: asString(r.reopen_reason),
    last_reclosed_at: asString(r.last_reclosed_at),
    warning_count: asNumber(r.warning_count),
    exception_count: asNumber(r.exception_count),
  };
  if (detail) {
    closure.events = listItems(r.events)
      .map(normalizeClosureEvent)
      .filter((e): e is TeachingClosureEvent => e != null);
    closure.exceptions = listItems(r.exceptions)
      .map(normalizePeriodException)
      .filter((e): e is TeachingPeriodException => e != null);
  }
  return closure;
}

export function normalizeClosureList(raw: unknown): TeachingClosureListPayload {
  const data = asRecord(unwrapTeachingData(raw)) ?? {};
  return {
    items: listItems(data.items)
      .map((item) => normalizePeriodClosure(item, false))
      .filter((item): item is TeachingPeriodClosure => item != null),
    pagination: normalizePagination(data.pagination),
  };
}

export function normalizeClosurePreview(raw: unknown): TeachingClosurePreview | null {
  const data = asRecord(unwrapTeachingData(raw));
  if (!data) return null;
  const preview = asRecord(data.preview) ?? {};
  const existing = asRecord(preview.existing_closure);
  return {
    preview: {
      school_id: asNumber(preview.school_id),
      academic_year_id: asNumber(preview.academic_year_id),
      term_id: asNumber(preview.term_id),
      scope_type: asString(preview.scope_type),
      jathatha: asRecord(preview.jathatha) ?? undefined,
      delivery: asRecord(preview.delivery) ?? undefined,
      journal: asRecord(preview.journal) ?? undefined,
      homework: asRecord(preview.homework) ?? undefined,
      distribution: asRecord(preview.distribution) ?? undefined,
      sequence: asRecord(preview.sequence) ?? undefined,
      assessment_support_aggregate:
        asRecord(preview.assessment_support_aggregate) ?? undefined,
      publications: asRecord(preview.publications) ?? undefined,
      exports: asRecord(preview.exports) ?? undefined,
      progress: asRecord(preview.progress) ?? undefined,
      existing_closure: existing
        ? {
            id: asNumber(existing.id),
            state: asString(existing.state),
            closure_revision: asNumber(existing.closure_revision) ?? 0,
          }
        : undefined,
      legacy_closed: asBoolean(preview.legacy_closed),
      legacy_kind: asString(preview.legacy_kind),
      warnings: listItems(preview.warnings)
        .map(normalizeWarning)
        .filter((w): w is TeachingClosureWarning => w != null),
      hard_blockers: listItems(preview.hard_blockers)
        .map(normalizeBlocker)
        .filter((b): b is TeachingClosureBlocker => b != null),
    },
    preview_checksum: asString(data.preview_checksum),
    warning_count: asNumber(data.warning_count) ?? 0,
    blocker_count: asNumber(data.blocker_count) ?? 0,
    can_close: asBoolean(data.can_close),
  };
}

export function normalizeTeacherClosureStatus(raw: unknown): TeacherClosureStatus {
  const data = asRecord(unwrapTeachingData(raw)) ?? {};
  return {
    closed: asBoolean(data.closed),
    kind: asString(data.kind),
    legacy_closed: asBoolean(data.legacy_closed),
    closure: normalizePeriodClosure(data.closure, false),
    academic_year_id: asNumber(data.academic_year_id),
    term_id: asNumber(data.term_id),
    teacher_id: asNumber(data.teacher_id),
  };
}

/** True when a raw envelope still contains restricted payload keys (tests / guards). */
export function envelopeExposesPayload(raw: unknown): boolean {
  const r = asRecord(raw);
  if (!r) return false;
  if ('payload' in r || 'payload_json' in r) return true;
  if (Array.isArray(r.items)) {
    return r.items.some((item) => {
      const row = asRecord(item);
      return !!row && ('payload' in row || 'payload_json' in row);
    });
  }
  return false;
}
