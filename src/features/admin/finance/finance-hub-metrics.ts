import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import { collectionState } from '@/lib/utils/finance';
import type { FinanceOverviewTotals, PaymentCollection } from '@/types/finance';

const EXCLUDED_COLLECTION_STATES = new Set(['draft', 'cancelled', 'reversed', 'rejected']);

/** Amount settled on receivables (allocated to installments) from overview totals. */
export function resolveOverviewSettledAmount(totals?: FinanceOverviewTotals | null): number | null {
  if (!totals) return null;
  return normalizeMoneyValue(totals.confirmed_paid ?? totals.total_paid ?? totals.total_collected);
}

export function computeOverviewCollectionRate(totals?: FinanceOverviewTotals | null): number | null {
  if (!totals) return null;
  const due = normalizeMoneyValue(totals.total_due);
  const settled = resolveOverviewSettledAmount(totals);
  if (due == null || settled == null || due <= 0) return null;
  return Math.min(100, Math.round((settled / due) * 1000) / 10);
}

export function isConfirmedCollection(row: { state?: string; status?: string }): boolean {
  return collectionState(row) === 'confirmed';
}

export function filterConfirmedCollections<T extends { state?: string; status?: string }>(
  rows: T[],
): T[] {
  return rows.filter((row) => {
    const state = String(collectionState(row)).toLowerCase();
    return state === 'confirmed' && !EXCLUDED_COLLECTION_STATES.has(state);
  });
}

export function collectionRowAmount(row: PaymentCollection): number | null {
  const extended = row as PaymentCollection & { confirmed_amount?: number };
  return normalizeMoneyValue(row.amount ?? row.total_amount ?? extended.confirmed_amount);
}

export function sumConfirmedCollectionAmount(rows: PaymentCollection[]): number {
  return filterConfirmedCollections(rows).reduce((sum, row) => {
    const amount = collectionRowAmount(row);
    return sum + (amount ?? 0);
  }, 0);
}

export function isPaginatedCollectionTotalIncomplete(
  rowCount: number,
  pagination?: { total?: number; has_next?: boolean } | null,
): boolean {
  if (!pagination) return false;
  const total = Number(pagination.total ?? 0);
  if (total <= 0) return false;
  if (pagination.has_next) return true;
  return rowCount < total;
}
