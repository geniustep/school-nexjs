import type { StudentFinanceWorkspace } from '../types';

const REVIEW_REASONS = new Set([
  'agreement_amount_mismatch',
  'billing_partner_mismatch',
  'cancelled_agreement_has_planned_installments',
]);

const HIDE_COLLECT_REASONS = new Set([
  'agreement_not_active',
  'active_agreement_required',
  'billing_responsibility_unresolved',
]);

export interface FinanceCollectBlockPresentation {
  messageKey: string | null;
  apiMessage: string | null;
  shouldHideCollectButton: boolean;
}

export function resolveFinanceCollectBlockPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  collectBlockReason?: string | null;
  collectBlockMessage?: string | null;
}): FinanceCollectBlockPresentation {
  const apiMessage = input.collectBlockMessage?.trim() || null;
  const reason = input.collectBlockReason?.trim() || null;
  const gateReason =
    typeof input.workspace?.collection_gate?.collect_block_reason === 'string'
      ? input.workspace.collection_gate.collect_block_reason.trim()
      : null;
  const effectiveReason = reason ?? gateReason;

  if (effectiveReason && REVIEW_REASONS.has(effectiveReason)) {
    return {
      messageKey: 'admin.student360.financeWorkspace.agreementContext.collectNeedsFinanceReview',
      apiMessage,
      shouldHideCollectButton: true,
    };
  }

  if (effectiveReason === 'no_open_balance' || effectiveReason === 'remaining_zero') {
    return {
      messageKey: 'admin.finance.collectionWorkflow.errors.noOpenBalance',
      apiMessage,
      shouldHideCollectButton: true,
    };
  }

  if (effectiveReason === 'billing_responsibility_unresolved') {
    return {
      messageKey: 'admin.student360.create.billingResponsibility.unresolvedCollectBlocked',
      apiMessage,
      shouldHideCollectButton: true,
    };
  }

  if (effectiveReason && HIDE_COLLECT_REASONS.has(effectiveReason)) {
    return {
      messageKey: 'admin.student360.financeWorkspace.agreementContext.collectBlockedBeforeActivation',
      apiMessage,
      shouldHideCollectButton: true,
    };
  }

  if (input.workspace?.collection_gate?.collect_allowed === false) {
    if (effectiveReason === 'billing_responsibility_unresolved') {
      return {
        messageKey: 'admin.student360.create.billingResponsibility.unresolvedCollectBlocked',
        apiMessage,
        shouldHideCollectButton: true,
      };
    }
    return {
      messageKey: 'admin.finance.collectionWorkflow.errors.agreementNotActive',
      apiMessage,
      shouldHideCollectButton: HIDE_COLLECT_REASONS.has(effectiveReason ?? 'agreement_not_active'),
    };
  }

  return {
    messageKey: null,
    apiMessage,
    shouldHideCollectButton: false,
  };
}
