/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Presentation helpers for Collections list chrome.
 * Does not change allocation, wizard, reverse, or payment semantics.
 */

import { resolveCollectionPayerLabel } from '@/features/admin/finance/collection-payer-label';
import { truncateReference } from '@/features/admin/finance/collection-labels';
import { formatCollectionReference } from '@/features/admin/finance/collection-normalize';
import { collectionState } from '@/lib/utils/finance';
import type { PaymentCollection } from '@/types/finance';

export const COLLECTIONS_PAGE_SIZE = 20;

export type CollectionsListEmptyVariant = 'no-data' | 'no-match';

export type CollectionsActiveQueryInput = {
  search?: string;
  statusFilter?: string;
  methodFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  billingPartnerId?: string;
};

export function collectionsListHasActiveQuery(options: CollectionsActiveQueryInput): boolean {
  return !!(
    options.search?.trim() ||
    options.statusFilter ||
    options.methodFilter ||
    options.dateFrom ||
    options.dateTo ||
    options.studentId?.trim() ||
    options.billingPartnerId?.trim()
  );
}

export function resolveCollectionsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): CollectionsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function countCollectionsByState(rows: PaymentCollection[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const state = collectionState(row) || 'unknown';
    counts[state] = (counts[state] ?? 0) + 1;
  }
  return counts;
}

export function formatCollectionListDate(
  row: Pick<PaymentCollection, 'collection_date' | 'date'>,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  const raw = row.collection_date ?? row.date;
  if (!raw) return emptyLabel;
  return formatDate(raw) || emptyLabel;
}

export function formatCollectionListPayerLabel(
  row: PaymentCollection,
  unavailableLabel: string,
): string {
  return resolveCollectionPayerLabel(row, unavailableLabel);
}

export function resolveCollectionBillingAccountLabel(
  row: Pick<PaymentCollection, 'billing_partner' | 'billing_partner_name'>,
  fallback: string,
): string {
  const partnerName = row.billing_partner_name?.trim();
  if (partnerName) return partnerName;
  const refName =
    row.billing_partner && typeof row.billing_partner.name === 'string'
      ? row.billing_partner.name.trim()
      : '';
  return refName || fallback;
}

export function formatCollectionListReference(
  row: PaymentCollection,
  options?: { truncate?: boolean },
): string {
  const ref = formatCollectionReference(row);
  if (options?.truncate) return truncateReference(ref);
  return ref;
}
