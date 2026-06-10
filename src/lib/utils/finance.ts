import type { StudentFeeState, FeePlanState, PaymentCollectionState } from '@/types/finance';

export function formatMoney(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const cur = currency?.trim();
  if (!cur) {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
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

export function isPositiveAmount(value: number | null | undefined): boolean {
  return value != null && !Number.isNaN(value) && value > 0;
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

export function installmentIsOverdue(row: {
  is_overdue?: boolean;
  overdue?: boolean;
  state?: string;
  status?: string;
}): boolean {
  if (row.is_overdue === true || row.overdue === true) return true;
  const s = (row.state ?? row.status ?? '').toLowerCase();
  return s === 'overdue';
}

export function financeStudentDisplayName(row: {
  name?: string;
  full_name?: string;
}): string {
  return row.full_name?.trim() || row.name?.trim() || '—';
}

/** Remaining balance from API variants (Odoo may send balance_amount). */
export function feeBalanceAmount(row: {
  remaining_amount?: number;
  balance_amount?: number;
  balance?: number;
}): number | undefined {
  const v = row.remaining_amount ?? row.balance_amount ?? row.balance;
  return v == null || Number.isNaN(v) ? undefined : v;
}

export function paymentMethodLabel(
  method: string | undefined,
  t: (key: string) => string,
): string {
  if (!method) return '—';
  const key = `admin.finance.method${method.charAt(0).toUpperCase()}${method.slice(1)}`;
  const mapped = t(key);
  if (mapped !== key) return mapped;
  const parentKey = `parent.finance.method${method.charAt(0).toUpperCase()}${method.slice(1)}`;
  const parentMapped = t(parentKey);
  return parentMapped !== parentKey ? parentMapped : method;
}
