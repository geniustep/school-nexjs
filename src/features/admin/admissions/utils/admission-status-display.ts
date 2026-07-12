import type {
  AdmissionDecision,
  AdmissionListItem,
  AdmissionOfferState,
  AdmissionRegistrationStatus,
  AdmissionStatusWarningCode,
} from '@/types/admission';
import { resolveAdmissionStudentId } from './admission-registration';
import { normalizeAdmissionDecision } from './normalize-admission-decision';
import {
  resolveAdmissionUiStage,
  type AdmissionUiStage,
  type AdmissionUiStageSource,
} from './admission-ui-stage';

/** Server-side outcome filters — never PATCH state. */
export type AdmissionOutcomeFilter =
  | ''
  | 'awaiting_registration'
  | 'registered'
  | 'school_rejected'
  | 'family_declined'
  | 'expired_offer';

export type AdmissionPrimaryDisplayKind =
  | 'registered'
  | 'school_rejected'
  | 'awaiting_registration'
  | 'ui_stage';

export interface AdmissionPrimaryDisplay {
  kind: AdmissionPrimaryDisplayKind;
  /** i18n key under admin.admissions.* */
  labelKey: string;
  tone: 'green' | 'red' | 'amber' | 'blue' | 'slate';
  uiStage?: AdmissionUiStage;
  usedLegacyFallback?: boolean;
}

export interface AdmissionStatusBadge {
  key: string;
  labelKey: string;
  tone: 'green' | 'red' | 'amber' | 'blue' | 'slate';
  priority: number;
}

export type AdmissionStatusFields = {
  state?: string | null;
  student_id?: number | false | null;
  registration_flow_state?: string | null;
  decision?: AdmissionDecision | string | false | null;
  decision_date?: string | false | null;
  decision_notes?: string | false | null;
  decision_user?: AdmissionDecision['decision_user'] | false | null;
  conditions?: string | false | null;
  registration_status?: AdmissionRegistrationStatus | null;
  is_school_rejected?: boolean | null;
  offer_state?: AdmissionOfferState | false | null;
  status_warnings?: AdmissionStatusWarningCode[] | null;
  rejection?: { is_rejected?: boolean } | null;
};

