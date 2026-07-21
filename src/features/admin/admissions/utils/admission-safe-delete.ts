/**
 * Permanent admission DELETE — Odoo `can_delete` is the only display authority.
 */

import type { ApiErrorBody } from '@/types/api';

/** Fail-closed: only an explicit boolean true enables the action. */
export function normalizeAdmissionCanDelete(raw: unknown): boolean {
  return raw === true;
}

export function normalizeAdmissionDeleteBlockReason(raw: unknown): string | false {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed ? trimmed : false;
  }
  return false;
}

export function admissionAllowsSafeDelete(record: {
  can_delete?: boolean | null;
} | null | undefined): boolean {
  return record?.can_delete === true;
}

export type AdmissionSafeDeleteErrorKind =
  | 'forbidden'
  | 'not_found'
  | 'not_allowed'
  | 'network'
  | 'unknown';

export function mapAdmissionSafeDeleteError(error: unknown): {
  kind: AdmissionSafeDeleteErrorKind;
  messageKey: string;
  reason?: string;
} {
  const value = error as ApiErrorBody & {
    status?: number;
    details?: {
      status?: number;
      reason?: string | false | null;
      code?: string;
      message?: string;
    };
  };

  const status = value?.status ?? value?.details?.status;
  const code = String(value?.code ?? value?.details?.code ?? '')
    .trim()
    .toLowerCase();
  const reasonRaw = value?.details?.reason;
  const reason =
    typeof reasonRaw === 'string' && reasonRaw.trim() ? reasonRaw.trim() : undefined;

  if (status === 403 || code === 'forbidden') {
    return { kind: 'forbidden', messageKey: 'admin.admissions.safeDelete.forbidden' };
  }
  if (status === 404 || code === 'not_found') {
    return { kind: 'not_found', messageKey: 'admin.admissions.safeDelete.notFound' };
  }
  if (status === 409 || code === 'admission_delete_not_allowed') {
    return {
      kind: 'not_allowed',
      messageKey: 'admin.admissions.safeDelete.notAllowed',
      reason,
    };
  }
  if (code === 'network_error') {
    return { kind: 'network', messageKey: 'admin.admissions.safeDelete.networkError' };
  }
  return { kind: 'unknown', messageKey: 'admin.admissions.safeDelete.unknownError' };
}
