import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import { normalizePaymentMethodCode } from '@/lib/utils/finance-normalize';
import { bucketCollectionDate, collectionTrendBucketMode, periodSpanDays } from '@/features/admin/finance/finance-hub-period';
import type { AdminFinanceOverview, PaymentCollection } from '@/types/finance';

export type TrendPoint = { key: string; amount: number; label: string };

export type ReceivableSlice = { key: string; amount: number };

export type MethodSlice = { code: string; amount: number; label?: string };

function collectionDate(row: PaymentCollection): string | null {
  const extended = row as PaymentCollection & { payment_date?: string; method?: string; confirmed_amount?: number };
  const raw = row.collection_date ?? row.date ?? extended.payment_date;
  if (!raw) return null;
  return String(raw).slice(0, 10);
}

function collectionAmount(row: PaymentCollection): number | null {
  const extended = row as PaymentCollection & { confirmed_amount?: number };
  return normalizeMoneyValue(row.amount ?? row.total_amount ?? extended.confirmed_amount);
}

function collectionMethod(row: PaymentCollection): string {
  const extended = row as PaymentCollection & { method?: string };
  return normalizePaymentMethodCode(row.payment_method ?? extended.method);
}

export function buildCollectionTrend(
  rows: PaymentCollection[],
  dateFrom?: string,
  dateTo?: string,
): TrendPoint[] {
  const span = periodSpanDays(dateFrom, dateTo);
  const mode = collectionTrendBucketMode(span);
  const buckets = new Map<string, number>();

  for (const row of rows) {
    const date = collectionDate(row);
    if (!date) continue;
    if (dateFrom && date < dateFrom) continue;
    if (dateTo && date > dateTo) continue;
    const amount = collectionAmount(row);
    if (amount == null) continue;
    const key = bucketCollectionDate(date, mode);
    buckets.set(key, (buckets.get(key) ?? 0) + amount);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({ key, amount, label: key }));
}

export function buildReceivableStatusSlices(
  overview: AdminFinanceOverview | null,
): ReceivableSlice[] {
  const totals = overview?.totals;
  if (!totals) return [];

  const collected = normalizeMoneyValue(totals.total_collected ?? totals.confirmed_paid ?? totals.total_paid);
  const remaining = normalizeMoneyValue(totals.total_remaining ?? totals.remaining_amount);
  const overdue = normalizeMoneyValue(totals.total_overdue ?? totals.overdue_amount);

  const slices: ReceivableSlice[] = [];
  if (collected != null && collected > 0) slices.push({ key: 'paid', amount: collected });

  if (remaining != null && overdue != null) {
    const currentDue = Math.max(remaining - overdue, 0);
    if (currentDue > 0) slices.push({ key: 'due', amount: currentDue });
    if (overdue > 0) slices.push({ key: 'overdue', amount: overdue });
  } else if (remaining != null && remaining > 0) {
    slices.push({ key: 'due', amount: remaining });
  }

  return slices;
}

export function buildPaymentMethodSlices(rows: PaymentCollection[]): MethodSlice[] {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const code = collectionMethod(row);
    if (!code) continue;
    const amount = collectionAmount(row);
    if (amount == null) continue;
    buckets.set(code, (buckets.get(code) ?? 0) + amount);
  }
  return [...buckets.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([code, amount]) => ({ code, amount }));
}

export function computeCollectionRate(
  overview: AdminFinanceOverview | null,
): number | null {
  const totals = overview?.totals;
  if (!totals) return null;
  const due = normalizeMoneyValue(totals.total_due);
  const collected = normalizeMoneyValue(totals.total_collected ?? totals.confirmed_paid ?? totals.total_paid);
  if (due == null || collected == null || due <= 0) return null;
  return Math.min(100, Math.round((collected / due) * 1000) / 10);
}

export function sumInstallmentRemaining(
  rows: Array<{ due_date?: string | null; remaining_amount?: number | null }>,
  fromDate: string,
  toDate: string,
): { count: number; amount: number } {
  let count = 0;
  let amount = 0;
  for (const row of rows) {
    const due = row.due_date?.slice(0, 10);
    if (!due || due < fromDate || due > toDate) continue;
    const remaining = normalizeMoneyValue(row.remaining_amount);
    if (remaining == null || remaining <= 0) continue;
    count += 1;
    amount += remaining;
  }
  return { count, amount };
}
