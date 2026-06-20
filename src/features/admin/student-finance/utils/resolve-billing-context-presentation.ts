import type { StudentFinanceWorkspace } from '../types';
import { normalizeReferenceValue } from './reference-labels';

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

function resolveCollectBlockMessage(
  workspace?: StudentFinanceWorkspace | null,
): { apiMessage: string | null; messageKey: string | null } {
  const apiMessage =
    (typeof workspace?.allowed_actions?.collect_block_message === 'string'
      ? workspace.allowed_actions.collect_block_message.trim()
      : null) ??
    (typeof workspace?.collection_gate?.collect_block_message === 'string'
      ? workspace.collection_gate.collect_block_message.trim()
      : null);

  if (apiMessage) {
    return { apiMessage, messageKey: null };
  }

  const reason = workspace?.collection_gate?.collect_block_reason;
  if (reason === 'active_agreement_required') {
    return {
      apiMessage: null,
      messageKey: 'admin.student360.financeWorkspace.collectPayment.blockedMessage',
    };
  }

  if (workspace?.allowed_actions?.collect_payment === false) {
    return {
      apiMessage: null,
      messageKey: 'admin.student360.financeWorkspace.collectPayment.blockedMessage',
    };
  }

  return { apiMessage: null, messageKey: null };
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
}): BillingContextPresentation {
  const workspace = input.workspace;
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

  return {
    mode,
    hasActiveAgreement,
    isOperationalWithoutActiveAgreement,
    billingContextMessage,
    showRepairCard: workspace?.agreement_repair?.required === true,
    repairRecommendedActionKey: resolveRepairRecommendedActionKey(workspace),
    inactiveAgreement,
    collectPaymentAllowed: resolveCollectPaymentAllowed(
      workspace,
      input.canCollectCapability === true,
    ),
    collectBlockMessage: collectBlock.apiMessage,
    collectBlockMessageKey: collectBlock.messageKey,
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
