import type { StudentFinanceWorkspace } from '../types';
import type { ChangePlanEligibility } from './resolve-change-plan-eligibility';
import {
  resolveBillingContextPresentation,
  resolveCurrentAgreementStateForUi,
} from './resolve-billing-context-presentation';
import { hasAgreementData, normalizeReferenceValue } from './reference-labels';

export type AgreementReviewActionKind = 'fix' | 'review';

export interface InactiveAgreementPresentation {
  showWorkspaceBanner: boolean;
  showRepairCard: boolean;
  showReviewAction: boolean;
  reviewActionKind: AgreementReviewActionKind;
  hasInactiveAgreementRecord: boolean;
}

export function resolveInactiveAgreementPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  eligibility: ChangePlanEligibility;
}): InactiveAgreementPresentation {
  const { hasActiveAgreementInUi, hasBillableFinanceContext } = input.eligibility;
  const billingContext = resolveBillingContextPresentation({ workspace: input.workspace });

  if (hasActiveAgreementInUi || !hasBillableFinanceContext) {
    return {
      showWorkspaceBanner: false,
      showRepairCard: false,
      showReviewAction: false,
      reviewActionKind: 'review',
      hasInactiveAgreementRecord: false,
    };
  }

  const workspaceAgreement = input.workspace?.current_agreement ?? null;
  const inactiveRef = billingContext.inactiveAgreement;
  const allowed = input.workspace?.allowed_actions ?? {};
  const agreementAllowed = workspaceAgreement?.allowed_actions ?? {};
  const canCreate =
    allowed.create_agreement === true || agreementAllowed.create_agreement === true;
  const canEditAgreement = agreementAllowed.edit === true || allowed.edit === true;

  const normalizedState = inactiveRef?.state
    ? normalizeReferenceValue(inactiveRef.state)
    : workspaceAgreement?.state
      ? normalizeReferenceValue(workspaceAgreement.state)
      : null;

  const hasInactiveAgreementRecord =
    inactiveRef != null ||
    (hasAgreementData(workspaceAgreement) &&
      normalizedState != null &&
      normalizedState !== 'active');

  const reviewActionKind: AgreementReviewActionKind =
    canCreate || (normalizedState === 'draft' && canEditAgreement) ? 'fix' : 'review';

  const showRepairCard = billingContext.showRepairCard;
  const showReviewAction = showRepairCard || hasInactiveAgreementRecord || hasBillableFinanceContext;

  return {
    showWorkspaceBanner: true,
    showRepairCard,
    showReviewAction,
    reviewActionKind,
    hasInactiveAgreementRecord,
  };
}

export function resolveInactiveAgreementStateForBanner(
  workspace?: StudentFinanceWorkspace | null,
): string | null {
  return resolveCurrentAgreementStateForUi(workspace);
}
