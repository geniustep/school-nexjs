/**
 * Central primary-action resolver for admission detail / family child rows.
 * Backend next_action / allowed_actions / readiness / assessment / processing win.
 */

import type {
  AdmissionAllowedActions,
  AdmissionNextAction,
  AdmissionOfferState,
} from '@/types/admission';
import {
  admissionNextActionCode,
  resolveAssessmentProgress,
  resolveOfferRequired,
  resolveOfferStateV185,
  resolveProcessingStage,
  resolveRegistrationReadiness,
} from './admission-assessment-workflow-contract';
import { hasAdmissionAllowedAction } from './admission-allowed-actions';
import { isAdmissionManualStage } from './admission-stage-options';
import {
  resolveIsSchoolRejected,
  type AdmissionStatusFields,
} from './admission-status-display';
import { resolveAdmissionStudentId } from './admission-registration';
import { normalizeAdmissionDecision } from './normalize-admission-decision';
import {
  resolveAdmissionWorkspaceFromRecord,
  type AdmissionWorkspace,
} from './admission-workspace';

export type AdmissionPrimaryActionKey =
  | 'open_student'
  | 'continue_registration'
  | 'accept_offer'
  | 'create_offer'
  | 'send_offer'
  | 'decide'
  | 'open_assessments'
  | 'schedule_assessment'
  | 'follow_up_start'
  | 'follow_up_activity'
  | 'follow_up_advance'
  | 'follow_up_contact'
  | 'follow_up_qualify'
  | 'follow_up_schedule_visit'
  | 'follow_up_complete_visit'
  | 'view_rejection'
  | 'readonly';

export type AdmissionPrimaryActionIntent =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export type AdmissionPrimaryActionTarget =
  | { kind: 'href'; href: string }
  | { kind: 'dialog'; dialog: 'decision' | 'reopen' | 'accept_offer' | 'change_stage' }
  | { kind: 'tab'; tab: string }
  | { kind: 'none' };

export type AdmissionPrimaryAction = {
  key: AdmissionPrimaryActionKey;
  labelKey: string;
  descriptionKey: string;
  intent: AdmissionPrimaryActionIntent;
  requiredAction?: string;
  target: AdmissionPrimaryActionTarget;
  /** Suggested follow-up stage when key is a follow_up_* transition. */
  suggestedState?: string;
  disabled?: boolean;
  disabledReasonKey?: string;
};

export type AdmissionSecondaryActionKey =
  | 'change_stage'
  | 'edit'
  | 'decide'
  | 'schedule_appointment'
  | 'add_assessment'
  | 'create_offer'
  | 'send_offer'
  | 'accept_offer'
  | 'decline_offer'
  | 'link_student'
  | 'reopen'
  | 'open_history'
  | 'review_data'
  | 'open_student'
  | 'continue_registration'
  | 'view_rejection';

export type AdmissionSecondaryAction = {
  key: AdmissionSecondaryActionKey;
  labelKey: string;
  requiredAction?: string;
  target: AdmissionPrimaryActionTarget;
  suggestedState?: string;
};

export type AdmissionPrimaryActionInput = AdmissionStatusFields & {
  id?: number | string;
  state?: string | null;
  student_id?: number | false | null;
  registration_flow_state?: string | null;
  admission_workspace?: string | null;
  processing_stage?: string | null;
  assessment_progress?: string | null;
  assessment_summary?: { progress?: string | null } | null;
  offer_required?: boolean | null;
  offer_summary?: Record<string, unknown> | null;
  registration_readiness?: string | null;
  allowed_actions?: AdmissionAllowedActions | string[] | null;
  offers?: Array<{ id?: number; state?: string | null }> | null;
  offer_state?: AdmissionOfferState | false | null;
  can_reopen?: boolean | null;
  next_action?: AdmissionNextAction;
};

function actionsOf(input: AdmissionPrimaryActionInput) {
  return input.allowed_actions ?? {};
}

function can(input: AdmissionPrimaryActionInput, key: string): boolean {
  return hasAdmissionAllowedAction(actionsOf(input), key);
}

function canChangeStage(input: AdmissionPrimaryActionInput): boolean {
  return can(input, 'change_processing_stage') || can(input, 'change_state');
}

function decisionValue(input: AdmissionPrimaryActionInput): string | null {
  return normalizeAdmissionDecision(input)?.decision ?? null;
}

