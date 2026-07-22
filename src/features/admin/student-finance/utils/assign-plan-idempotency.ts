import type { ApiResponse } from '@/types/api';
import type { StudentFinanceAssignPlanBody } from '@/types/student-finance-assign-plan';

const KEY_MAX_LENGTH = 128;
const KEY_CHAR_PATTERN = /^[A-Za-z0-9._:-]+$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Safe UUID fragment; never includes PII. */
function createUuidFragment(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Test / legacy fallback — alphanumeric only (allowed charset).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Builds `assign-plan-<studentId>-<uuid>` within Odoo charset/length limits.
 * studentId is numeric only — never name/phone/email.
 */
export function createAssignPlanIdempotencyKey(studentId: number | string): string {
  const numericId = String(studentId).replace(/[^0-9]/g, '') || '0';
  const key = `assign-plan-${numericId}-${createUuidFragment()}`;
  return key.length <= KEY_MAX_LENGTH ? key : key.slice(0, KEY_MAX_LENGTH);
}

export function isValidAssignPlanIdempotencyKey(key: string): boolean {
  if (!key || key.length > KEY_MAX_LENGTH) return false;
  return KEY_CHAR_PATTERN.test(key);
}

function sortedNumbers(values: number[] | undefined): number[] {
  return [...(values ?? [])]
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

function normalizeJsonValue(value: unknown): unknown {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      out[key] = normalizeJsonValue(record[key]);
    }
    return out;
  }
  return value;
}

/**
 * Lightweight client fingerprint to detect material payload changes.
 * Not claimed to match Odoo canonical hash byte-for-byte; never sent as payload_hash.
 */
export function buildAssignPlanAttemptFingerprint(
  studentId: number | string,
  body: StudentFinanceAssignPlanBody,
): string {
  const customize = body.customize_plan === true;
  const identity = {
    student_id: Number(studentId),
    academic_year_id:
      body.academic_year_id != null && Number.isFinite(Number(body.academic_year_id))
        ? Number(body.academic_year_id)
        : null,
    fee_plan_id: Number(body.fee_plan_id),
    activation_mode: body.activation_mode,
    customize_plan: customize,
    customization_reason: customize ? (body.customization_reason ?? null) : null,
    selected_optional_line_ids: sortedNumbers(body.selected_optional_line_ids),
    discounts: customize ? normalizeJsonValue(body.discounts ?? []) : [],
    one_time_lines: customize ? normalizeJsonValue(body.one_time_lines ?? []) : [],
    periods: customize ? normalizeJsonValue(body.periods ?? []) : [],
  };
  return JSON.stringify(identity);
}

export function withAssignPlanIdempotencyKey(
  body: StudentFinanceAssignPlanBody,
  idempotencyKey: string,
): StudentFinanceAssignPlanBody {
  return { ...body, idempotency_key: idempotencyKey };
}

/** Holds one logical attempt key until success, conflict, or intentional reset. */
export class AssignPlanIdempotencySession {
  private key: string | null = null;
  private fingerprint: string | null = null;
  private studentId: string | null = null;

  ensureKey(studentId: number | string, fingerprint: string): string {
    const sid = String(studentId);
    if (this.key && this.fingerprint === fingerprint && this.studentId === sid) {
      return this.key;
    }
    this.studentId = sid;
    this.fingerprint = fingerprint;
    this.key = createAssignPlanIdempotencyKey(studentId);
    return this.key;
  }

  currentKey(): string | null {
    return this.key;
  }

  currentFingerprint(): string | null {
    return this.fingerprint;
  }

  reset(): void {
    this.key = null;
    this.fingerprint = null;
    this.studentId = null;
  }
}

/** Per-child sessions for family registration (scoped by localId + studentId). */
export class AssignPlanIdempotencyRegistry {
  private sessions = new Map<string, AssignPlanIdempotencySession>();

  private scope(studentId: number | string, localId?: string): string {
    return localId ? `${localId}:${studentId}` : String(studentId);
  }

