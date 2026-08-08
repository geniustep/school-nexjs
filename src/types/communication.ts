/**
 * Communication content + channel-message moderation — mirrors Odoo 18.0.1.0.229
 * (B1–B3 + B4 recipient preview / immutable snapshot). Backend remains source of truth.
 */

import type { Ref } from './api';

/** Aggregated exclusion reason from Backend (no PII / no recipient lines). */
export interface CommunicationRecipientExclusion {
  code?: string | null;
  reason?: string | null;
  label?: string | null;
  count?: number | null;
}

/**
 * Backend recipient_summary — advisory on Preview, frozen on Submit/Detail.
 * All counts/labels come from Odoo; clients must not recompute audience.
 */
export interface CommunicationRecipientSummary {
  resolution_state?: string | null;
  snapshot_id?: number | null;
  snapshot_fingerprint?: string | null;
  is_frozen?: boolean | null;
  resolved_at?: string | null;
  total_people_count?: number | null;
  deliverable_user_count?: number | null;
  student_count?: number | null;
  guardian_count?: number | null;
  staff_count?: number | null;
  teacher_count?: number | null;
  excluded_count?: number | null;
  audience_labels?: string[] | null;
  exclusion_summary?: CommunicationRecipientExclusion[] | null;
  source_type?: string | null;
  source_id?: number | null;
  school_id?: number | null;
  version_id?: number | null;
  audience_changed?: boolean | null;
  can_submit?: boolean | null;
  blocking_reasons?: string[] | null;
}

/** Snapshot identity fields when Backend freezes an audience. */
export interface CommunicationRecipientSnapshotRef {
  snapshot_id?: number | null;
  snapshot_fingerprint?: string | null;
  version_id?: number | null;
  is_frozen?: boolean | null;
  resolved_at?: string | null;
}

/** POST …/recipient-preview — advisory only; never treat as final frozen truth. */
export interface CommunicationRecipientPreviewResponse {
  recipient_summary: CommunicationRecipientSummary;
  /** Explicit presentation hint for UI (always advisory for Preview endpoints). */
  presentation?: 'preview';
}

/**
 * POST …/admin/communication/individual/preview — read-only deliverability check.
 * Odoo remains source of truth; clients must not recompute deliverability.
 */
export interface IndividualCommunicationPreview {
  recipient_type?: string | null;
  recipient_count?: number | null;
  deliverable_user_count?: number | null;
  can_submit?: boolean | null;
  account_status?: string | null;
  blocking_reasons?: string[] | null;
  exclusion_summary?: CommunicationRecipientExclusion[] | null;
  /** Opaque backend moderation payload — store for display only, never invent rules. */
  moderation?: Record<string, unknown> | null;
  /** Domain recipient echo from backend when present (not res.users id). */
  recipient?: Record<string, unknown> | null;
}

/**
 * Fields commonly returned on Submit / Pending / Detail after freeze.
 * Prefer Submit response over any prior Preview summary.
 */
export interface CommunicationSubmitResult {
  recipient_summary?: CommunicationRecipientSummary | null;
  snapshot_id?: number | null;
  snapshot_fingerprint?: string | null;
  version_id?: number | null;
  communication_content_id?: number | null;
  communication_state?: CommunicationContentState | null;
  allowed_actions?: CommunicationAllowedAction[];
}

export const COMMUNICATION_CONTENT_STATES = [
  'draft',
  'submitted',
  'changes_requested',
  'approved',
  'scheduled',
  'publishing',
  'published',
  'partially_delivered',
  'delivery_failed',
  'cancelled',
  'archived',
] as const;

export type CommunicationContentState = (typeof COMMUNICATION_CONTENT_STATES)[number] | string;

export const COMMUNICATION_CONTENT_TYPES = [
  'message',
  'announcement',
  'homework',
  'resource',
  'attendance_notice',
  'discipline_notice',
  'timetable_notice',
  'exam_notice',
  'result_notice',
  'finance_notice',
  'service_notice',
  'system_notice',
] as const;

export type CommunicationContentType = (typeof COMMUNICATION_CONTENT_TYPES)[number] | string;

