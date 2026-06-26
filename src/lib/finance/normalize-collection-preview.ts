import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  PaymentCollectionPreview,
  PaymentCollectionPreviewAllocation,
} from '@/types/payment-collection-preview';

function readMoney(value: unknown): number {
  return normalizeMoneyValue(value) ?? 0;
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
    status_after: typeof obj.status_after === 'string' ? obj.status_after : 'partial',
    period_label: typeof obj.period_label === 'string' ? obj.period_label : null,
    display_label: typeof obj.display_label === 'string' ? obj.display_label : null,
    fee_name: typeof obj.fee_name === 'string' ? obj.fee_name : null,
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

  const allocatedAmount = readMoney(raw.allocated_amount ?? raw.allocatedAmount);
  const unallocatedAmount = readMoney(raw.unallocated_amount ?? raw.unallocatedAmount);
  const remainingTotal = readMoney(raw.remaining_total ?? raw.remainingTotal);
  const prepaymentAllowed = raw.prepayment_allowed === true || raw.prepaymentAllowed === true;

  const isPrepayment =
    allocations.length > 1 ||
    (allocations.length === 1 &&
      allocations[0].status_after === 'paid' &&
      amount > allocations[0].amount + 0.009);

  return {
    amount,
    prepayment_allowed: prepaymentAllowed,
    remaining_total: remainingTotal,
    allocated_amount: allocatedAmount > 0 ? allocatedAmount : amount,
    unallocated_amount: unallocatedAmount,
    allocations,
    errors,
    is_valid: errors.length === 0 && allocations.length > 0 && allocatedAmount > 0,
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
