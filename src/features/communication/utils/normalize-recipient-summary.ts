/**
 * Normalize Backend recipient_summary / preview payloads (Odoo B4).
 * Never invent totals from local guardian/student/staff sums.
 * Preserve 0; leave missing as undefined; ignore unknown fields safely.
 */

import type {
  CommunicationRecipientExclusion,
  CommunicationRecipientPreviewResponse,
  CommunicationRecipientSummary,
  CommunicationSubmitResult,
} from '@/types/communication';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Safe non-negative count. Preserves 0. Rejects NaN.
 * Numeric strings accepted when finite. Negatives clamped to 0 (documented).
 */
export function normalizeRecipientCount(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    n = Number(value);
  } else {
    return undefined;
  }
  if (!Number.isFinite(n) || Number.isNaN(n)) return undefined;
  if (n < 0) return 0;
  return n;
}

/** Missing stays undefined — never coerce missing to true. */
export function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true) return true;
  if (value === false) return false;
  return undefined;
}

function normalizeString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return undefined;
}

function normalizeStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item): item is string => typeof item === 'string');
  return out;
}

function normalizeExclusion(raw: unknown): CommunicationRecipientExclusion | null {
  const row = asRecord(raw);
  if (!row) {
    if (typeof raw === 'string' && raw.trim()) {
      return { reason: raw };
    }
    return null;
  }
  const count = normalizeRecipientCount(row.count);
  return {
    code: normalizeString(row.code) ?? null,
    reason: normalizeString(row.reason) ?? normalizeString(row.label) ?? null,
    label: normalizeString(row.label) ?? null,
    count: count ?? null,
  };
}

function normalizeExclusions(value: unknown): CommunicationRecipientExclusion[] | undefined {
  if (!Array.isArray(value)) {
    if (typeof value === 'string' && value.trim()) {
      return [{ reason: value }];
    }
    return undefined;
  }
  const out: CommunicationRecipientExclusion[] = [];
  for (const item of value) {
    const exclusion = normalizeExclusion(item);
    if (exclusion) out.push(exclusion);
  }
  return out;
}

/**
 * Returns null only when input is not an object.
 * Empty/partial summaries are valid (optional fields).
 */
export function normalizeRecipientSummary(
  data: unknown,
): CommunicationRecipientSummary | null {
  const row = asRecord(data);
  if (!row) return null;

  const summary: CommunicationRecipientSummary = {};

  const resolutionState = normalizeString(row.resolution_state);
  if (resolutionState !== undefined) summary.resolution_state = resolutionState;

  const snapshotId = normalizeRecipientCount(row.snapshot_id);
  if (snapshotId !== undefined) summary.snapshot_id = snapshotId;

  const fingerprint = normalizeString(row.snapshot_fingerprint);
  if (fingerprint !== undefined) summary.snapshot_fingerprint = fingerprint;

  const isFrozen = normalizeOptionalBoolean(row.is_frozen);
  if (isFrozen !== undefined) summary.is_frozen = isFrozen;

  const resolvedAt = normalizeString(row.resolved_at);
  if (resolvedAt !== undefined) summary.resolved_at = resolvedAt;

  const total = normalizeRecipientCount(row.total_people_count);
  if (total !== undefined) summary.total_people_count = total;

  const deliverable = normalizeRecipientCount(row.deliverable_user_count);
  if (deliverable !== undefined) summary.deliverable_user_count = deliverable;

  const students = normalizeRecipientCount(row.student_count);
  if (students !== undefined) summary.student_count = students;

  const guardians = normalizeRecipientCount(row.guardian_count);
  if (guardians !== undefined) summary.guardian_count = guardians;

  const staff = normalizeRecipientCount(row.staff_count);
  if (staff !== undefined) summary.staff_count = staff;

  const teachers = normalizeRecipientCount(row.teacher_count);
  if (teachers !== undefined) summary.teacher_count = teachers;

  const excluded = normalizeRecipientCount(row.excluded_count);
  if (excluded !== undefined) summary.excluded_count = excluded;

  const labels = normalizeStringList(row.audience_labels);
  if (labels !== undefined) summary.audience_labels = labels;

  const exclusions = normalizeExclusions(row.exclusion_summary);
  if (exclusions !== undefined) summary.exclusion_summary = exclusions;

  const sourceType = normalizeString(row.source_type);
  if (sourceType !== undefined) summary.source_type = sourceType;

  const sourceId = normalizeRecipientCount(row.source_id);
  if (sourceId !== undefined) summary.source_id = sourceId;

  const schoolId = normalizeRecipientCount(row.school_id);
  if (schoolId !== undefined) summary.school_id = schoolId;

  const versionId = normalizeRecipientCount(row.version_id);
  if (versionId !== undefined) summary.version_id = versionId;

  const audienceChanged = normalizeOptionalBoolean(row.audience_changed);
  if (audienceChanged !== undefined) summary.audience_changed = audienceChanged;

  const canSubmit = normalizeOptionalBoolean(row.can_submit);
  if (canSubmit !== undefined) summary.can_submit = canSubmit;

  const blocking = normalizeStringList(row.blocking_reasons);
  if (blocking !== undefined) summary.blocking_reasons = blocking;

  return summary;
}