function workspaceOf(input: AdmissionPrimaryActionInput): AdmissionWorkspace {
  return resolveAdmissionWorkspaceFromRecord(input);
}

function findOffer(
  input: AdmissionPrimaryActionInput,
  states: string[],
): { id?: number; state?: string | null } | null {
  const list = input.offers ?? [];
  return list.find((o) => states.includes(String(o.state ?? ''))) ?? null;
}

function hrefStudent(input: AdmissionPrimaryActionInput): string | null {
  const id = resolveAdmissionStudentId(input.student_id);
  return id != null ? `/admin/students/${id}` : null;
}

function hrefContinue(input: AdmissionPrimaryActionInput): string {
  return `/admin/students/new?admission_id=${input.id ?? ''}`;
}

function readonlyAction(descriptionKey: string): AdmissionPrimaryAction {
  return {
    key: 'readonly',
    labelKey: 'admin.admissions.primaryAction.readonly',
    descriptionKey,
    intent: 'neutral',
    target: { kind: 'none' },
    disabled: true,
  };
}

/**
 * Fixed precedence primary action. Always returns one action (may be readonly).
 */
export function resolveAdmissionPrimaryAction(
  input: AdmissionPrimaryActionInput,
): AdmissionPrimaryAction {
  const studentId = resolveAdmissionStudentId(input.student_id);
  const readiness = resolveRegistrationReadiness(input);
  const processing = resolveProcessingStage(input);
  const assessmentProgress = resolveAssessmentProgress(input);
  const decision = decisionValue(input);
  const offerRequired = resolveOfferRequired(input);
  const offerState = resolveOfferStateV185(input);
  const state = String(input.state ?? '');
  const workspace = workspaceOf(input);
  const rejected = resolveIsSchoolRejected(input);
  const nextCode = admissionNextActionCode(input.next_action ?? null);

  // 1. Registered
  if (studentId != null || readiness === 'registered') {
    const href = hrefStudent(input);
    if (href) {
      return {
        key: 'open_student',
        labelKey: 'admin.admissions.primaryAction.openStudent',
        descriptionKey: 'admin.admissions.primaryAction.openStudentDesc',
        intent: 'success',
        target: { kind: 'href', href },
      };
    }
    return readonlyAction('admin.admissions.primaryAction.registeredNoLinkDesc');
  }

  // 2. Ready for registration (Backend readiness wins; confirmed is legacy alias)
  if (readiness === 'ready' || (state === 'confirmed' && readiness == null)) {
    if (can(input, 'get_prefill')) {
      return {
        key: 'continue_registration',
        labelKey: 'admin.admissions.primaryAction.continueRegistration',
        descriptionKey: 'admin.admissions.primaryAction.continueRegistrationDesc',
        intent: 'success',
        requiredAction: 'get_prefill',
        target: { kind: 'href', href: hrefContinue(input) },
      };
    }
    if (can(input, 'link_student')) {
      return {
        key: 'continue_registration',
        labelKey: 'admin.admissions.primaryAction.linkStudent',
        descriptionKey: 'admin.admissions.primaryAction.continueRegistrationDesc',
        intent: 'success',
        requiredAction: 'link_student',
        target: { kind: 'tab', tab: 'offer_registration' },
      };
    }
    return readonlyAction('admin.admissions.primaryAction.readyNoPermissionDesc');
  }

  // Rejected / closed before follow-up fallbacks (processing_stage may be absent)
  if (rejected) {
    return {
      key: 'view_rejection',
      labelKey: 'admin.admissions.primaryAction.viewRejection',
      descriptionKey: 'admin.admissions.primaryAction.viewRejectionDesc',
      intent: 'danger',
      target: { kind: 'tab', tab: 'decision' },
    };
  }

  if (state === 'lost' || state === 'cancelled' || state === 'duplicate') {
    return readonlyAction('admin.admissions.primaryAction.closedDesc');
  }

  // 3. Awaiting offer response
  if (
    readiness === 'awaiting_offer_response' ||
    offerState === 'sent' ||
    findOffer(input, ['sent', 'pending'])
  ) {
    if (can(input, 'accept_offer')) {
      return {
        key: 'accept_offer',
        labelKey: 'admin.admissions.primaryAction.acceptOffer',
        descriptionKey: 'admin.admissions.primaryAction.acceptOfferDesc',
        intent: 'primary',
        requiredAction: 'accept_offer',
        target: { kind: 'dialog', dialog: 'accept_offer' },
      };
    }
    return {
      key: 'accept_offer',
      labelKey: 'admin.admissions.primaryAction.openOffer',
      descriptionKey: 'admin.admissions.primaryAction.acceptOfferDesc',
      intent: 'primary',
      target: { kind: 'tab', tab: 'offer_registration' },
      disabled: !can(input, 'accept_offer') && !can(input, 'decline_offer'),
    };
  }

  // 4. Awaiting offer creation / draft send
  if (
    readiness === 'awaiting_offer_creation' ||
    ((offerRequired === true || offerRequired == null) &&
      (offerState === 'not_created' || !offerState) &&
      (decision === 'accepted' || decision === 'accepted_with_condition'))
  ) {
    if (offerState === 'draft' || findOffer(input, ['draft'])) {
      if (can(input, 'send_offer')) {
        return {
          key: 'send_offer',
          labelKey: 'admin.admissions.primaryAction.sendOffer',
          descriptionKey: 'admin.admissions.primaryAction.sendOfferDesc',
          intent: 'primary',
          requiredAction: 'send_offer',
          target: { kind: 'tab', tab: 'offer_registration' },
        };
      }
    }
    if (can(input, 'create_offer')) {
      return {
        key: 'create_offer',
        labelKey: 'admin.admissions.primaryAction.createOffer',
        descriptionKey: 'admin.admissions.primaryAction.createOfferDesc',
        intent: 'primary',
        requiredAction: 'create_offer',
        target: { kind: 'tab', tab: 'offer_registration' },
      };
    }
  }

  // 5. Offer draft → send (when readiness did not classify as awaiting_offer_creation)
  if (offerState === 'draft' || findOffer(input, ['draft'])) {
    if (can(input, 'send_offer')) {
      return {
        key: 'send_offer',
        labelKey: 'admin.admissions.primaryAction.sendOffer',
        descriptionKey: 'admin.admissions.primaryAction.sendOfferDesc',
        intent: 'primary',
        requiredAction: 'send_offer',
        target: { kind: 'tab', tab: 'offer_registration' },
      };
    }
  }

  // Accepted + offer not required → registration path already handled above via readiness.
  const acceptedDecision =
    decision === 'accepted' || decision === 'accepted_with_condition';
  if (acceptedDecision && offerRequired === false && can(input, 'get_prefill')) {
    return {
      key: 'continue_registration',
      labelKey: 'admin.admissions.primaryAction.continueRegistration',
      descriptionKey: 'admin.admissions.primaryAction.continueRegistrationDesc',
      intent: 'success',
      requiredAction: 'get_prefill',
      target: { kind: 'href', href: hrefContinue(input) },
    };
  }

  // 6. Decision ready
  if (
    processing === 'decision_ready' ||
    workspace === 'awaiting_decision' ||
    decision === 'needs_reassessment' ||
    decision === 'waitlisted' ||
    (!decision && (processing === 'decision_ready' || state === 'under_review'))
  ) {
    if (can(input, 'decide')) {
      return {
        key: 'decide',
        labelKey: 'admin.admissions.primaryAction.decide',
        descriptionKey: 'admin.admissions.primaryAction.decideDesc',
        intent: 'primary',
        requiredAction: 'decide',
        target: { kind: 'dialog', dialog: 'decision' },
      };
    }
    if (decision === 'needs_reassessment' && can(input, 'add_assessment')) {
      return {
        key: 'open_assessments',
        labelKey: 'admin.admissions.primaryAction.openAssessments',
        descriptionKey: 'admin.admissions.primaryAction.openAssessmentsDesc',
        intent: 'warning',
        requiredAction: 'add_assessment',
        target: { kind: 'tab', tab: 'assessments_appointments' },
      };
    }
  }

  // 7. Assessment in progress — next assessment action
  if (
    processing === 'assessment_in_progress' ||
    assessmentProgress === 'in_progress' ||
    assessmentProgress === 'additional_required'
  ) {
    if (can(input, 'add_assessment') || can(input, 'update_assessment')) {
      return {
        key: 'open_assessments',
        labelKey: 'admin.admissions.primaryAction.openAssessments',
        descriptionKey: 'admin.admissions.primaryAction.openAssessmentsDesc',
        intent: 'primary',
        requiredAction: can(input, 'add_assessment') ? 'add_assessment' : 'update_assessment',
        target: { kind: 'tab', tab: 'assessments_appointments' },
      };
    }
  }

  // 8. Assessment ready — create / schedule
  if (processing === 'assessment_ready' || assessmentProgress === 'not_started') {
    if (can(input, 'add_assessment')) {
      return {
        key: 'schedule_assessment',
        labelKey: 'admin.admissions.primaryAction.scheduleAssessment',
        descriptionKey: 'admin.admissions.primaryAction.scheduleAssessmentDesc',
        intent: 'primary',
        requiredAction: 'add_assessment',
        target: { kind: 'tab', tab: 'assessments_appointments' },
      };
    }
    if (can(input, 'schedule_appointment')) {
      return {
        key: 'schedule_assessment',
        labelKey: 'admin.admissions.primaryAction.scheduleAppointment',
        descriptionKey: 'admin.admissions.primaryAction.scheduleAssessmentDesc',
        intent: 'primary',
        requiredAction: 'schedule_appointment',
        target: { kind: 'tab', tab: 'assessments_appointments' },
      };
    }
  }

  // 9. Initial follow-up
  if (processing === 'initial_follow_up' || state === 'contacted' || state === 'visit_pending') {
    if (canChangeStage(input)) {
      return {
        key: 'follow_up_advance',
        labelKey: 'admin.admissions.primaryAction.advanceProcessingStage',
        descriptionKey: 'admin.admissions.primaryAction.advanceProcessingStageDesc',
        intent: 'primary',
        requiredAction: can(input, 'change_processing_stage')
          ? 'change_processing_stage'
          : 'change_state',
        suggestedState: 'assessment_ready',
        target: { kind: 'dialog', dialog: 'change_stage' },
      };
    }
    if (can(input, 'edit') || can(input, 'schedule_appointment')) {
      return {
        key: 'follow_up_activity',
        labelKey: 'admin.admissions.primaryAction.recordFollowUp',
        descriptionKey: 'admin.admissions.primaryAction.recordFollowUpDesc',
        intent: 'primary',
        target: { kind: 'tab', tab: 'summary' },
      };
    }
  }

  // 10. New — only explicit new (do not treat missing processing_stage as new)
  if (processing === 'new' || state === 'new') {
    if (canChangeStage(input)) {
      return {
        key: 'follow_up_start',
        labelKey: 'admin.admissions.primaryAction.startInitialFollowUp',
        descriptionKey: 'admin.admissions.primaryAction.startInitialFollowUpDesc',
        intent: 'primary',
        requiredAction: can(input, 'change_processing_stage')
          ? 'change_processing_stage'
          : 'change_state',
        suggestedState: 'initial_follow_up',
        target: { kind: 'dialog', dialog: 'change_stage' },
      };
    }
  }

  // Legacy manual stage fallback (stale payloads without processing_stage)
  if (isAdmissionManualStage(state) && canChangeStage(input) && !processing) {
    return {
      key: 'follow_up_start',
      labelKey: 'admin.admissions.primaryAction.startInitialFollowUp',
      descriptionKey: 'admin.admissions.primaryAction.startInitialFollowUpDesc',
      intent: 'primary',
      requiredAction: 'change_state',
      suggestedState: 'initial_follow_up',
      target: { kind: 'dialog', dialog: 'change_stage' },
    };
  }

  if (nextCode) {
    return readonlyAction('admin.admissions.primaryAction.noActionDesc');
  }

  return readonlyAction('admin.admissions.primaryAction.noActionDesc');
}

