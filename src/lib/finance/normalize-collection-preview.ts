import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  PaymentCollectionAllocationSummary,
  PaymentCollectionPaymentSummary,
  PaymentCollectionPreview,
  PaymentCollectionPreviewAllocation,
  PaymentCollectionPreviewAllowedActions,
} from '@/types/payment-collection-preview';

function readMoney(value: unknown): number {
  return normalizeMoneyValue(value) ?? 0;
}

/**
 * Warnings may arrive as plain strings or as Odoo objects ({ code, message, amount }).
 * Extract the human-readable message for display; never recompute or invent warnings.
 */
function readWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.trim().length > 0) {
      out.push(item);
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const message =
        typeof obj.message === 'string' && obj.message.trim().length > 0
          ? obj.message
          : typeof obj.code === 'string'
            ? obj.code
            : null;
      if (message) out.push(message);
    }
  }
  return out;
}

function normalizeAllocation(raw: unknown): PaymentCollectionPreviewAllocation | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const installmentId =
    typeof obj.installment_id === 'number'
      ? obj.installment_id
      : typeof obj.id === 'number'
        ? obj.id
        : null;
  if (installmentId == null) return null;
  const amount = readMoney(obj.amount);
  if (amount <= 0) return null;
  return {
    installment_id: installmentId,
    student_fee_id: typeof obj.student_fee_id === 'number' ? obj.student_fee_id : null,
    amount,
    allocated_amount: obj.allocated_amount != null ? readMoney(obj.allocated_amount) : amount,
    status_after: typeof obj.status_after === 'string' ? obj.status_after : 'partial',
    is_future_allocation: obj.is_future_allocation === true,
    period_label: typeof obj.period_label === 'string' ? obj.period_label : null,
    display_label: typeof obj.display_label === 'string' ? obj.display_label : null,
    fee_name: typeof obj.fee_name === 'string' ? obj.fee_name : null,
  };
}

function normalizePaymentSummary(
  raw: unknown,
  fallback: PaymentCollectionPaymentSummary,
): PaymentCollectionPaymentSummary {
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  return {
    amount_paid: obj.amount_paid != null ? readMoney(obj.amount_paid) : fallback.amount_paid,
    allocated_amount:
      obj.allocated_amount != null ? readMoney(obj.allocated_amount) : fallback.allocated_amount,
    unallocated_amount:
      obj.unallocated_amount != null ? readMoney(obj.unallocated_amount) : fallback.unallocated_amount,
    resulting_credit_balance:
      obj.resulting_credit_balance != null
        ? readMoney(obj.resulting_credit_balance)
        : fallback.resulting_credit_balance,
  };
}

function normalizeAllocationSummary(raw: unknown): PaymentCollectionAllocationSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  return {
    mode: typeof obj.mode === 'string' ? obj.mode : null,
    allocations_count:
      typeof obj.allocations_count === 'number' ? obj.allocations_count : null,
    future_allocations_count:
      typeof obj.future_allocations_count === 'number' ? obj.future_allocations_count : null,
  };
}

function normalizeAllowedActions(raw: unknown): PaymentCollectionPreviewAllowedActions | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  return {
    can_confirm_with_credit_balance: obj.can_confirm_with_credit_balance === true,
    can_allocate_to_future_installments: obj.can_allocate_to_future_installments === true,
  };
}

export function normalizePaymentCollectionPreview(data: unknown): PaymentCollectionPreview | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const amount = readMoney(raw.amount);
  if (amount <= 0) return null;

  const allocationsRaw = Array.isArray(raw.allocations) ? raw.allocations : [];
  const allocations = allocationsRaw
    .map(normalizeAllocation)
    .filter((row): row is PaymentCollectionPreviewAllocation => row != null);

  const errors = Array.isArray(raw.errors)
    ? raw.errors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  const warnings = readWarnings(raw.warnings);

  const allocatedField = raw.allocated_amount ?? raw.allocatedAmount;
  const allocatedAmount = readMoney(allocatedField);
  const unallocatedAmount = readMoney(raw.unallocated_amount ?? raw.unallocatedAmount);
  const remainingTotal = readMoney(raw.remaining_total ?? raw.remainingTotal);
  const prepaymentAllowed = raw.prepayment_allowed === true || raw.prepaymentAllowed === true;

  // Credit balance is owned by Odoo — read it as-is, never recompute it here.
  const resultingCreditBalance = readMoney(
    raw.resulting_credit_balance ?? raw.resultingCreditBalance,
  );
  const creditAmount = readMoney(raw.credit_amount ?? raw.creditAmount);

  // Prefer the field Odoo reports (it can legitimately be 0 for a full credit balance).
  // Only fall back to the paid amount when the field is entirely absent (legacy contract).
  const displayAllocated = allocatedField != null ? allocatedAmount : amount;
  const paymentSummary = normalizePaymentSummary(raw.payment_summary, {
    amount_paid: amount,
    allocated_amount: displayAllocated,
    unallocated_amount: unallocatedAmount,
    resulting_credit_balance: resultingCreditBalance,
  });
  const allocationSummary = normalizeAllocationSummary(raw.allocation_summary);
  const allowedActions = normalizeAllowedActions(raw.allowed_actions);

  const isPrepayment =
    allocations.length > 1 ||
    (allocations.length === 1 &&
      allocations[0].status_after === 'paid' &&
      amount > allocations[0].amount + 0.009);

  // Submittable when Odoo reports allocations OR an explicit credit balance it allows
  // to confirm. Pure credit-balance payments (no allocations) stay submittable only
  // when Odoo grants `can_confirm_with_credit_balance`.
  const hasAllocations = allocations.length > 0 && allocatedAmount > 0;
  const canConfirmCredit =
    resultingCreditBalance > 0 && allowedActions?.can_confirm_with_credit_balance === true;
  const isValid = errors.length === 0 && (hasAllocations || canConfirmCredit);

  return {
    amount,
    prepayment_allowed: prepaymentAllowed,
    remaining_total: remainingTotal,
    allocated_amount: displayAllocated,
    unallocated_amount: unallocatedAmount,
    resulting_credit_balance: resultingCreditBalance,
    credit_amount: creditAmount,
    allocations,
    warnings,
    errors,
    payment_summary: paymentSummary,
    allocation_summary: allocationSummary,
    allowed_actions: allowedActions,
    is_valid: isValid,
    is_prepayment: isPrepayment,
  };
}

export function isCollectionPreviewStale(
  preview: PaymentCollectionPreview | null,
  amount: number,
): boolean {
  if (!preview) return true;
  return Math.abs(preview.amount - amount) > 0.009;
}
