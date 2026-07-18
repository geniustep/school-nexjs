/**
 * Teaching Stage 9 — Review, Official Publication, Print/Archive/Export, Period Closure.
 * Types mirror Odoo 18.0.1.0.224 (commit 6822ac8). Backend remains SoT.
 */

export const TEACHING_DOCUMENT_TYPES = [
  'teacher_jathatha',
  'actual_delivery',
  'class_journal',
  'homework',
  'annual_distribution',
  'didactic_sequence',
] as const;

export type TeachingDocumentType = (typeof TEACHING_DOCUMENT_TYPES)[number];

export const TEACHING_REVIEW_STATES = [
  'not_reviewed',
  'reviewed',
  'correction_requested',
] as const;

export type TeachingReviewState = (typeof TEACHING_REVIEW_STATES)[number] | string;

export const TEACHING_PUBLICATION_STATUSES = [
  'approved',
  'superseded',
  'archived',
] as const;

export type TeachingPublicationStatus =
  | (typeof TEACHING_PUBLICATION_STATUSES)[number]
  | string;

export const TEACHING_EXPORT_FORMATS = [
  'pdf',
  'csv',
  'zip',
  'json_audit',
] as const;

/** Formats shown in UI — XLSX intentionally excluded while backend reports deferred. */
export type TeachingExportFormat = (typeof TEACHING_EXPORT_FORMATS)[number];

export const TEACHING_EXPORT_STATUSES = [
  'pending',
  'processing',
  'ready',
  'failed',
  'expired',
] as const;

export type TeachingExportStatus = (typeof TEACHING_EXPORT_STATUSES)[number] | string;

export const TEACHING_PRINT_LOCALES = ['ar', 'fr'] as const;
export type TeachingPrintLocale = (typeof TEACHING_PRINT_LOCALES)[number];

export const TEACHING_CLOSURE_SCOPE_TYPES = ['term', 'academic_year'] as const;
export type TeachingClosureScopeType = (typeof TEACHING_CLOSURE_SCOPE_TYPES)[number];

export const TEACHING_CLOSURE_STATES = [
  'open',
  'closing',
  'closed',
  'reopened',
] as const;

export type TeachingClosureState = (typeof TEACHING_CLOSURE_STATES)[number] | string;

export const TEACHING_EXCEPTION_STATES = [
  'authorized',
  'used',
  'expired',
  'cancelled',
] as const;

export type TeachingExceptionState =
  | (typeof TEACHING_EXCEPTION_STATES)[number]
  | string;

export type TeachingIdRef = {
  id: number;
  name: string | null;
};

export type TeachingReviewAllowedActions = {
  mark_reviewed: boolean;
  request_changes: boolean;
  approve_official: boolean;
  view_versions: boolean;
};

export type TeachingReviewQueueItem = {
  document_type: TeachingDocumentType | string;
  document_id: number;
  reference: string | null;
  title: string | null;
  owner_teacher: TeachingIdRef | null;
  class: TeachingIdRef | null;
  offering: TeachingIdRef | null;
  academic_year_id: number | null;
  period_id: number | null;
  source_state: string | null;
  review_state: TeachingReviewState | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  correction_requested: boolean;
  latest_correction_reason: string | null;
  officially_published: boolean;
  latest_publication_no: string | null;
  latest_publication_status: TeachingPublicationStatus | null;
  allowed_actions: TeachingReviewAllowedActions;
};

export type TeachingReviewQueueCounts = {
  by_document_type: Record<string, number>;
  pending_review: number;
  correction_requested: number;
  reviewed_not_officially_published: number;
  officially_published: number;
  zero_state: boolean;
};

export type TeachingPagination = {
  page: number;
  page_size: number;
  total: number;
  has_more?: boolean;
};

export type TeachingReviewQueuePayload = {
  items: TeachingReviewQueueItem[];
  pagination: TeachingPagination;
  counts: TeachingReviewQueueCounts;
};

export type TeachingArchiveAllowedActions = {
  download: boolean;
  view: boolean;
  archive: boolean;
};

export type TeachingArchiveItem = {
  id: number;
  publication_no: string | null;
  document_type: TeachingDocumentType | string;
  source_reference: string | null;
  school_id: number | null;
  academic_year_id: number | null;
  period_id: number | null;
  owner_teacher: TeachingIdRef | null;
  approved_by_id: number | null;
  approved_at: string | null;
  status: TeachingPublicationStatus | null;
  supersedes_publication_id: number | null;
  superseded_by_publication_id: number | null;
  attachment_ready: boolean;
  locales_available: TeachingPrintLocale[];
  allowed_actions: TeachingArchiveAllowedActions;
};

export type TeachingArchiveListPayload = {
  items: TeachingArchiveItem[];
  pagination: TeachingPagination;
};

/** Summary publication — never includes payload / payload_json. */
export type TeachingOfficialPublication = {
  id: number;
  name: string | null;
  publication_no: string | null;
  document_type: TeachingDocumentType | string;
  source_model: string | null;
  source_res_id: number | null;
  school_id: number | null;
  academic_year_id: number | null;
  period_id: number | null;
  owner_teacher_id: number | null;
  owner_teacher_name: string | null;
  source_revision_no: number | null;
  source_fingerprint: string | null;
  payload_checksum: string | null;
  status: TeachingPublicationStatus | null;
  approved_by_id: number | null;
  approved_at: string | null;
  review_note: string | null;
  supersedes_publication_id: number | null;
  superseded_by_publication_id: number | null;
  archived_at: string | null;
  attachment_id: number | null;
  events?: TeachingPublicationEvent[];
  /** Always stripped from API responses before UI use. */
  payload?: never;
};