/** Secondary actions excluding the current primary key. */
export function resolveAdmissionSecondaryActions(
  input: AdmissionPrimaryActionInput,
  primary: AdmissionPrimaryAction = resolveAdmissionPrimaryAction(input),
): AdmissionSecondaryAction[] {
  const out: AdmissionSecondaryAction[] = [];
  const state = String(input.state ?? '');
  const processing = resolveProcessingStage(input);
  const rejected = resolveIsSchoolRejected(input);
  const studentId = resolveAdmissionStudentId(input.student_id);
  const readiness = resolveRegistrationReadiness(input);

  function push(action: AdmissionSecondaryAction) {
    if (action.key === primary.key) return;
    if (
      action.requiredAction &&
      !hasAdmissionAllowedAction(actionsOf(input), action.requiredAction) &&
      !(
        action.requiredAction === 'change_state' &&
        hasAdmissionAllowedAction(actionsOf(input), 'change_processing_stage')
      )
    ) {
      return;
    }
    out.push(action);
  }

  if (isAdmissionManualStage(processing) || isAdmissionManualStage(state) || canChangeStage(input)) {
    push({
      key: 'change_stage',
      labelKey: 'admin.admissions.primaryAction.changeStage',
      requiredAction: can(input, 'change_processing_stage')
        ? 'change_processing_stage'
        : 'change_state',
      target: { kind: 'dialog', dialog: 'change_stage' },
    });
  }

  push({
    key: 'edit',
    labelKey: 'admin.admissions.editRequest',
    requiredAction: 'edit',
    target: { kind: 'tab', tab: 'summary' },
  });

  push({
    key: 'decide',
    labelKey: 'admin.admissions.primaryAction.decide',
    requiredAction: 'decide',
    target: { kind: 'dialog', dialog: 'decision' },
  });

  push({
    key: 'schedule_appointment',
    labelKey: 'admin.admissions.primaryAction.scheduleAppointment',
    requiredAction: 'schedule_appointment',
    target: { kind: 'tab', tab: 'assessments_appointments' },
  });

  push({
    key: 'add_assessment',
    labelKey: 'admin.admissions.primaryAction.openAssessments',
    requiredAction: 'add_assessment',
    target: { kind: 'tab', tab: 'assessments_appointments' },
  });

  push({
    key: 'create_offer',
    labelKey: 'admin.admissions.primaryAction.createOffer',
    requiredAction: 'create_offer',
    target: { kind: 'tab', tab: 'offer_registration' },
  });

  push({
    key: 'send_offer',
    labelKey: 'admin.admissions.primaryAction.sendOffer',
    requiredAction: 'send_offer',
    target: { kind: 'tab', tab: 'offer_registration' },
  });

  push({
    key: 'accept_offer',
    labelKey: 'admin.admissions.primaryAction.acceptOffer',
    requiredAction: 'accept_offer',
    target: { kind: 'dialog', dialog: 'accept_offer' },
  });

  push({
    key: 'decline_offer',
    labelKey: 'admin.admissions.actions.declineOffer',
    requiredAction: 'decline_offer',
    target: { kind: 'tab', tab: 'offer_registration' },
  });

  push({
    key: 'link_student',
    labelKey: 'admin.admissions.primaryAction.linkStudent',
    requiredAction: 'link_student',
    target: { kind: 'tab', tab: 'offer_registration' },
  });

  if (studentId != null) {
    push({
      key: 'open_student',
      labelKey: 'admin.admissions.primaryAction.openStudent',
      target: { kind: 'href', href: `/admin/students/${studentId}` },
    });
  } else if (readiness === 'ready' || state === 'confirmed') {
    push({
      key: 'continue_registration',
      labelKey: 'admin.admissions.primaryAction.continueRegistration',
      requiredAction: 'get_prefill',
      target: { kind: 'href', href: hrefContinue(input) },
    });
  }

  if (rejected || state === 'lost' || state === 'cancelled' || state === 'duplicate') {
    push({
      key: 'reopen',
      labelKey: 'admin.admissions.primaryAction.reopen',
      requiredAction: 'reopen',
      target: { kind: 'dialog', dialog: 'reopen' },
    });
  }

  if (rejected) {
    push({
      key: 'view_rejection',
      labelKey: 'admin.admissions.primaryAction.viewRejection',
      target: { kind: 'tab', tab: 'decision' },
    });
  }

  push({
    key: 'review_data',
    labelKey: 'admin.admissions.primaryAction.reviewData',
    target: { kind: 'tab', tab: 'family_data' },
  });

  push({
    key: 'open_history',
    labelKey: 'admin.admissions.primaryAction.openHistory',
    target: { kind: 'tab', tab: 'history' },
  });

  return out;
}

export function primaryActionExcludesSecondary(
  primary: AdmissionPrimaryAction,
  secondary: AdmissionSecondaryAction[],
): boolean {
  return !secondary.some((s) => s.key === primary.key);
}
