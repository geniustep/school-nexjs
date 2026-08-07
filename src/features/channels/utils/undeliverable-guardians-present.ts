/**
 * Privacy-safe presentation helpers for undeliverable guardians (Odoo 255).
 * Never surface phone / email / login / user_id.
 */

import type { ApiErrorBody } from '@/types/api';
import type {
  UndeliverableGuardianAccountStatus,
  UndeliverableGuardianRow,
  UndeliverableGuardianStudent,
} from '@/types/admin-channel';

export const UNDELIVERABLE_PAGE_SIZE = 50;

const ACCOUNT_STATUS_KEYS: Record<UndeliverableGuardianAccountStatus, string> = {
  no_account: 'channels.audience.undeliverable.statuses.noAccount',
  inactive: 'channels.audience.undeliverable.statuses.inactive',
  guardian_inactive: 'channels.audience.undeliverable.statuses.guardianInactive',
  undeliverable: 'channels.audience.undeliverable.statuses.undeliverable',
};

const KNOWN_STATUSES = new Set<string>(Object.keys(ACCOUNT_STATUS_KEYS));

function asId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

function asName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStudent(raw: unknown): UndeliverableGuardianStudent | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const id = asId(row.id);
  const name = asName(row.name);
  if (id == null || !name) return null;

  const classRaw = row.class;
  let classId: number | null = null;
  let className = '';
  if (classRaw != null && typeof classRaw === 'object' && !Array.isArray(classRaw)) {
    const cls = classRaw as Record<string, unknown>;
    classId = asId(cls.id);
    className = asName(cls.name);
  }
  if (classId == null) return null;

  return {
    id,
    name,
    class: { id: classId, name: className || String(classId) },
  };
}

/** Normalize one backend row; strip unknown PII fields by allowlist reconstruction. */
export function normalizeUndeliverableGuardianRow(
  raw: unknown,
): UndeliverableGuardianRow | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;

  const guardianRaw = row.guardian;
  if (guardianRaw == null || typeof guardianRaw !== 'object' || Array.isArray(guardianRaw)) {
    return null;
  }
  const guardianObj = guardianRaw as Record<string, unknown>;
  const guardianId = asId(guardianObj.id);
  const guardianName = asName(guardianObj.name);
  if (guardianId == null || !guardianName) return null;

  const students: UndeliverableGuardianStudent[] = [];
  if (Array.isArray(row.students)) {
    for (const item of row.students) {
      const student = normalizeStudent(item);
      if (student) students.push(student);
    }
  }

  const accountStatusRaw =
    typeof row.account_status === 'string' ? row.account_status.trim() : '';
  const account_status = (
    KNOWN_STATUSES.has(accountStatusRaw) ? accountStatusRaw : 'undeliverable'
  ) as UndeliverableGuardianAccountStatus;

  const reason_code =
    typeof row.reason_code === 'string' && row.reason_code.trim()
      ? row.reason_code.trim()
      : account_status;

  return {
    guardian: { id: guardianId, name: guardianName },
    students,
    reason_code,
    account_status,
  };
}

export function normalizeUndeliverableGuardianRows(
  raw: unknown,
): UndeliverableGuardianRow[] {
  if (!Array.isArray(raw)) return [];
  const out: UndeliverableGuardianRow[] = [];
  for (const item of raw) {
    const row = normalizeUndeliverableGuardianRow(item);
    if (row) out.push(row);
  }
  return out;
}

export function undeliverableAccountStatusKey(
  status: UndeliverableGuardianAccountStatus | string | null | undefined,
): string {
  if (status && status in ACCOUNT_STATUS_KEYS) {
    return ACCOUNT_STATUS_KEYS[status as UndeliverableGuardianAccountStatus];
  }
  return ACCOUNT_STATUS_KEYS.undeliverable;
}

export function undeliverableGuardiansErrorKey(
  error: Pick<ApiErrorBody, 'code' | 'details'> | null | undefined,
): string {
  if (!error) return 'channels.audience.undeliverable.errors.loadFailed';
  const status =
    error.details && typeof error.details.status === 'number'
      ? error.details.status
      : undefined;
  if (
    error.code === 'forbidden' ||
    error.code === 'permission_denied' ||
    status === 403
  ) {
    return 'channels.audience.undeliverable.errors.forbidden';
  }
  if (error.code === 'not_found' || status === 404) {
    return 'channels.audience.undeliverable.errors.notFound';
  }
  if (error.code === 'validation_error' || status === 422) {
    return 'channels.audience.undeliverable.errors.unsupported';
  }
  return 'channels.audience.undeliverable.errors.loadFailed';
}

/** True when list meta indicates another page may exist. */
export function undeliverableHasMore(
  loadedCount: number,
  meta: { pagination?: { page?: number; page_size?: number; total?: number; total_pages?: number } } | null | undefined,
): boolean {
  const pagination = meta?.pagination;
  if (!pagination) return false;
  if (
    typeof pagination.total === 'number' &&
    Number.isFinite(pagination.total) &&
    loadedCount < pagination.total
  ) {
    return true;
  }
  if (
    typeof pagination.page === 'number' &&
    typeof pagination.total_pages === 'number' &&
    pagination.page < pagination.total_pages
  ) {
    return true;
  }
  return false;
}
