import type {
  AdmissionDetail,
  AdmissionListItem,
  FamilyBatchApplicationSummary,
  FamilyBatchDetail,
} from '@/types/admission';
import { normalizeAdmissionAllowedActions } from './admission-allowed-actions';
import {
  normalizeStatusWarnings,
  resolveIsSchoolRejected,
  resolveRegistrationStatus,
} from './admission-status-display';
import { normalizeAdmissionDecision } from './normalize-admission-decision';
import { resolveAdmissionStudentId } from './admission-registration';

function cleanOptionalText(value: unknown): string | null {
  if (value === false || value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function cleanOfferState(value: unknown): string | null {
  return cleanOptionalText(value);
}

/** Shared outcome field normalization for list/detail/family child payloads. */
export function normalizeAdmissionOutcomeFields<T extends Record<string, unknown>>(
  raw: T,
): T & {
  decision: ReturnType<typeof normalizeAdmissionDecision>;
  registration_status: string;
  is_school_rejected: boolean;
  status_warnings: string[];
  offer_state: string | null;
  converted_at: string | null;
} {
  const decision = normalizeAdmissionDecision(raw);
  const status_warnings = normalizeStatusWarnings(raw.status_warnings);
  const is_school_rejected =
    raw.is_school_rejected === true ||
    resolveIsSchoolRejected({
      ...raw,
      decision: decision ?? (raw.decision as never),
      rejection: raw.rejection as { is_rejected?: boolean } | null,
    });

  const registration = resolveRegistrationStatus({
    ...raw,
    decision: decision ?? (raw.decision as never),
    is_school_rejected,
    rejection: raw.rejection as { is_rejected?: boolean } | null,
  });

  return {
    ...raw,
    decision,
    decision_date: decision?.decision_date ?? cleanOptionalText(raw.decision_date),
    decision_notes: decision?.decision_notes ?? cleanOptionalText(raw.decision_notes),
    decision_user: decision?.decision_user ?? (raw.decision_user === false ? null : raw.decision_user),
    registration_status: registration.status,
    is_school_rejected,
    status_warnings,
    offer_state: cleanOfferState(raw.offer_state),
    converted_at: cleanOptionalText(raw.converted_at),
    student_id:
      resolveAdmissionStudentId(raw.student_id) ??
      (raw.student_id === false ? false : raw.student_id),
  };
}

export function normalizeAdmissionListItem(item: AdmissionListItem): AdmissionListItem {
  const normalized = normalizeAdmissionOutcomeFields(
    item as AdmissionListItem & Record<string, unknown>,
  );
  return {
    ...item,
    ...normalized,
    decision: normalized.decision,
    registration_status: normalized.registration_status as AdmissionListItem['registration_status'],
    is_school_rejected: normalized.is_school_rejected,
    status_warnings: normalized.status_warnings,
    offer_state: normalized.offer_state,
    converted_at: normalized.converted_at,
  };
}

export function normalizeAdmissionListItems(items: AdmissionListItem[]): AdmissionListItem[] {
  return items.map(normalizeAdmissionListItem);
}

/** Full detail normalize: decision flattening + allowed_actions map. */
export function normalizeAdmissionDetail(detail: AdmissionDetail): AdmissionDetail {
  const normalized = normalizeAdmissionOutcomeFields(
    detail as AdmissionDetail & Record<string, unknown>,
  );
  return {
    ...detail,
    ...normalized,
    decision: normalized.decision,
    registration_status: normalized.registration_status as AdmissionDetail['registration_status'],
    is_school_rejected: normalized.is_school_rejected,
    status_warnings: normalized.status_warnings,
    offer_state: normalized.offer_state,
    converted_at: normalized.converted_at,
    allowed_actions: normalizeAdmissionAllowedActions(
      detail.allowed_actions as Parameters<typeof normalizeAdmissionAllowedActions>[0],
    ),
  };
}

export function normalizeFamilyBatchApplication(
  app: FamilyBatchApplicationSummary,
): FamilyBatchApplicationSummary {
  const normalized = normalizeAdmissionOutcomeFields(
    app as FamilyBatchApplicationSummary & Record<string, unknown>,
  );
  return {
    ...app,
    ...normalized,
    decision: normalized.decision,
    registration_status:
      normalized.registration_status as FamilyBatchApplicationSummary['registration_status'],
    is_school_rejected: normalized.is_school_rejected,
    status_warnings: normalized.status_warnings,
    offer_state: normalized.offer_state,
    converted_at: normalized.converted_at,
  };
}

export function normalizeFamilyBatchDetail(detail: FamilyBatchDetail): FamilyBatchDetail {
  return {
    ...detail,
    applications: (detail.applications ?? []).map(normalizeFamilyBatchApplication),
  };
}
