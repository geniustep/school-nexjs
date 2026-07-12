/**
 * Four-step admission journey: follow-up → decision → offer → registration.
 */

import {
  resolveIsSchoolRejected,
  resolveOfferStateValue,
  resolveRegistrationStatus,
  type AdmissionStatusFields,
} from './admission-status-display';
import { resolveAdmissionStudentId } from './admission-registration';
import { normalizeAdmissionDecision } from './normalize-admission-decision';
import { isAdmissionManualStage } from './admission-stage-options';

export type AdmissionJourneyStepId =
  | 'follow_up'
  | 'decision'
  | 'offer'
  | 'registration';

export type AdmissionJourneyStepStatus =
  | 'complete'
  | 'current'
  | 'pending'
  | 'not_applicable'
  | 'blocked'
  | 'closed';

export type AdmissionJourneyStep = {
  id: AdmissionJourneyStepId;
  labelKey: string;
  status: AdmissionJourneyStepStatus;
  /** Short status label key (states / decisions / offer / registration). */
  valueLabelKey: string;
};

export type AdmissionJourneyInput = AdmissionStatusFields & {
  state?: string | null;
  student_id?: number | false | null;
  registration_flow_state?: string | null;
};

export function resolveAdmissionJourneySteps(
  input: AdmissionJourneyInput,
): AdmissionJourneyStep[] {
  const state = String(input.state ?? '');
  const decision = normalizeAdmissionDecision(input)?.decision ?? null;
  const offer = resolveOfferStateValue(input);
  const registration = resolveRegistrationStatus(input).status;
  const studentId = resolveAdmissionStudentId(input.student_id);
  const rejected = resolveIsSchoolRejected(input);
  const closed =
    state === 'lost' || state === 'cancelled' || state === 'duplicate';
  const registered = studentId != null || registration === 'registered';
  const accepted =
    decision === 'accepted' || decision === 'accepted_with_condition';
  const postAccept =
    accepted ||
    state === 'accepted' ||
    state === 'offer_sent' ||
    state === 'confirmed' ||
    registered;

  // --- Follow-up ---
  let followStatus: AdmissionJourneyStepStatus;
  let followValue: string;
  if (rejected || closed) {
    followStatus = postAccept || decision ? 'complete' : 'closed';
    followValue = state
      ? `admin.admissions.states.${state}`
      : 'admin.admissions.journey.closed';
  } else if (postAccept || decision === 'waitlisted') {
    followStatus = 'complete';
    followValue = isAdmissionManualStage(state)
      ? `admin.admissions.states.${state}`
      : 'admin.admissions.journey.followUpComplete';
  } else if (isAdmissionManualStage(state) || state === 'under_review') {
    followStatus = 'current';
    followValue = `admin.admissions.states.${state || 'new'}`;
  } else {
    followStatus = 'pending';
    followValue = 'admin.admissions.journey.pending';
  }

  // --- Decision ---
  let decisionStatus: AdmissionJourneyStepStatus;
  let decisionValue: string;
  if (rejected) {
    decisionStatus = 'complete';
    decisionValue = 'admin.admissions.schoolDecision.rejected';
  } else if (accepted) {
    decisionStatus = 'complete';
    decisionValue =
      decision === 'accepted_with_condition'
        ? 'admin.admissions.decisions.accepted_with_condition'
        : 'admin.admissions.decisions.accepted';
  } else if (decision === 'waitlisted' || decision === 'needs_reassessment') {
    decisionStatus = 'current';
    decisionValue = `admin.admissions.decisions.${decision}`;
  } else if (closed) {
    decisionStatus = 'closed';
    decisionValue = 'admin.admissions.journey.closed';
  } else if (!decision) {
    decisionStatus =
      state === 'under_review' || followStatus === 'complete' ? 'current' : 'pending';
    decisionValue = 'admin.admissions.journey.decisionPending';
  } else {
    decisionStatus = 'current';
    decisionValue = `admin.admissions.decisions.${decision}`;
  }

  // --- Offer ---
  let offerStatus: AdmissionJourneyStepStatus;
  let offerValue: string;
  if (rejected) {
    offerStatus = 'not_applicable';
    offerValue = 'admin.admissions.journey.notApplicable';
  } else if (!accepted && !postAccept) {
    offerStatus = 'not_applicable';
    offerValue = 'admin.admissions.journey.notApplicable';
  } else if (offer === 'accepted' || state === 'confirmed' || registered) {
    offerStatus = 'complete';
    offerValue = 'admin.admissions.offerStates.acceptedFamily';
  } else if (offer === 'sent' || offer === 'pending') {
    offerStatus = 'current';
    offerValue = 'admin.admissions.offerStates.sentLabel';
  } else if (offer === 'draft') {
    offerStatus = 'current';
    offerValue = 'admin.admissions.offerStates.draft';
  } else if (offer === 'declined' || offer === 'expired' || offer === 'cancelled') {
    offerStatus = 'closed';
    offerValue =
      offer === 'declined'
        ? 'admin.admissions.offerStates.familyDeclined'
        : offer === 'expired'
          ? 'admin.admissions.offerStates.familyExpired'
          : 'admin.admissions.offerStates.cancelled';
  } else if (accepted) {
    offerStatus = 'pending';
    offerValue = 'admin.admissions.journey.offerPending';
  } else {
    offerStatus = 'not_applicable';
    offerValue = 'admin.admissions.journey.notApplicable';
  }

  // --- Registration ---
  let regStatus: AdmissionJourneyStepStatus;
  let regValue: string;
  if (rejected) {
    regStatus = 'not_applicable';
    regValue = 'admin.admissions.journey.notApplicable';
  } else if (registered) {
    regStatus = 'complete';
    regValue = 'admin.admissions.registrationStatus.registered';
  } else if (state === 'confirmed') {
    regStatus = 'current';
    regValue = 'admin.admissions.registrationStatus.ready_for_registration';
  } else if (registration === 'awaiting_registration' || accepted || offer === 'accepted') {
    // offer accepted alone is awaiting, NOT registered
    regStatus = 'pending';
    regValue = 'admin.admissions.registrationStatus.awaiting_registration';
  } else if (closed) {
    regStatus = 'not_applicable';
    regValue = 'admin.admissions.journey.notApplicable';
  } else {
    regStatus = 'not_applicable';
    regValue = 'admin.admissions.journey.notApplicable';
  }

  return [
    {
      id: 'follow_up',
      labelKey: 'admin.admissions.journey.followUp',
      status: followStatus,
      valueLabelKey: followValue,
    },
    {
      id: 'decision',
      labelKey: 'admin.admissions.journey.decision',
      status: decisionStatus,
      valueLabelKey: decisionValue,
    },
    {
      id: 'offer',
      labelKey: 'admin.admissions.journey.offer',
      status: offerStatus,
      valueLabelKey: offerValue,
    },
    {
      id: 'registration',
      labelKey: 'admin.admissions.journey.registration',
      status: regStatus,
      valueLabelKey: regValue,
    },
  ];
}
