import type { PaymentCollectionPreview } from '@/types/payment-collection-preview';
import { resolveCollectionCreditSummary } from '@/features/admin/finance/collection-credit-summary';

export interface ReviewCreditNotice {
  amountPaid: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  resultingCreditBalance: number;
  /** Mirrors Odoo `allowed_actions.can_confirm_with_credit_balance`. */
  canConfirmWithCreditBalance: boolean;
  /** Warnings returned by Odoo (already localized/coded upstream). */
  warnings: string[];
}

/**
 * Display-only credit notice for the collection review/confirmation step.
 *
 * Returns null unless the payment will actually create an unallocated credit
 * balance, so the confirmation step only surfaces the credit card and warning
 * when relevant. Every value comes straight from the Odoo preview /
 * payment_summary — Next.js never recomputes paid/partial/overdue.
 */
export function resolveReviewCreditNotice(
  preview: PaymentCollectionPreview | null | undefined,
): ReviewCreditNotice | null {
  const summary = resolveCollectionCreditSummary(preview);
  if (!summary || !summary.hasCreditBalance) return null;
  return {
    amountPaid: summary.amountPaid,
    allocatedAmount: summary.allocatedAmount,
    unallocatedAmount: summary.unallocatedAmount,
    resultingCreditBalance: summary.resultingCreditBalance,
    canConfirmWithCreditBalance: summary.canConfirmWithCreditBalance,
    warnings: summary.warnings,
  };
}