  ensureKey(studentId: number | string, fingerprint: string, localId?: string): string {
    const scope = this.scope(studentId, localId);
    let session = this.sessions.get(scope);
    if (!session) {
      session = new AssignPlanIdempotencySession();
      this.sessions.set(scope, session);
    }
    return session.ensureKey(studentId, fingerprint);
  }

  currentKey(studentId: number | string, localId?: string): string | null {
    return this.sessions.get(this.scope(studentId, localId))?.currentKey() ?? null;
  }

  clear(studentId: number | string, localId?: string): void {
    const scope = this.scope(studentId, localId);
    this.sessions.get(scope)?.reset();
    this.sessions.delete(scope);
  }
}

export type AssignPlanIdempotencyOutcome =
  | { kind: 'first_success'; idempotentReplay: false }
  | { kind: 'replay'; idempotentReplay: true }
  | { kind: 'payload_conflict' }
  | { kind: 'in_progress' }
  | { kind: 'invalid_key' }
  | { kind: 'key_mismatch' }
  | { kind: 'other' };

export function readIdempotentReplayFlag(data: unknown): boolean | undefined {
  const record = asRecord(data);
  if (!record || !('idempotent_replay' in record)) return undefined;
  return record.idempotent_replay === true;
}

/**
 * Classifies assign-plan responses for key lifecycle.
 * Missing `idempotent_replay` on success is treated as first/legacy success (pre-2F3).
 */
export function classifyAssignPlanIdempotencyOutcome(
  res: ApiResponse<unknown>,
): AssignPlanIdempotencyOutcome {
  if (res.success) {
    if (readIdempotentReplayFlag(res.data) === true) {
      return { kind: 'replay', idempotentReplay: true };
    }
    return { kind: 'first_success', idempotentReplay: false };
  }
  switch (String(res.error?.code ?? '')) {
    case 'assign_plan_idempotency_conflict':
      return { kind: 'payload_conflict' };
    case 'assign_plan_idempotency_in_progress':
      return { kind: 'in_progress' };
    case 'assign_plan_idempotency_key_invalid':
      return { kind: 'invalid_key' };
    case 'assign_plan_idempotency_key_mismatch':
      return { kind: 'key_mismatch' };
    default:
      return { kind: 'other' };
  }
}

export function shouldClearAssignPlanIdempotencyKey(
  outcome: AssignPlanIdempotencyOutcome,
): boolean {
  return (
    outcome.kind === 'first_success' ||
    outcome.kind === 'replay' ||
    outcome.kind === 'payload_conflict' ||
    outcome.kind === 'invalid_key' ||
    outcome.kind === 'key_mismatch'
  );
}

/** Keep the same key for in-progress and transport ambiguity retries. */
export function shouldPreserveAssignPlanIdempotencyKey(
  outcome: AssignPlanIdempotencyOutcome,
): boolean {
  return outcome.kind === 'in_progress';
}

export function isAssignPlanIdempotencyContractError(code: string | undefined): boolean {
  return (
    code === 'assign_plan_idempotency_conflict' ||
    code === 'assign_plan_idempotency_in_progress' ||
    code === 'assign_plan_idempotency_key_invalid' ||
    code === 'assign_plan_idempotency_key_mismatch'
  );
}

export function assignPlanIdempotencyErrorMessageKey(
  code: string | undefined,
): string | null {
  switch (code) {
    case 'assign_plan_idempotency_conflict':
      return 'admin.finance.assignErrors.idempotencyConflict';
    case 'assign_plan_idempotency_in_progress':
      return 'admin.finance.assignErrors.idempotencyInProgress';
    case 'assign_plan_idempotency_key_invalid':
      return 'admin.finance.assignErrors.idempotencyKeyInvalid';
    case 'assign_plan_idempotency_key_mismatch':
      return 'admin.finance.assignErrors.idempotencyKeyMismatch';
    default:
      return null;
  }
}
