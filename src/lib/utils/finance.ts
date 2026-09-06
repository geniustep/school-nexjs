import type { Locale } from '@/lib/i18n/config';
import type { StudentFeeState, FeePlanState, PaymentCollectionState } from '@/types/finance';

/** Normalize API currency fields that may arrive as a code string or `{ name, symbol }` ref. */
export function getCurrencyCode(value: unknown): string | null {
  return currencyCode(value);
}

/** @deprecated Prefer {@link getCurrencyCode} — kept for existing imports. */
export function currencyCode(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object') {
    const row = value as { name?: string; symbol?: string; code?: string };
    return refName(row) ?? row.symbol?.trim() ?? row.code?.trim() ?? null;
  }
  return null;
}

export function formatMoney(amount: number | null | undefined, currency?: unknown): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const cur = currencyCode(currency);
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
    case 'partially_paid':
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

export function refName(value: { name?: unknown; symbol?: string } | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const name = value.name;
    if (typeof name === 'string') return name;
    if (typeof name === 'number') return String(name);
    if (name && typeof name === 'object') {
      const localized = Object.values(name as Record<string, unknown>).find((v) => typeof v === 'string');
      if (typeof localized === 'string') return localized;
    }
    if (typeof value.symbol === 'string') return value.symbol;
  }
  return null;
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

const IMPORT_UNSPECIFIED_PAYMENT_METHOD_LABEL: Record<Locale, string> = {
  ar: 'غير محددة',
  fr: 'Non renseigné',
  en: 'Not provided',
  es: 'No indicado',
};

export function paymentMethodLabel(
  method: string | { code?: string; name?: string; label?: string } | undefined | null,
  t: (key: string) => string,
  locale?: Locale,
): string {
  if (!method) return '—';
  const code = typeof method === 'string' ? method : method.code ?? method.name ?? method.label ?? '';
  if (!code) return '—';
  const snake = code.toLowerCase();

  // Import provenance must stay internal. When the original payment method is
  // unknown, render honest human-facing semantics instead of the technical enum.
  if (snake === 'import_unspecified') {
    if (locale) return IMPORT_UNSPECIFIED_PAYMENT_METHOD_LABEL[locale];
    const dash = t('common.dash');
    return dash === 'common.dash' ? '—' : dash;
  }

  const camel = snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const candidates = [
    `admin.finance.method${code.charAt(0).toUpperCase()}${code.slice(1)}`,
    `admin.finance.method${camel.charAt(0).toUpperCase()}${camel.slice(1)}`,
    `admin.finance.method${snake.replace(/_/g, '')}`,
  ];
  for (const key of candidates) {
    const mapped = t(key);
    if (mapped !== key) return mapped;
  }
  const parentKey = `parent.finance.method${code.charAt(0).toUpperCase()}${code.slice(1)}`;
  const parentMapped = t(parentKey);
  if (parentMapped !== parentKey) return parentMapped;
  if (typeof method === 'object' && (method.name || method.label)) {
    return method.name ?? method.label ?? code;
  }
  return code;
}