export type CommunicationAllowedAction =
  | 'edit'
  | 'submit'
  | 'resubmit'
  | 'request_changes'
  | 'approve'
  | 'publish'
  | 'schedule'
  | 'cancel'
  | 'archive'
  | 'view_audit'
  | 'view_status'
  | string;

export type ChannelMessageAction = 'send_internal' | 'submit_message' | string;

export interface CommunicationActorRef {
  id: number;
  name: string;
}

export interface CommunicationVersionSummary {
  id: number;
  version_number: number;
  checksum?: string | null;
  created_at?: string | null;
  subject?: string | null;
  language?: string | null;
  priority?: string | null;
  content_type?: string | null;
  body?: string | null;
  audience?: Record<string, unknown> | null;
  attachments?: CommunicationAttachment[];
  source?: CommunicationSourceRef | null;
}

export interface CommunicationAttachment {
  id?: number;
  name?: string | null;
  mimetype?: string | null;
  size?: number | null;
  url?: string | null;
}

export interface CommunicationSourceRef {
  model?: string | null;
  res_id?: number | null;
  event?: string | null;
}

export interface CommunicationAudienceSummary {
  type?: string | null;
  school_id?: number | null;
  label?: string | null;
  class?: Ref | null;
  level?: Ref | null;
  subject?: Ref | null;
  [key: string]: unknown;
}

export interface CommunicationAuditDecision {
  id: number;
  content_id?: number;
  version_id?: number | null;
  decision: string;
  actor?: CommunicationActorRef | null;
  decision_at?: string | null;
  reason?: string | null;
  school_id?: number | null;
  same_actor_as_author?: boolean | null;
  delegation_ref?: string | null;
}

export interface CommunicationContent {
  id: number;
  name?: string | null;
  school_id: number;
  subject?: string | null;
  content_type: CommunicationContentType;
  language?: string | null;
  priority?: string | null;
  state: CommunicationContentState;
  author?: CommunicationActorRef | null;
  reviewer?: CommunicationActorRef | null;
  created_by_role?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  current_version?: CommunicationVersionSummary | null;
  approved_version?: CommunicationVersionSummary | null;
  audience_summary?: CommunicationAudienceSummary | null;
  source_summary?: CommunicationSourceRef | null;
  allowed_actions?: CommunicationAllowedAction[];
  last_decision_reason?: string | null;
  source_stale?: boolean | null;
  source_fingerprint?: string | null;
  message_direction?: string | null;
  channel_id?: number | null;
  published_message_id?: number | null;
  moderation_required?: boolean | null;
  audience_recipient_count?: number | null;
  /** B4 — frozen recipient summary when Backend returns it on detail/pending. */
  recipient_summary?: CommunicationRecipientSummary | null;
  snapshot_id?: number | null;
  snapshot_fingerprint?: string | null;
  version_id?: number | null;
  audience_changed?: boolean | null;
  /** Detail-only */
  body?: string | null;
  attachments?: CommunicationAttachment[];
  audit_decisions?: CommunicationAuditDecision[];
  changes_requested_reason?: string | null;
}

/** POST …/messages when moderation is required (HTTP 202). */
export interface PendingMessageSubmitResult {
  pending_review: true;
  communication_content_id: number;
  channel_id: number;
  subject?: string | null;
  summary?: string | null;
  state?: CommunicationContentState;
  communication_state?: CommunicationContentState;
  message_direction?: string | null;
  submitted_at?: string | null;
  changes_requested_reason?: string | null;
  last_decision?: { state?: string | null; reason?: string | null } | null;
  allowed_actions?: CommunicationAllowedAction[];
  /** Backend notice — may be English; UI prefers i18n. */
  message?: string | null;
  /** B4 — final frozen summary from Submit (authoritative over Preview). */
  recipient_summary?: CommunicationRecipientSummary | null;
  snapshot_id?: number | null;
  snapshot_fingerprint?: string | null;
  version_id?: number | null;
  audience_changed?: boolean | null;
}

export type SendChannelMessageOutcome =
  | { kind: 'published'; message: import('./message').Message; httpStatus: number }
  | { kind: 'pending'; pending: PendingMessageSubmitResult; httpStatus: number };
