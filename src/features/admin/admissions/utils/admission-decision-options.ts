import type { DecisionType } from '@/types/admission';

/**
 * Creatable school decisions — positive path is `accepted` only.
 * Legacy `accepted_with_condition` remains readable but is not offered.
 */
export const ADMISSION_DECISION_OPTIONS = [
  'accepted',
  'waitlisted',
  'needs_reassessment',
  'rejected',
] as const satisfies readonly DecisionType[];

export type AdmissionDecisionOption = (typeof ADMISSION_DECISION_OPTIONS)[number];

/** Historical decision values that still mean “school accepted”. */
const LEGACY_ACCEPTED_DECISIONS = new Set(['accepted', 'accepted_with_condition']);

export function getAdmissionDecisionOptions(): readonly AdmissionDecisionOption[] {
  return ADMISSION_DECISION_OPTIONS;
}

export function isAdmissionDecisionOption(value: string | null | undefined): value is AdmissionDecisionOption {
  return ADMISSION_DECISION_OPTIONS.includes(String(value ?? '') as AdmissionDecisionOption);
}

/** True for creatable `accepted` and legacy `accepted_with_condition`. */
export function isAcceptedSchoolDecision(value: string | null | undefined): boolean {
  return LEGACY_ACCEPTED_DECISIONS.has(String(value ?? ''));
}

export function admissionDecisionLabelKey(
  decision: AdmissionDecisionOption | 'accepted_with_condition' | string,
): string {
  if (decision === 'rejected') return 'admin.admissions.schoolDecision.rejected';
  if (decision === 'accepted_with_condition') {
    // Legacy records: show as plain accepted (option removed from UI).
    return 'admin.admissions.decisions.accepted';
  }
  return `admin.admissions.decisions.${decision}`;
}

/** Conditions field is no longer required for any creatable decision. */
export function decisionRequiresConditions(_decision: string | null | undefined): boolean {
  return false;
}

export function decisionRequiresRejectionReason(decision: string | null | undefined): boolean {
  return decision === 'rejected';
}

/**
 * Staff can mark ready when school accepted and application is not yet confirmed/registered,
 * and any required offer path is already cleared (not required / accepted / n/a).
 */
export function canMarkReadyForRegistration(record: {
  state?: string | null;
  decision?: string | null;
  student_id?: number | false | null;
  registration_readiness?: string | null;
  registration_status?: string | null;
  registration_flow_state?: string | null;
  offer_required?: boolean | null;
  offer_state?: string | null;
  offer_summary?: { offer_required?: boolean | null; required?: boolean | null; offer_state?: string | null; state?: string | null } | null;
}): boolean {
  const state = String(record.state ?? '');
  if (state === 'confirmed' || state === 'lost' || state === 'cancelled' || state === 'duplicate') {
    return false;
  }
  if (record.registration_readiness === 'registered') return false;
  if (record.registration_status === 'registered') return false;
  if (typeof record.student_id === 'number' && record.student_id > 0) return false;
  if (record.registration_flow_state === 'linked') return false;

  const rawOffer: unknown =
    record.offer_state ??
    record.offer_summary?.offer_state ??
    record.offer_summary?.state ??
    null;
  const offerState =
    rawOffer === false || rawOffer == null || rawOffer === ''
      ? ''
      : String(rawOffer);
  const offerRequiredRaw =
    record.offer_required ??
    record.offer_summary?.offer_required ??
    record.offer_summary?.required;
  const offerRequired =
    offerRequiredRaw === true || offerRequiredRaw === false ? offerRequiredRaw : null;

  // Offer workflow still in progress — create / send / accept_offer come first.
  if (
    offerState === 'draft' ||
    offerState === 'sent' ||
    offerState === 'pending' ||
    offerState === 'not_created'
  ) {
    return false;
  }
  if (offerRequired === true && offerState !== 'accepted' && offerState !== 'not_applicable') {
    return false;
  }

  const decision = String(record.decision ?? '');
  if (isAcceptedSchoolDecision(decision)) {
    return state === 'accepted' || state === 'offer_sent' || state === '';
  }
  return state === 'accepted' || state === 'offer_sent';
}
