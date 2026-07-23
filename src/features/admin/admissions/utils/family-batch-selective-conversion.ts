import type { FamilyBatchApplicationSummary } from '@/types/admission';
import { isAdmissionLinkedRecord } from './admission-registration';
import { shouldShowConvertToStudentAction } from './admission-modern-actions';
import { resolveApplicationStatus } from './admission-modern-status';
import { resolveRegistrationReadiness } from './admission-assessment-workflow-contract';
import { sortConvertApplicationIds } from './family-batch-selective-conversion-idempotency';

/**
 * Whether modern-contract signals were present on the source (or meaningful on the record).
 * Does not treat a normalized empty `modern_allowed_actions=[]` alone as presence.
 */
export function isFamilyBatchModernContractPresent(
  app: FamilyBatchApplicationSummary,
): boolean {
  if (typeof app.modern_contract_present === 'boolean') {
    return app.modern_contract_present;
  }
  if (typeof app.application_status === 'string' && app.application_status.trim()) {
    return true;
  }
  if (app.primary_next_action != null && app.primary_next_action !== '') {
    return true;
  }
  if (Array.isArray(app.modern_allowed_actions) && app.modern_allowed_actions.length > 0) {
    return true;
  }
  return false;
}

export type FamilyBatchConvertEligibilityReason =
  | 'eligible'
  | 'already_registered'
  | 'ineligible'
  | 'not_ready'
  | 'converting';

export type FamilyBatchConvertEligibility = {
  selectable: boolean;
  reason: FamilyBatchConvertEligibilityReason;
  /** Safe display hint already returned by Backend (never invent PII). */
  detailMessage?: string | null;
};

function explicitConversionFlag(
  app: FamilyBatchApplicationSummary,
): boolean | null {
  if (typeof app.conversion_eligible === 'boolean') return app.conversion_eligible;
  return null;
}

function ineligibleDetail(app: FamilyBatchApplicationSummary): string | null {
  const raw =
    app.conversion_ineligible_reason ??
    app.conversion_blocker ??
    null;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

/**
 * Client-side selection eligibility for selective family conversion.
 * Backend remains the final authority on mutation.
 */
export function resolveFamilyBatchConvertEligibility(
  app: FamilyBatchApplicationSummary,
  opts?: { convertingIds?: ReadonlySet<number> },
): FamilyBatchConvertEligibility {
  if (opts?.convertingIds?.has(app.id)) {
    return { selectable: false, reason: 'converting' };
  }

  if (
    isAdmissionLinkedRecord(app) ||
    resolveApplicationStatus(app) === 'registered' ||
    app.registration_status === 'registered' ||
    resolveRegistrationReadiness(app) === 'registered'
  ) {
    return { selectable: false, reason: 'already_registered' };
  }

  const explicit = explicitConversionFlag(app);
  if (explicit === false) {
    return {
      selectable: false,
      reason: 'ineligible',
      detailMessage: ineligibleDetail(app),
    };
  }

  if (
    shouldShowConvertToStudentAction({
      application_status: resolveApplicationStatus(app) ?? app.application_status,
      modern_allowed_actions: app.modern_allowed_actions,
      primary_next_action: app.primary_next_action ?? app.next_action,
      student_id: app.student_id,
    })
  ) {
    return { selectable: true, reason: 'eligible' };
  }

  if (explicit === true) {
    return { selectable: true, reason: 'eligible' };
  }

  // Legacy/readiness fallback only when modern-contract fields were absent from source.
  // Explicit empty modern_allowed_actions (modern_contract_present=true) must not fall back.
  if (
    !isFamilyBatchModernContractPresent(app) &&
    resolveRegistrationReadiness(app) === 'ready'
  ) {
    return { selectable: true, reason: 'eligible' };
  }

  if (resolveRegistrationReadiness(app) === 'ready') {
    // Ready with modern contract present, but convert_to_student not allowed → not selectable.
    return {
      selectable: false,
      reason: 'ineligible',
      detailMessage: ineligibleDetail(app),
    };
  }

  return {
    selectable: false,
    reason: 'not_ready',
    detailMessage: ineligibleDetail(app),
  };
}

export function listEligibleFamilyBatchApplicationIds(
  applications: FamilyBatchApplicationSummary[],
  opts?: { convertingIds?: ReadonlySet<number> },
): number[] {
  return sortConvertApplicationIds(
    applications
      .filter((app) => resolveFamilyBatchConvertEligibility(app, opts).selectable)
      .map((app) => app.id),
  );
}

export function canShowFamilyBatchSelectiveConversion(
  applications: FamilyBatchApplicationSummary[],
): boolean {
  return applications.some(
    (app) => resolveFamilyBatchConvertEligibility(app).selectable,
  );
}

/** Validate and canonicalize the convert request body (client + BFF shared). */
export function parseFamilyBatchConvertRequestBody(raw: unknown):
  | {
      ok: true;
      payload: { idempotency_key: string; application_ids: number[] };
    }
  | { ok: false; code: string; message: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Request body must be a JSON object.',
    };
  }
  const record = raw as Record<string, unknown>;
  const key =
    typeof record.idempotency_key === 'string' ? record.idempotency_key.trim() : '';
  if (!key) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'idempotency_key is required.',
    };
  }

  if (!Array.isArray(record.application_ids)) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'application_ids must be a non-empty array.',
    };
  }

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const item of record.application_ids) {
    const n = typeof item === 'number' ? item : Number(item);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      return {
        ok: false,
        code: 'validation_error',
        message: 'application_ids must contain positive integers.',
      };
    }
    if (seen.has(n)) {
      return {
        ok: false,
        code: 'validation_error',
        message: 'application_ids must not contain duplicates.',
      };
    }
    seen.add(n);
    ids.push(n);
  }

  if (ids.length === 0) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'application_ids must be a non-empty array.',
    };
  }

  // Reject unexpected top-level keys that look like PII / tenant spoofing.
  const allowed = new Set(['idempotency_key', 'application_ids']);
  for (const keyName of Object.keys(record)) {
    if (!allowed.has(keyName)) {
      return {
        ok: false,
        code: 'validation_error',
        message: 'Unexpected fields in convert request body.',
      };
    }
  }

  return {
    ok: true,
    payload: {
      idempotency_key: key,
      application_ids: sortConvertApplicationIds(ids),
    },
  };
}
