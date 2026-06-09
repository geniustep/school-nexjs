import type { StudentFeeState, FeePlanState, PaymentCollectionState } from '@/types/finance';

export function formatMoney(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const cur = currency?.trim() || 'MAD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

export function studentFeeState(fee: { state?: string; status?: string }): StudentFeeState | string {
  return (fee.state ?? fee.status ?? 'open') as StudentFeeState;
}

export function feePlanState(plan: { state?: string }): FeePlanState | string {
  return plan.state ?? 'draft';
}

export function collectionState(coll: { state?: string; status?: string }): PaymentCollectionState | string {
  return (coll.state ?? coll.status ?? 'draft') as PaymentCollectionState;
}

export function financeStatusTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'paid':
    case 'confirmed':
    case 'active':
      return 'green';
    case 'partial':
    case 'draft':
      return 'amber';
    case 'overdue':
    case 'cancelled':
      return 'red';
    case 'open':
      return 'blue';
    default:
      return 'slate';
  }
}

export function refName(value: { name?: string } | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.name ?? null;
}
