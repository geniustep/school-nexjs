import type { StudentFinanceWorkspace } from '../types';
import { normalizeReferenceValue } from './reference-labels';
import { resolveFinanceCollectBlockPresentation } from './resolve-finance-collect-block-presentation';
import {
  resolveBillingResponsibilityPresentation,
  shouldBlockFinanceOperationsForBillingResponsibility,
} from './resolve-billing-responsibility-presentation';

export type BillingContextMode =
  | 'active_agreement'
  | 'operational_fees_without_active_agreement'
  | string;

export interface InactiveAgreementRef {
  id: number;
  state?: string | null;
  requires_review?: boolean;
}

export interface BillingContextPresentation {
  mode: BillingContextMode | null;
  hasActiveAgreement: boolean;
  isOperationalWithoutActiveAgreement: boolean;
  billingContextMessage: string | null;
  showRepairCard: boolean;
  repairRecommendedActionKey: string | null;
  inactiveAgreement: InactiveAgreementRef | null;
  collectPaymentAllowed: boolean;
  collectBlockMessage: string | null;
  collectBlockMessageKey: string | null;
  collectBlockReason: string | null;
  shouldHideCollectButton: boolean;
  billingContextHeadlineKey: string | null;
  showNoActiveAgreement: boolean;
}

function readInactiveAgreement(
  workspace?: StudentFinanceWorkspace | null,
): InactiveAgreementRef | null {
  const raw = workspace?.inactive_agreement;
  if (!raw || typeof raw.id !== 'number') return null;
  return {
    id: raw.id,
    state: typeof raw.state === 'string' ? raw.state : null,
    requires_review: raw.requires_review === true,
  };
}

function resolveHasActiveAgreement(workspace?: StudentFinanceWorkspace | null): boolean {
  const billingContext = workspace?.billing_context;
  if (billingContext && typeof billingContext.has_active_agreement === 'boolean') {
    return billingContext.has_active_agreement;
  }
  return workspace?.current_agreement?.state === 'active';
}

function resolveCollectPaymentAllowed(
  workspace: StudentFinanceWorkspace | null | undefined,
  canCollectCapability: boolean,
): boolean {
  if (!canCollectCapability) return false;

  const allowed = workspace?.allowed_actions;
  if (allowed?.collect_payment === false) return false;

  const gate = workspace?.collection_gate;
  if (gate && gate.collect_allowed === false) return false;

  return true;
}

function resolveCollectBlockReason(workspace?: StudentFinanceWorkspace | null): string | null {
  const gateReason = workspace?.collection_gate?.collect_block_reason;
  if (typeof gateReason === 'string' && gateReason.trim()) return gateReason.trim();
  if (workspace?.allowed_actions?.collect_payment === false) {
    return 'agreement_not_active';
  }
  return null;
}

function resolveCollectBlockMessage(
  workspace?: StudentFinanceWorkspace | null,
): {
  apiMessage: string | null;
  messageKey: string | null;
  reason: string | null;
  shouldHideCollectButton: boolean;
} {
  const apiMessage =
    (typeof workspace?.allowed_actions?.collect_block_message === 'string'
      ? workspace.allowed_actions.collect_block_message.trim()
      : null) ??
    (typeof workspace?.collection_gate?.collect_block_message === 'string'
      ? workspace.collection_gate.collect_block_message.trim()
      : null);

  const reason = resolveCollectBlockReason(workspace);
  const presentation = resolveFinanceCollectBlockPresentation({
    workspace,
    collectBlockReason: reason,
    collectBlockMessage: apiMessage,
  });

  if (apiMessage && !presentation.messageKey) {
    return {
      apiMessage,
      messageKey: null,
      reason,
      shouldHideCollectButton: presentation.shouldHideCollectButton,
    };
  }

  return {
    apiMessage,
    messageKey: presentation.messageKey,
    reason,
    shouldHideCollectButton: presentation.shouldHideCollectButton,
  };
}

