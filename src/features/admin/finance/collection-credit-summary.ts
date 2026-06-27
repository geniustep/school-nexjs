import type { PaymentCollectionPreview } from '@/types/payment-collection-preview';

/**
 * Display-only credit-balance summary derived from a payment-collection preview.
 *
 * Source of truth is Odoo: every monetary field and the `can_confirm_with_credit_balance`
 * flag come straight from the preview response. Next.js NEVER recomputes whether an
 * installment is paid/partial/overdue, and a positive credit balance never marks an
 * installment as paid.
 */
export interface CollectionCreditSummary {
  amountPaid: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  resultingCreditBalance: number;
  /** True when a credit balance will be recorded (separate from remaining/overdue/paid). */
  hasCreditBalance: boolean;
  /** True when the whole payment becomes an unallocated credit balance (no allocations). */
  isFullCreditBalance: boolean;
  /** Mirrors Odoo `allowed_actions.can_confirm_with_credit_balance`. */
  canConfirmWithCreditBalance: boolean;
  /** Warnings returned by Odoo (already localized/coded upstream). */
  warnings: string[];
}

function readMoney(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function resolveCollectionCreditSummary(
  preview: PaymentCollectionPreview | null | undefined,
): CollectionCreditSummary | null {
  if (!preview) return null;

  const summary = preview.payment_summary;
  const amountPaid = readMoney(summary?.amount_paid ?? preview.amount);
  const allocatedAmount = readMoney(summary?.allocated_amount ?? preview.allocated_amount);
  const unallocatedAmount = readMoney(summary?.unallocated_amount ?? preview.unallocated_amount);
  const resultingCreditBalance = readMoney(
    summary?.resulting_credit_balance ?? preview.resulting_credit_balance,
  );

  const hasCreditBalance = resultingCreditBalance > 0.0001 || unallocatedAmount > 0.0001;
  const isFullCreditBalance =
    hasCreditBalance && (preview.allocations.length === 0 || allocatedAmount <= 0.0001);

  return {
    amountPaid,
    allocatedAmount,
    unallocatedAmount,
    resultingCreditBalance,
    hasCreditBalance,
    isFullCreditBalance,
    canConfirmWithCreditBalance:
      preview.allowed_actions?.can_confirm_with_credit_balance === true,
    warnings: preview.warnings ?? [],
  };
}
