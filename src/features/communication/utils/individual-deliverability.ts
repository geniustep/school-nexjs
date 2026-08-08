/**
 * Individual messaging deliverability helpers.
 * Odoo preview remains authoritative — no local audience recomputation.
 */

import type { IndividualCommunicationPreview } from '@/types/communication';
import type { CommunicationRecipientExclusion } from '@/types/communication';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeRecipientCount(value: unknown): number | undefined {
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

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
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
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeExclusion(raw: unknown): CommunicationRecipientExclusion | null {
  const row = asRecord(raw);
  if (!row) {
    if (typeof raw === 'string' && raw.trim()) return { reason: raw };
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
    if (typeof value === 'string' && value.trim()) return [{ reason: value }];
    return undefined;
  }
  const out: CommunicationRecipientExclusion[] = [];
  for (const item of value) {
    const exclusion = normalizeExclusion(item);
    if (exclusion) out.push(exclusion);
  }
  return out;
}

/** Normalize read-only individual preview without inventing deliverability. */
export function normalizeIndividualCommunicationPreview(
  data: unknown,
): IndividualCommunicationPreview | null {
  const row = asRecord(data);
  if (!row) return null;

  const nested = asRecord(row.preview) ?? asRecord(row.recipient_summary);
  const source = nested ?? row;
  const preview: IndividualCommunicationPreview = {};

  const recipientType = normalizeString(source.recipient_type ?? row.recipient_type);
  if (recipientType !== undefined) preview.recipient_type = recipientType;

  const recipientCount = normalizeRecipientCount(source.recipient_count ?? row.recipient_count);
  if (recipientCount !== undefined) preview.recipient_count = recipientCount;

  const deliverable = normalizeRecipientCount(
    source.deliverable_user_count ?? row.deliverable_user_count,
  );
  if (deliverable !== undefined) preview.deliverable_user_count = deliverable;

  const canSubmit = normalizeOptionalBoolean(source.can_submit ?? row.can_submit);
  if (canSubmit !== undefined) preview.can_submit = canSubmit;

  const accountStatus = normalizeString(source.account_status ?? row.account_status);
  if (accountStatus !== undefined) preview.account_status = accountStatus;

  const blocking = normalizeStringList(source.blocking_reasons ?? row.blocking_reasons);
  if (blocking !== undefined) preview.blocking_reasons = blocking;

  const exclusions = normalizeExclusions(source.exclusion_summary ?? row.exclusion_summary);
  if (exclusions !== undefined) preview.exclusion_summary = exclusions;

  const moderation = asRecord(source.moderation ?? row.moderation);
  if (moderation) preview.moderation = moderation;

  const recipient = asRecord(source.recipient ?? row.recipient);
  if (recipient) preview.recipient = recipient;

  return preview;
}

/**
 * Submit gate for individual messaging.
 * Fail closed unless Backend explicitly allows exactly one deliverable account.
 */
export function isIndividualSubmitAllowed(
  preview: IndividualCommunicationPreview | null | undefined,
): boolean {
  if (!preview) return false;
  return preview.can_submit === true && preview.deliverable_user_count === 1;
}

const ACCOUNT_STATUS_MESSAGE_KEYS: Record<string, string> = {
  no_account: 'communication.general.individualAccountNoAccount',
  inactive: 'communication.general.individualAccountInactive',
  guardian_inactive: 'communication.general.individualAccountGuardianInactive',
};

const EXCLUSION_OR_BLOCKING_MESSAGE_KEYS: Record<string, string> = {
  missing_portal_user: 'communication.general.individualAccountNoAccount',
  no_account: 'communication.general.individualAccountNoAccount',
  inactive: 'communication.general.individualAccountInactive',
  inactive_user: 'communication.general.individualAccountInactive',
  guardian_inactive: 'communication.general.individualAccountGuardianInactive',
  communication_individual_recipient_count_invalid:
    'communication.errors.individualRecipientCountInvalid',
};

function firstMappedCode(codes: Array<string | null | undefined>): string | null {
  for (const code of codes) {
    if (!code) continue;
    const key = EXCLUSION_OR_BLOCKING_MESSAGE_KEYS[code];
    if (key) return key;
  }
  return null;
}

/**
 * User-facing i18n key from Backend preview fields only.
 * Never invent "no account" unless Backend states it.
 */
export function individualDeliverabilityMessageKey(
  preview: IndividualCommunicationPreview | null | undefined,
): string {
  if (!preview) {
    return 'communication.general.individualDeliverabilityUnavailable';
  }

  const accountStatus =
    typeof preview.account_status === 'string' ? preview.account_status.trim() : '';
  if (accountStatus && ACCOUNT_STATUS_MESSAGE_KEYS[accountStatus]) {
    return ACCOUNT_STATUS_MESSAGE_KEYS[accountStatus];
  }

  const exclusionCodes = (preview.exclusion_summary ?? []).map((row) => row.code);
  const fromExclusion = firstMappedCode(exclusionCodes);
  if (fromExclusion) return fromExclusion;

  const fromBlocking = firstMappedCode(preview.blocking_reasons ?? []);
  if (fromBlocking) return fromBlocking;

  if (preview.can_submit === false) {
    return 'communication.general.individualDeliverabilityUnavailable';
  }

  return 'communication.general.individualDeliverabilityUnavailable';
}

/** Ignore stale async preview responses when the selected recipient changes. */
export function createRequestGenerationGuard() {
  let current = 0;
  return {
    next(): number {
      current += 1;
      return current;
    },
    isCurrent(token: number): boolean {
      return token === current;
    },
  };
}