function cleanOfferState(value: unknown): string | null {
  if (value === false || value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function resolveOfferStateValue(record: AdmissionStatusFields): string | null {
  return cleanOfferState(record.offer_state);
}

export function resolveIsSchoolRejected(record: AdmissionStatusFields): boolean {
  if (record.is_school_rejected === true) return true;
  if (record.rejection?.is_rejected === true) return true;
  const decision = normalizeAdmissionDecision(record)?.decision;
  return decision === 'rejected';
}

/**
 * Prefer backend registration_status; limited fallback for older payloads only.
 */
export function resolveRegistrationStatus(
  record: AdmissionStatusFields,
): { status: AdmissionRegistrationStatus; usedLegacyFallback: boolean } {
  const backend = record.registration_status;
  if (
    backend === 'awaiting_registration' ||
    backend === 'registered' ||
    backend === 'not_applicable'
  ) {
    return { status: backend, usedLegacyFallback: false };
  }

  if (resolveAdmissionStudentId(record.student_id) != null) {
    return { status: 'registered', usedLegacyFallback: true };
  }
  if (record.registration_flow_state === 'linked') {
    return { status: 'registered', usedLegacyFallback: true };
  }

  if (resolveIsSchoolRejected(record)) {
    return { status: 'not_applicable', usedLegacyFallback: true };
  }

  const decision = normalizeAdmissionDecision(record)?.decision;
  if (decision === 'accepted' || decision === 'accepted_with_condition') {
    return { status: 'awaiting_registration', usedLegacyFallback: true };
  }

  const state = String(record.state ?? '');
  if ((state === 'accepted' || state === 'confirmed' || state === 'offer_sent') &&
      resolveAdmissionStudentId(record.student_id) == null) {
    return { status: 'awaiting_registration', usedLegacyFallback: true };
  }

  return { status: 'not_applicable', usedLegacyFallback: true };
}

export function resolveAdmissionPrimaryDisplay(
  record: AdmissionStatusFields & AdmissionUiStageSource,
): AdmissionPrimaryDisplay {
  const { status, usedLegacyFallback } = resolveRegistrationStatus(record);

  if (status === 'registered') {
    return {
      kind: 'registered',
      labelKey: 'admin.admissions.registrationStatus.registered',
      tone: 'green',
      usedLegacyFallback,
    };
  }

  if (resolveIsSchoolRejected(record)) {
    return {
      kind: 'school_rejected',
      labelKey: 'admin.admissions.schoolDecision.rejected',
      tone: 'red',
      usedLegacyFallback,
    };
  }

  if (status === 'awaiting_registration') {
    return {
      kind: 'awaiting_registration',
      labelKey: 'admin.admissions.registrationStatus.awaiting_registration',
      tone: 'amber',
      usedLegacyFallback,
    };
  }

  const uiStage = resolveAdmissionUiStage(record);
  return {
    kind: 'ui_stage',
    labelKey: `admin.admissions.uiStages.${uiStage}`,
    tone:
      uiStage === 'closed'
        ? 'red'
        : uiStage === 'accepted' || uiStage === 'ready_for_registration'
          ? 'green'
          : uiStage === 'in_evaluation'
            ? 'amber'
            : uiStage === 'in_follow_up'
              ? 'blue'
              : 'slate',
    uiStage,
    usedLegacyFallback,
  };
}

/** Priority: registration/rejection → school decision → offer (when functionally distinct). */
export function resolveAdmissionStatusBadges(
  record: AdmissionStatusFields & AdmissionUiStageSource,
): AdmissionStatusBadge[] {
  const badges: AdmissionStatusBadge[] = [];
  const primary = resolveAdmissionPrimaryDisplay(record);
  const decision = normalizeAdmissionDecision(record)?.decision ?? null;
  const offer = resolveOfferStateValue(record);

  badges.push({
    key: `primary:${primary.kind}`,
    labelKey: primary.labelKey,
    tone: primary.tone,
    priority: 1,
  });

  if (primary.kind !== 'school_rejected' && decision === 'accepted') {
    badges.push({
      key: 'decision:accepted',
      labelKey: 'admin.admissions.schoolDecision.accepted',
      tone: 'green',
      priority: 2,
    });
  } else if (primary.kind !== 'school_rejected' && decision === 'accepted_with_condition') {
    badges.push({
      key: 'decision:accepted_with_condition',
      labelKey: 'admin.admissions.schoolDecision.accepted_with_condition',
      tone: 'amber',
      priority: 2,
    });
  }

  if (offer === 'declined') {
    badges.push({
      key: 'offer:declined',
      labelKey: 'admin.admissions.offerStates.familyDeclined',
      tone: 'red',
      priority: 3,
    });
  } else if (offer === 'expired') {
    badges.push({
      key: 'offer:expired',
      labelKey: 'admin.admissions.offerStates.familyExpired',
      tone: 'amber',
      priority: 3,
    });
  } else if (offer === 'sent' || offer === 'pending') {
    badges.push({
      key: 'offer:sent',
      labelKey: 'admin.admissions.offerStates.sentLabel',
      tone: 'blue',
      priority: 3,
    });
  } else if (offer === 'accepted' && primary.kind !== 'awaiting_registration' && primary.kind !== 'registered') {
    badges.push({
      key: 'offer:accepted',
      labelKey: 'admin.admissions.badges.offerAccepted',
      tone: 'green',
      priority: 3,
    });
  }

  // Avoid stacking decision:accepted when primary already says awaiting (accepted awaiting).
  const filtered =
    primary.kind === 'awaiting_registration'
      ? badges.filter((b) => b.key !== 'decision:accepted' && b.key !== 'decision:accepted_with_condition')
      : badges;

  return filtered
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

export function buildAdmissionOutcomeFilterQuery(
  filter: AdmissionOutcomeFilter,
): Record<string, string | number> {
  switch (filter) {
    case 'awaiting_registration':
      return { registration_status: 'awaiting_registration' };
    case 'registered':
      return { registration_status: 'registered' };
    case 'school_rejected':
      return { decision: 'rejected' };
    case 'family_declined':
      return { offer_state: 'declined' };
    case 'expired_offer':
      return { offer_state: 'expired' };
    default:
      return {};
  }
}

export function admissionOutcomeFilterLabelKey(filter: AdmissionOutcomeFilter): string | null {
  switch (filter) {
    case 'awaiting_registration':
      return 'admin.admissions.registrationStatus.awaiting_registration';
    case 'registered':
      return 'admin.admissions.registrationStatus.registered';
    case 'school_rejected':
      return 'admin.admissions.schoolDecision.rejected';
    case 'family_declined':
      return 'admin.admissions.offerStates.familyDeclined';
    case 'expired_offer':
      return 'admin.admissions.offerStates.familyExpired';
    default:
      return null;
  }
}

export const ADMISSION_STATUS_WARNING_CODES: AdmissionStatusWarningCode[] = [
  'accepted_state_without_decision',
  'student_linked_state_mismatch',
  'registration_linked_without_student',
  'rejected_decision_state_mismatch',
  'accepted_offer_application_state_mismatch',
];

export function normalizeStatusWarnings(
  value: unknown,
): AdmissionStatusWarningCode[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean) as AdmissionStatusWarningCode[];
}

export function statusWarningLabelKey(code: string): string {
  return `admin.admissions.statusWarnings.${code}`;
}

export function hasAdmissionStatusWarnings(record: AdmissionStatusFields): boolean {
  return normalizeStatusWarnings(record.status_warnings).length > 0;
}

/** Client-only summary of mixed sibling outcomes — never sent to backend. */
export function resolveFamilyBatchMixedSummary(
  applications: AdmissionStatusFields[],
): 'uniform' | 'mixed' | 'empty' {
  if (applications.length === 0) return 'empty';
  const keys = applications.map((app) => {
    const primary = resolveAdmissionPrimaryDisplay(app as AdmissionStatusFields & AdmissionUiStageSource);
    return primary.kind === 'ui_stage' ? `ui:${primary.uiStage}` : primary.kind;
  });
  const unique = new Set(keys);
  return unique.size <= 1 ? 'uniform' : 'mixed';
}

export function formatOfferStateLabelKey(offerState: string | null | undefined): string | null {
  if (!offerState) return null;
  if (offerState === 'declined') return 'admin.admissions.offerStates.declined';
  if (offerState === 'expired') return 'admin.admissions.offerStates.expired';
  if (offerState === 'accepted') return 'admin.admissions.offerStates.acceptedFamily';
  if (offerState === 'sent') return 'admin.admissions.offerStates.sentLabel';
  return `admin.admissions.offerStates.${offerState}`;
}

export type { AdmissionListItem };