export type TeachingPublicationEvent = {
  id: number;
  publication_id: number | null;
  school_id: number | null;
  event_type: string | null;
  actor_id: number | null;
  event_at: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
};

export type TeachingDocumentVersionsPayload = {
  document_type: string;
  document_id: number;
  versions: unknown[];
  publications: TeachingOfficialPublication[];
};

export type TeachingReviewStatus = {
  document_type: string;
  document_id: number;
  source_state: string | null;
  review_state: TeachingReviewState | null;
  revision_no: number | null;
  source_fingerprint: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  latest_correction_reason: string | null;
  officially_published: boolean;
  latest_publication: TeachingOfficialPublication | null;
  versions: unknown[];
};

export type TeachingExportRequest = {
  id: number;
  name: string | null;
  reference: string | null;
  school_id: number | null;
  academic_year_id: number | null;
  period_id: number | null;
  export_type: string | null;
  document_types: string[];
  locale: TeachingPrintLocale | string | null;
  status: TeachingExportStatus | null;
  requested_by_id: number | null;
  requested_at: string | null;
  generated_at: string | null;
  expires_at: string | null;
  record_count: number | null;
  file_size: number | null;
  checksum: string | null;
  error_code: string | null;
  error_message: string | null;
  download_ready: boolean;
  filters?: Record<string, unknown> | null;
};

export type TeachingClosureWarning = {
  code: string;
  count?: number;
  kind?: string | null;
  message?: string | null;
};

export type TeachingClosureBlocker = {
  code: string;
  message?: string | null;
};

export type TeachingPeriodClosure = {
  id: number;
  name: string | null;
  reference: string | null;
  school_id: number | null;
  academic_year_id: number | null;
  scope_type: TeachingClosureScopeType | string | null;
  term_id: number | null;
  state: TeachingClosureState | null;
  closure_revision: number | null;
  current_snapshot_checksum: string | null;
  closed_by_id: number | null;
  closed_at: string | null;
  close_reason: string | null;
  reopened_by_id: number | null;
  reopened_at: string | null;
  reopen_reason: string | null;
  last_reclosed_at: string | null;
  warning_count: number | null;
  exception_count: number | null;
  events?: TeachingClosureEvent[];
  exceptions?: TeachingPeriodException[];
};

export type TeachingClosureEvent = {
  id: number;
  closure_id: number | null;
  event_type: string | null;
  closure_revision: number | null;
  actor_id: number | null;
  event_at: string | null;
  reason: string | null;
  snapshot_checksum: string | null;
};

export type TeachingPeriodException = {
  id: number;
  closure_id: number | null;
  school_id: number | null;
  document_type: string | null;
  source_model: string | null;
  source_res_id: number | null;
  allowed_action: string | null;
  reason: string | null;
  authorized_by_id: number | null;
  authorized_at: string | null;
  expires_at: string | null;
  used_by_id: number | null;
  used_at: string | null;
  state: TeachingExceptionState | null;
};

export type TeachingClosurePreview = {
  preview: {
    school_id: number | null;
    academic_year_id: number | null;
    term_id: number | null;
    scope_type: string | null;
    jathatha?: Record<string, unknown>;
    delivery?: Record<string, unknown>;
    journal?: Record<string, unknown>;
    homework?: Record<string, unknown>;
    distribution?: Record<string, unknown>;
    sequence?: Record<string, unknown>;
    assessment_support_aggregate?: Record<string, unknown>;
    publications?: Record<string, unknown>;
    exports?: Record<string, unknown>;
    progress?: Record<string, unknown>;
    existing_closure?: {
      id: number | null;
      state: string | null;
      closure_revision: number;
    };
    legacy_closed: boolean;
    legacy_kind: string | null;
    warnings: TeachingClosureWarning[];
    hard_blockers: TeachingClosureBlocker[];
  };
  preview_checksum: string | null;
  warning_count: number;
  blocker_count: number;
  can_close: boolean;
};

export type TeachingClosureListPayload = {
  items: TeachingPeriodClosure[];
  pagination: TeachingPagination;
};

export type TeacherClosureStatus = {
  closed: boolean;
  kind: string | null;
  legacy_closed: boolean;
  closure: TeachingPeriodClosure | null;
  academic_year_id: number | null;
  term_id: number | null;
  teacher_id?: number | null;
};

export type AdminReviewPublicationTab =
  | 'queue'
  | 'publications'
  | 'archive'
  | 'exports'
  | 'closure';

export type TeacherReviewPublicationTab =
  | 'status'
  | 'publications'
  | 'print'
  | 'closure';

/** Confirmed export limits from Odoo export service defaults. */
export const TEACHING_EXPORT_LIMITS = {
  maxZipDocuments: 100,
  maxBytes: 25 * 1024 * 1024,
  maxRows: 10000,
  expiryHours: 48,
} as const;
