/**
 * Acceptance + registration tab presentation modes (Odoo 18.0.1.0.185).
 */

import type { AdmissionDetail } from '@/types/admission';
import {
  partitionRegistrationRequirements,
  resolveOfferRequired,
  resolveOfferStateV185,
  resolveRegistrationReadiness,
  type AdmissionRegistrationRequirement,
} from './admission-assessment-workflow-contract';
import { normalizeAdmissionDecision } from './normalize-admission-decision';
import { resolveIsSchoolRejected } from './admission-status-display';
import { resolveAdmissionStudentId } from './admission-registration';

export type AcceptanceRegistrationMode =
  | 'before_decision'
  | 'rejected'
  | 'accepted_no_offer'
  | 'offer_required_not_created'
  | 'offer_draft'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_declined'
  | 'offer_expired'
  | 'offer_withdrawn'
  | 'legacy_fallback';

export function resolveAcceptanceRegistrationMode(
  detail: AdmissionDetail,
): AcceptanceRegistrationMode {
  const decision = normalizeAdmissionDecision(detail)?.decision ?? null;
  const rejected = resolveIsSchoolRejected(detail);
  const accepted =
    decision === 'accepted' || decision === 'accepted_with_condition';
  const offerRequired = resolveOfferRequired(detail);
  const offer = resolveOfferStateV185(detail);

  if (rejected || decision === 'rejected') return 'rejected';
  if (!accepted && !decision) return 'before_decision';
  if (!accepted) return 'before_decision';

  if (offerRequired === false || offer === 'not_applicable') {
    return 'accepted_no_offer';
  }

  if (offer === 'draft') return 'offer_draft';
  if (offer === 'sent' || offer === 'pending') return 'offer_sent';
  if (offer === 'accepted') return 'offer_accepted';
  if (offer === 'declined' || offer === 'rejected') return 'offer_declined';
  if (offer === 'expired') return 'offer_expired';
  if (offer === 'withdrawn' || offer === 'cancelled') return 'offer_withdrawn';
  if (offer === 'not_created' || !offer) return 'offer_required_not_created';

  return 'legacy_fallback';
}

export function shouldShowOffersList(mode: AcceptanceRegistrationMode): boolean {
  return (
    mode === 'offer_draft' ||
    mode === 'offer_sent' ||
    mode === 'offer_accepted' ||
    mode === 'offer_declined' ||
    mode === 'offer_expired' ||
    mode === 'offer_withdrawn' ||
    mode === 'legacy_fallback'
  );
}

export function shouldShowRegistrationSection(
  mode: AcceptanceRegistrationMode,
): boolean {
  return mode !== 'before_decision' && mode !== 'rejected';
}

export function resolveRegistrationSectionState(detail: AdmissionDetail): {
  readiness: string | null;
  studentId: number | null;
  blocking: AdmissionRegistrationRequirement[];
  warning: AdmissionRegistrationRequirement[];
  information: AdmissionRegistrationRequirement[];
} {
  const readiness = resolveRegistrationReadiness(detail);
  const partitioned = partitionRegistrationRequirements(
    detail.registration_requirements,
  );
  return {
    readiness,
    studentId: resolveAdmissionStudentId(detail.student_id),
    ...partitioned,
  };
}
