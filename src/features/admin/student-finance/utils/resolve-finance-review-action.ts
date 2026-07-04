import type { StudentFinanceWorkspace } from '../types';
import type { FinanceAgreementActionItem } from '../types/agreement-context';
import {
  readBillingPartnerMismatchDetail,
  readFinanceReviewReasons,
  resolveFinanceReviewPresentation,
} from './resolve-finance-review-presentation';
import { readRequiresFinanceReview } from './resolve-fee-plan-presentation';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isResolveFinanceReviewAllowed(
  workspace?: StudentFinanceWorkspace | null,
): boolean {
  return workspace?.allowed_actions?.resolve_finance_review === true;
}

export function resolveFinanceReviewDisabledReason(
  workspace?: StudentFinanceWorkspace | null,
): string | null {
  const actionReason =
    readString(
      (workspace?.action_reasons as Record<string, unknown> | undefined)?.resolve_finance_review,
    ) ?? null;
  if (actionReason) return actionReason;

  const detail = readBillingPartnerMismatchDetail(workspace);
  if (detail?.resolution_available === false) {
    return detail.resolution_block_reason ?? detail.resolution_message ?? null;
  }
  return null;
}

export function resolveFinanceReviewResolveAction(input: {
  workspace?: StudentFinanceWorkspace | null;
}): FinanceAgreementActionItem | null {
  const requiresReview = readRequiresFinanceReview(input.workspace);
  const reasons = readFinanceReviewReasons(input.workspace);
  if (!requiresReview || !reasons.includes('billing_partner_mismatch')) return null;

  const presentation = resolveFinanceReviewPresentation(input.workspace);
  if (!presentation.billingPartnerMismatch) return null;

  const allowed = isResolveFinanceReviewAllowed(input.workspace);
  const resolutionAvailable = presentation.billingPartnerMismatch.resolutionAvailable;
  const enabled = allowed && resolutionAvailable;
  const disabledReasonText = enabled ? null : resolveFinanceReviewDisabledReason(input.workspace);

  if (!allowed && !disabledReasonText) return null;

  return {
    kind: 'resolve_finance_review',
    labelKey: 'admin.student360.financeWorkspace.financeReview.resolveAction',
    enabled,
    disabledTooltipKey: enabled
      ? null
      : disabledReasonText
        ? null
        : 'admin.student360.financeWorkspace.financeReview.resolveUnavailable',
    disabledTooltipText: disabledReasonText,
    primary: enabled,
  };
}
