/**
 * Five-step admission journey:
 * follow-up → assessment → decision → acceptance → registration.
 */

import {
  admissionNextActionLabel,
  resolveAssessmentProgress,
  resolveOfferRequired,
  resolveOfferStateV185,
  resolveProcessingStage,
  resolveRegistrationReadiness,
  type AdmissionNextAction,
} from './admission-assessment-workflow-contract';
import {
  resolveIsSchoolRejected,
  type AdmissionStatusFields,
} from './admission-status-display';
import { resolveAdmissionStudentId } from './admission-registration';
import { normalizeAdmissionDecision } from './normalize-admission-decision';

export type AdmissionJourneyStepId =
  | 'follow_up'
  | 'assessment'
  | 'decision'
  | 'acceptance'
  | 'registration';

/** @deprecated Use `acceptance` — kept for older callers. */
export type AdmissionJourneyLegacyStepId = 'offer';

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
  processing_stage?: string | null;
  assessment_progress?: string | null;
  assessment_summary?: { progress?: string | null } | null;
  offer_required?: boolean | null;
  offer_summary?: Record<string, unknown> | null;
  registration_readiness?: string | null;
  next_action?: AdmissionNextAction;
};

export function resolveAdmissionJourneySteps(
  input: AdmissionJourneyInput,
): AdmissionJourneyStep[] {
  const processing = resolveProcessingStage(input);
  const assessmentProgress = resolveAssessmentProgress(input);
  const decision = normalizeAdmissionDecision(input)?.decision ?? null;
  const offerRequired = resolveOfferRequired(input);
  const offer = resolveOfferStateV185(input);
  const readiness = resolveRegistrationReadiness(input);
  const studentId = resolveAdmissionStudentId(input.student_id);
  const rejected = resolveIsSchoolRejected(input);
  const state = String(input.state ?? '');
  const closed =
    state === 'lost' || state === 'cancelled' || state === 'duplicate';
  const registered =
    studentId != null ||
    readiness === 'registered' ||
    input.registration_status === 'registered';
  const accepted =
    decision === 'accepted' || decision === 'accepted_with_condition';

  // --- 1. Follow-up (processing_stage) ---
  let followStatus: AdmissionJourneyStepStatus;
  let followValue: string;
  if (rejected || closed) {
    followStatus = accepted || decision ? 'complete' : 'closed';
    followValue = processing
      ? `admin.admissions.processingStages.${processing}`
      : 'admin.admissions.journey.closed';
  } else if (
    processing === 'assessment_ready' ||
    processing === 'assessment_in_progress' ||
    processing === 'decision_ready' ||
    accepted ||
    decision
  ) {
    followStatus = 'complete';
    followValue = 'admin.admissions.journey.followUpComplete';
  } else if (processing === 'new' || processing === 'initial_follow_up' || !processing) {
    followStatus = 'current';
    followValue = processing
      ? `admin.admissions.processingStages.${processing}`
      : 'admin.admissions.processingStages.new';
  } else {
    followStatus = 'pending';
    followValue = 'admin.admissions.journey.pending';
  }

  // --- 2. Assessment ---
  let assessmentStatus: AdmissionJourneyStepStatus;
  let assessmentValue: string;
  if (rejected && !assessmentProgress) {
    assessmentStatus = 'not_applicable';
    assessmentValue = 'admin.admissions.journey.notApplicable';
  } else if (assessmentProgress === 'not_required') {
    assessmentStatus =
      followStatus === 'complete' || accepted || decision ? 'complete' : 'not_applicable';
    assessmentValue = 'admin.admissions.assessmentProgress.not_required';
  } else if (
    assessmentProgress === 'completed' ||
    assessmentProgress === 'ready_for_decision'
  ) {
    assessmentStatus = 'complete';
    assessmentValue = `admin.admissions.assessmentProgress.${assessmentProgress}`;
  } else if (
    assessmentProgress === 'in_progress' ||
    assessmentProgress === 'additional_required' ||
    processing === 'assessment_in_progress'
  ) {
    assessmentStatus = 'current';
    assessmentValue = assessmentProgress
      ? `admin.admissions.assessmentProgress.${assessmentProgress}`
      : 'admin.admissions.assessmentProgress.in_progress';
  } else if (assessmentProgress === 'not_started' || processing === 'assessment_ready') {
    assessmentStatus = followStatus === 'complete' ? 'current' : 'pending';
    assessmentValue = 'admin.admissions.assessmentProgress.not_started';
  } else if (accepted || decision || processing === 'decision_ready') {
    assessmentStatus = 'complete';
    assessmentValue = 'admin.admissions.assessmentProgress.ready_for_decision';
  } else {
    assessmentStatus = 'pending';
    assessmentValue = 'admin.admissions.journey.pending';
  }

  // --- 3. School decision ---
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
      processing === 'decision_ready' || assessmentStatus === 'complete'
        ? 'current'
        : 'pending';
    decisionValue = 'admin.admissions.journey.decisionPending';
  } else {
    decisionStatus = 'current';
    decisionValue = `admin.admissions.decisions.${decision}`;
  }

  // --- 4. Acceptance procedures (optional offer) ---
  let acceptanceStatus: AdmissionJourneyStepStatus;
  let acceptanceValue: string;
  if (rejected) {
    acceptanceStatus = 'not_applicable';
    acceptanceValue = 'admin.admissions.journey.notApplicable';
  } else if (!accepted) {
    acceptanceStatus = 'not_applicable';
    acceptanceValue = 'admin.admissions.journey.notApplicable';
  } else if (offerRequired === false || offer === 'not_applicable') {
    acceptanceStatus = 'complete';
    acceptanceValue = 'admin.admissions.journey.offerNotRequired';
  } else if (offer === 'accepted') {
    acceptanceStatus = 'complete';
    acceptanceValue = 'admin.admissions.offerStates.acceptedFamily';
  } else if (
    offer === 'not_created' ||
    offer === 'draft' ||
    offer === 'sent' ||
    offer == null
  ) {
    acceptanceStatus = 'current';
    if (offer === 'draft') acceptanceValue = 'admin.admissions.offerStates.draft';
    else if (offer === 'sent') acceptanceValue = 'admin.admissions.offerStates.sentLabel';
    else acceptanceValue = 'admin.admissions.journey.offerRequired';
  } else if (offer === 'declined' || offer === 'expired' || offer === 'withdrawn') {
    acceptanceStatus = 'closed';
    acceptanceValue =
      offer === 'declined'
        ? 'admin.admissions.offerStates.familyDeclined'
        : offer === 'expired'
          ? 'admin.admissions.offerStates.familyExpired'
          : 'admin.admissions.offerStates.withdrawn';
  } else {
    acceptanceStatus = 'pending';
    acceptanceValue = 'admin.admissions.journey.offerPending';
  }

  // --- 5. Registration ---
  let regStatus: AdmissionJourneyStepStatus;
  let regValue: string;
  if (rejected || readiness === 'not_applicable') {
    regStatus = 'not_applicable';
    regValue = 'admin.admissions.journey.notApplicable';
  } else if (registered || readiness === 'registered') {
    regStatus = 'complete';
    regValue = 'admin.admissions.registrationReadiness.registered';
  } else if (readiness === 'blocked') {
    regStatus = 'blocked';
    regValue = 'admin.admissions.registrationReadiness.blocked';
  } else if (readiness === 'ready') {
    regStatus = 'current';
    regValue = 'admin.admissions.registrationReadiness.ready';
  } else if (
    readiness === 'awaiting_offer_creation' ||
    readiness === 'awaiting_offer_response'
  ) {
    // Offer accepted alone is NOT registered.
    regStatus = 'pending';
    regValue = `admin.admissions.registrationReadiness.${readiness}`;
  } else if (accepted && offerRequired === false) {
    regStatus = 'current';
    regValue = 'admin.admissions.registrationReadiness.ready';
  } else if (closed) {
    regStatus = 'not_applicable';
    regValue = 'admin.admissions.journey.notApplicable';
  } else {
    regStatus = 'not_applicable';
    regValue = 'admin.admissions.journey.notApplicable';
  }

  void admissionNextActionLabel(input.next_action ?? null);

  return [
    {
      id: 'follow_up',
      labelKey: 'admin.admissions.journey.followUp',
      status: followStatus,
      valueLabelKey: followValue,
    },
    {
      id: 'assessment',
      labelKey: 'admin.admissions.journey.assessment',
      status: assessmentStatus,
      valueLabelKey: assessmentValue,
    },
    {
      id: 'decision',
      labelKey: 'admin.admissions.journey.decision',
      status: decisionStatus,
      valueLabelKey: decisionValue,
    },
    {
      id: 'acceptance',
      labelKey: 'admin.admissions.journey.acceptance',
      status: acceptanceStatus,
      valueLabelKey: acceptanceValue,
    },
    {
      id: 'registration',
      labelKey: 'admin.admissions.journey.registration',
      status: regStatus,
      valueLabelKey: regValue,
    },
  ];
}
