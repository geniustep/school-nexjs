/**
 * Central primary-action resolver for admission detail / family child rows.
 * Precedence is fixed; Backend allowed_actions gates every actionable result.
 */

import type { AdmissionAllowedActions, AdmissionOfferState } from '@/types/admission';
import { hasAdmissionAllowedAction } from './admission-allowed-actions';
import { isAdmissionManualStage } from './admission-stage-options';
import {
  resolveIsSchoolRejected,
  resolveOfferStateValue,
  resolveRegistrationStatus,
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
  allowed_actions?: AdmissionAllowedActions | string[] | null;
  offers?: Array<{ id?: number; state?: string | null }> | null;
  offer_state?: AdmissionOfferState | false | null;
  can_reopen?: boolean | null;
  next_action?: string | null;
};

function actionsOf(input: AdmissionPrimaryActionInput) {
  return input.allowed_actions ?? {};
}

function can(input: AdmissionPrimaryActionInput, key: string): boolean {
  return hasAdmissionAllowedAction(actionsOf(input), key);
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

function resolveOfferState(input: AdmissionPrimaryActionInput): string | null {
  return resolveOfferStateValue(input);
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
  const registration = resolveRegistrationStatus(input).status;
  const decision = decisionValue(input);
  const offerState = resolveOfferState(input);
  const state = String(input.state ?? '');
  const workspace = workspaceOf(input);
  const rejected = resolveIsSchoolRejected(input);

  // 1. Registered
  if (studentId != null || registration === 'registered') {
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

  // 2. Ready for registration (confirmed, no student)
  if (state === 'confirmed') {
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

  // 3. Offer sent — family acceptance
  const sentOffer = findOffer(input, ['sent', 'pending']);
  if (
    (offerState === 'sent' || offerState === 'pending' || sentOffer) &&
    can(input, 'accept_offer')
  ) {
    return {
      key: 'accept_offer',
      labelKey: 'admin.admissions.primaryAction.acceptOffer',
      descriptionKey: 'admin.admissions.primaryAction.acceptOfferDesc',
      intent: 'primary',
      requiredAction: 'accept_offer',
      target: { kind: 'dialog', dialog: 'accept_offer' },
    };
  }

  // 4. Accepted without completed offer flow
  const acceptedDecision =
    decision === 'accepted' || decision === 'accepted_with_condition';
  if (acceptedDecision && state !== 'confirmed') {
    if (can(input, 'create_offer') && (!offerState || offerState === 'cancelled')) {
      return {
        key: 'create_offer',
        labelKey: 'admin.admissions.primaryAction.createOffer',
        descriptionKey: 'admin.admissions.primaryAction.createOfferDesc',
        intent: 'primary',
        requiredAction: 'create_offer',
        target: { kind: 'tab', tab: 'offer_registration' },
      };
    }
    if (
      can(input, 'send_offer') &&
      (offerState === 'draft' || findOffer(input, ['draft']))
    ) {
      return {
        key: 'send_offer',
        labelKey: 'admin.admissions.primaryAction.sendOffer',
        descriptionKey: 'admin.admissions.primaryAction.sendOfferDesc',
        intent: 'primary',
        requiredAction: 'send_offer',
        target: { kind: 'tab', tab: 'offer_registration' },
      };
    }
    if (can(input, 'get_prefill')) {
      return {
        key: 'continue_registration',
        labelKey: 'admin.admissions.primaryAction.continueRegistration',
        descriptionKey: 'admin.admissions.primaryAction.continueRegistrationDesc',
        intent: 'primary',
        requiredAction: 'get_prefill',
        target: { kind: 'href', href: hrefContinue(input) },
      };
    }
  }

  // 5. Needs school decision
  const needsDecision =
    workspace === 'awaiting_decision' ||
    state === 'under_review' ||
    decision === 'needs_reassessment' ||
    decision === 'waitlisted' ||
    (!decision &&
      (state === 'under_review' || workspace === 'awaiting_decision'));

  if (needsDecision) {
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

  // 6. Initial follow-up manual stages
  if (isAdmissionManualStage(state) && can(input, 'change_state')) {
    if (state === 'new') {
      return {
        key: 'follow_up_contact',
        labelKey: 'admin.admissions.primaryAction.markContacted',
        descriptionKey: 'admin.admissions.primaryAction.markContactedDesc',
        intent: 'primary',
        requiredAction: 'change_state',
        suggestedState: 'contacted',
        target: { kind: 'dialog', dialog: 'change_stage' },
      };
    }
    if (state === 'contacted') {
      return {
        key: 'follow_up_qualify',
        labelKey: 'admin.admissions.primaryAction.markQualified',
        descriptionKey: 'admin.admissions.primaryAction.markQualifiedDesc',
        intent: 'primary',
        requiredAction: 'change_state',
        suggestedState: 'qualified',
        target: { kind: 'dialog', dialog: 'change_stage' },
      };
    }
    if (state === 'qualified') {
      return {
        key: 'follow_up_schedule_visit',
        labelKey: 'admin.admissions.primaryAction.markVisitPending',
        descriptionKey: 'admin.admissions.primaryAction.markVisitPendingDesc',
        intent: 'primary',
        requiredAction: 'change_state',
        suggestedState: 'visit_pending',
        target: { kind: 'dialog', dialog: 'change_stage' },
      };
    }
    if (state === 'visit_pending') {
      return {
        key: 'follow_up_complete_visit',
        labelKey: 'admin.admissions.primaryAction.markUnderReview',
        descriptionKey: 'admin.admissions.primaryAction.markUnderReviewDesc',
        intent: 'primary',
        requiredAction: 'change_state',
        suggestedState: 'under_review',
        target: { kind: 'dialog', dialog: 'change_stage' },
      };
    }
  }

  // Also allow schedule_appointment as primary for visit_pending when change_state missing
  if (state === 'visit_pending' && can(input, 'schedule_appointment')) {
    return {
      key: 'follow_up_schedule_visit',
      labelKey: 'admin.admissions.primaryAction.scheduleAppointment',
      descriptionKey: 'admin.admissions.primaryAction.markVisitPendingDesc',
      intent: 'primary',
      requiredAction: 'schedule_appointment',
      target: { kind: 'tab', tab: 'assessments_appointments' },
    };
  }

  // 7. Rejected / closed
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

  return readonlyAction('admin.admissions.primaryAction.noActionDesc');
}

/** Secondary actions excluding the current primary key. */
export function resolveAdmissionSecondaryActions(
  input: AdmissionPrimaryActionInput,
  primary: AdmissionPrimaryAction = resolveAdmissionPrimaryAction(input),
): AdmissionSecondaryAction[] {
  const out: AdmissionSecondaryAction[] = [];
  const state = String(input.state ?? '');
  const rejected = resolveIsSchoolRejected(input);
  const studentId = resolveAdmissionStudentId(input.student_id);

  function push(action: AdmissionSecondaryAction) {
    if (action.key === primary.key) return;
    if (
      action.requiredAction &&
      !hasAdmissionAllowedAction(actionsOf(input), action.requiredAction)
    ) {
      return;
    }
    out.push(action);
  }

  if (isAdmissionManualStage(state) || can(input, 'change_state')) {
    push({
      key: 'change_stage',
      labelKey: 'admin.admissions.primaryAction.changeStage',
      requiredAction: 'change_state',
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
  } else if (state === 'confirmed') {
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
