/**
 * Privacy-safe presentation helpers for undeliverable guardians (Odoo 255/256).
 * Never surface phone / email / login / user_id.
 * Live contract: rows live under `data.rows`; meta is flat `{ page, page_size, total }`.
 */

import type { ApiErrorBody } from '@/types/api';
import type {
  UndeliverableGuardianAccountStatus,
  UndeliverableGuardianRow,
  UndeliverableGuardianStudent,
  UndeliverableGuardiansConsistency,
  UndeliverableGuardiansPayload,
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

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));
  }
  return null;
}

function normalizeConsistency(raw: unknown): UndeliverableGuardiansConsistency | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  return {
    excluded_count: asNonNegativeInt(row.excluded_count),
    undeliverable_guardian_line_count: asNonNegativeInt(
      row.undeliverable_guardian_line_count,
    ),
    undeliverable_guardian_count: asNonNegativeInt(row.undeliverable_guardian_count),
    delivery_state:
      typeof row.delivery_state === 'string' ? row.delivery_state : null,
    resolution_source:
      typeof row.resolution_source === 'string' ? row.resolution_source : null,
  };
}

/**
 * Normalize Odoo 255/256 payload object.
 * Always reads rows from `data.rows` — never treats the payload itself as a row array.
 */
export function normalizeUndeliverableGuardiansPayload(raw: unknown): {
  rows: UndeliverableGuardianRow[];
  total: number | null;
  consistency: UndeliverableGuardiansConsistency | null;
  channel_id: number | null;
  channel_type: string | null;
  school_id: number | null;
} {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      rows: [],
      total: null,
      consistency: null,
      channel_id: null,
      channel_type: null,
      school_id: null,
    };
  }
  const data = raw as Record<string, unknown>;
  return {
    rows: normalizeUndeliverableGuardianRows(data.rows),
    total: asNonNegativeInt(data.total),
    consistency: normalizeConsistency(data.consistency),
    channel_id: asId(data.channel_id),
    channel_type: typeof data.channel_type === 'string' ? data.channel_type : null,
    school_id: asId(data.school_id),
  };
}

/** Extract privacy-safe rows from a typed or unknown success payload. */
export function undeliverableRowsFromPayload(
  data: UndeliverableGuardiansPayload | unknown | null | undefined,
): UndeliverableGuardianRow[] {
  return normalizeUndeliverableGuardiansPayload(data).rows;
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

type UndeliverableListMeta = {
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
  pagination?: {
    page?: number;
    page_size?: number;
    total?: number;
    total_pages?: number;
  };
} | null | undefined;

/**
 * True when another page may exist.
 * Canonical Runtime 256: flat `meta.page` / `meta.page_size` / `meta.total`.
 * Nested `meta.pagination` remains compatible when present.
 */
export function undeliverableHasMore(
  loadedCount: number,
  meta: UndeliverableListMeta,
): boolean {
  if (!meta) return false;
  const nested = meta.pagination;

  const total =
    typeof nested?.total === 'number' && Number.isFinite(nested.total)
      ? nested.total
      : typeof meta.total === 'number' && Number.isFinite(meta.total)
        ? meta.total
        : null;
  if (total != null) {
    return loadedCount < total;
  }

  const page =
    typeof nested?.page === 'number' && Number.isFinite(nested.page)
      ? nested.page
      : typeof meta.page === 'number' && Number.isFinite(meta.page)
        ? meta.page
        : null;
  const totalPages =
    typeof nested?.total_pages === 'number' && Number.isFinite(nested.total_pages)
      ? nested.total_pages
      : typeof meta.total_pages === 'number' && Number.isFinite(meta.total_pages)
        ? meta.total_pages
        : null;
  if (page != null && totalPages != null) {
    return page < totalPages;
  }
  return false;
}