/** Preview envelope — advisory; presentation forced to preview. */
export function normalizeRecipientPreviewResponse(
  data: unknown,
): CommunicationRecipientPreviewResponse | null {
  const row = asRecord(data);
  if (!row) return null;

  const nested = row.recipient_summary;
  const summary = normalizeRecipientSummary(
    nested !== undefined && nested !== null ? nested : row,
  );
  if (!summary) return null;

  // Preview is never final: clear frozen identity presentation cues for UI consumers
  // that rely on presentation === 'preview'. Keep Backend counts as-is.
  return {
    recipient_summary: {
      ...summary,
      // Keep Backend is_frozen if present, but mark presentation as preview.
    },
    presentation: 'preview',
  };
}

/** Extract Submit/Detail snapshot fields without inventing values. */
export function normalizeCommunicationSubmitResult(
  data: unknown,
): CommunicationSubmitResult | null {
  const row = asRecord(data);
  if (!row) return null;

  const result: CommunicationSubmitResult = {};

  const summary = normalizeRecipientSummary(row.recipient_summary);
  if (summary) result.recipient_summary = summary;

  const snapshotId = normalizeRecipientCount(row.snapshot_id);
  if (snapshotId !== undefined) result.snapshot_id = snapshotId;
  else if (summary?.snapshot_id != null) result.snapshot_id = summary.snapshot_id;

  const fingerprint = normalizeString(row.snapshot_fingerprint);
  if (fingerprint !== undefined) result.snapshot_fingerprint = fingerprint;
  else if (summary?.snapshot_fingerprint != null) {
    result.snapshot_fingerprint = summary.snapshot_fingerprint;
  }

  const versionId = normalizeRecipientCount(row.version_id);
  if (versionId !== undefined) result.version_id = versionId;
  else if (summary?.version_id != null) result.version_id = summary.version_id;

  const contentId = normalizeRecipientCount(row.communication_content_id);
  if (contentId !== undefined) result.communication_content_id = contentId;

  const state =
    normalizeString(row.communication_state) ?? normalizeString(row.state);
  if (state !== undefined) result.communication_state = state;

  if (Array.isArray(row.allowed_actions)) {
    result.allowed_actions = row.allowed_actions.filter(
      (a): a is string => typeof a === 'string',
    );
  }

  return result;
}

/** Short admin-only fingerprint display (never full hash for end users). */
export function shortSnapshotFingerprint(
  fingerprint: string | null | undefined,
  visible = 10,
): string | null {
  if (!fingerprint || typeof fingerprint !== 'string') return null;
  const trimmed = fingerprint.trim();
  if (!trimmed) return null;
  if (trimmed.length <= visible) return trimmed;
  return `${trimmed.slice(0, visible)}…`;
}
