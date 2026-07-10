import { describe, expect, it } from 'vitest';
import {
  COLLECTIONS_PAGE_SIZE,
  collectionsListHasActiveQuery,
  countCollectionsByState,
  formatCollectionListDate,
  formatCollectionListPayerLabel,
  formatCollectionListReference,
  resolveCollectionBillingAccountLabel,
  resolveCollectionsListEmptyVariant,
} from '@/features/admin/finance/utils/collections-list-present';
import type { PaymentCollection } from '@/types/finance';

describe('collections-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(COLLECTIONS_PAGE_SIZE).toBe(20);
  });

  it('detects active query and filter state', () => {
    expect(collectionsListHasActiveQuery({})).toBe(false);
    expect(collectionsListHasActiveQuery({ search: '  ' })).toBe(false);
    expect(collectionsListHasActiveQuery({ search: 'COL-1' })).toBe(true);
    expect(collectionsListHasActiveQuery({ statusFilter: 'draft' })).toBe(true);
    expect(collectionsListHasActiveQuery({ methodFilter: 'cash' })).toBe(true);
    expect(collectionsListHasActiveQuery({ dateFrom: '2026-01-01' })).toBe(true);
    expect(collectionsListHasActiveQuery({ studentId: '42' })).toBe(true);
    expect(collectionsListHasActiveQuery({ billingPartnerId: '9' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveCollectionsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveCollectionsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('counts collection states for summary presentation', () => {
    const rows = [
      { id: 1, state: 'confirmed' },
      { id: 2, state: 'draft' },
      { id: 3, status: 'confirmed' },
    ] as PaymentCollection[];
    expect(countCollectionsByState(rows)).toEqual({
      confirmed: 2,
      draft: 1,
    });
  });

  it('formats collection list date presentation only', () => {
    expect(
      formatCollectionListDate({ collection_date: undefined, date: undefined }, () => 'x', '—'),
    ).toBe('—');
    expect(
      formatCollectionListDate(
        { collection_date: '2026-07-10', date: undefined },
        (v) => `fmt:${v}`,
        '—',
      ),
    ).toBe('fmt:2026-07-10');
  });

  it('formats payer label without changing semantics', () => {
    expect(formatCollectionListPayerLabel({ payer_name: 'Parent A' } as PaymentCollection, '—')).toBe(
      'Parent A',
    );
  });

  it('resolves billing account label for list context', () => {
    expect(resolveCollectionBillingAccountLabel({}, '—')).toBe('—');
    expect(
      resolveCollectionBillingAccountLabel(
        { billing_partner_name: 'Family account' },
        '—',
      ),
    ).toBe('Family account');
    expect(
      resolveCollectionBillingAccountLabel(
        { billing_partner: { id: 1, name: 'Partner' } },
        '—',
      ),
    ).toBe('Partner');
  });

  it('formats reference for table presentation', () => {
    const row = { id: 7, reference: 'COL-2026-00007' } as PaymentCollection;
    expect(formatCollectionListReference(row)).toBe('COL-2026-00007');
    expect(formatCollectionListReference(row, { truncate: true }).length).toBeLessThanOrEqual(
      'COL-2026-00007'.length,
    );
  });
});