function resolveRepairRecommendedActionKey(
  workspace?: StudentFinanceWorkspace | null,
): string | null {
  const action = workspace?.agreement_repair?.recommended_action;
  if (action === 'create_active_agreement_from_current_fees') {
    return 'admin.student360.financeWorkspace.agreementRepair.recommendedActionCreateFromFees';
  }
  return 'admin.student360.financeWorkspace.agreementRepair.recommendedAction';
}

function resolveBillingContextHeadlineKey(
  workspace?: StudentFinanceWorkspace | null,
  hasActiveAgreement?: boolean,
): string | null {
  if (hasActiveAgreement) return null;

  const mode = workspace?.billing_context?.mode;
  if (mode === 'operational_fees_without_active_agreement') {
    return 'admin.student360.financeWorkspace.billingContext.operationalWithoutActiveAgreement';
  }

  if (workspace?.agreement_repair?.required === true) {
    return 'admin.student360.financeWorkspace.billingContext.needsActiveAgreement';
  }

  if (mode && normalizeReferenceValue(mode) !== 'active_agreement') {
    return 'admin.student360.financeWorkspace.billingContext.needsActiveAgreement';
  }

  return null;
}

export function resolveBillingContextPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  canCollectCapability?: boolean;
  canSelectBillingResponsible?: boolean;
}): BillingContextPresentation {
  const workspace = input.workspace;
  const billingResponsibility = resolveBillingResponsibilityPresentation({
    workspace,
    canSelectBillingResponsible: input.canSelectBillingResponsible,
  });
  const hasActiveAgreement = resolveHasActiveAgreement(workspace);
  const inactiveAgreement = readInactiveAgreement(workspace);
  const mode =
    typeof workspace?.billing_context?.mode === 'string'
      ? workspace.billing_context.mode
      : null;
  const isOperationalWithoutActiveAgreement =
    mode === 'operational_fees_without_active_agreement' ||
    (!hasActiveAgreement &&
      workspace?.billing_context?.has_operational_fees === true &&
      workspace?.billing_context?.has_active_agreement === false);

  const billingContextMessage =
    typeof workspace?.billing_context?.message === 'string' &&
    workspace.billing_context.message.trim()
      ? workspace.billing_context.message.trim()
      : null;

  const collectBlock = resolveCollectBlockMessage(workspace);
  const responsibilityBlocksFinance =
    shouldBlockFinanceOperationsForBillingResponsibility(billingResponsibility);
  const collectPaymentAllowed =
    resolveCollectPaymentAllowed(workspace, input.canCollectCapability === true) &&
    !responsibilityBlocksFinance;
  const responsibilityBlockMessage =
    responsibilityBlocksFinance && billingResponsibility.financeBlockMessageKey
      ? billingResponsibility.financeBlockMessageKey
      : null;

  return {
    mode,
    hasActiveAgreement,
    isOperationalWithoutActiveAgreement,
    billingContextMessage,
    showRepairCard: workspace?.agreement_repair?.required === true,
    repairRecommendedActionKey: resolveRepairRecommendedActionKey(workspace),
    inactiveAgreement,
    collectPaymentAllowed,
    collectBlockMessage:
      responsibilityBlockMessage != null
        ? null
        : collectBlock.apiMessage,
    collectBlockMessageKey: responsibilityBlockMessage ?? collectBlock.messageKey,
    collectBlockReason: collectBlock.reason,
    shouldHideCollectButton:
      responsibilityBlocksFinance || collectBlock.shouldHideCollectButton,
    billingContextHeadlineKey: resolveBillingContextHeadlineKey(workspace, hasActiveAgreement),
    showNoActiveAgreement: !hasActiveAgreement,
  };
}

/** Current agreement state for banners — never surfaces inactive agreement as current. */
export function resolveCurrentAgreementStateForUi(
  workspace?: StudentFinanceWorkspace | null,
): string | null {
  if (resolveHasActiveAgreement(workspace)) {
    return workspace?.current_agreement?.state ?? null;
  }
  return null;
}
