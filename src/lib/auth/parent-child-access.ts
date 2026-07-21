/**
 * Parent child access policy helpers (client-safe).
 * Authorization authority remains the Odoo Parent API response.
 */

import type { ApiErrorBody, ApiResponse } from '@/types/api';

export type ParentChildAccessDecision =
  | { ok: true }
  | { ok: false; reason: 'denied' | 'unavailable' };

/** HTTP/API outcomes that must not reveal whether a student exists. */
export function isParentChildAccessDeniedError(
  error: Pick<ApiErrorBody, 'code' | 'details'> | null | undefined,
): boolean {
  if (!error?.code) return false;
  const code = String(error.code).toLowerCase();
  if (
    code === 'forbidden' ||
    code === 'permission_denied' ||
    code === 'not_found' ||
    code === 'active_role_not_available' ||
    code === 'active_role_conflict' ||
    code === 'invalid_active_role'
  ) {
    return true;
  }
  const status = Number(error.details?.status);
  return status === 403 || status === 404;
}

export function decideParentChildAccess<T>(
  response: ApiResponse<T> | null | undefined,
): ParentChildAccessDecision {
  if (!response) return { ok: false, reason: 'unavailable' };
  if (response.success) return { ok: true };
  if (isParentChildAccessDeniedError(response.error)) {
    return { ok: false, reason: 'denied' };
  }
  return { ok: false, reason: 'unavailable' };
}

export function parseParentChildId(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
