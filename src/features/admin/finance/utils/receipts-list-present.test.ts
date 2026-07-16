import { describe, expect, it } from 'vitest';
import {
  RECEIPTS_PAGE_SIZE,
  formatReceiptListDateTime,
  receiptsListHasActiveQuery,
  resolveReceiptsListEmptyVariant,
} from '@/features/admin/finance/utils/receipts-list-present';

describe('receipts-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(RECEIPTS_PAGE_SIZE).toBe(20);
  });

  it('detects active query state', () => {
    expect(receiptsListHasActiveQuery({})).toBe(false);
    expect(receiptsListHasActiveQuery({ search: '  ' })).toBe(false);
    expect(receiptsListHasActiveQuery({ search: 'R-12' })).toBe(true);
    expect(receiptsListHasActiveQuery({ state: 'reversed' })).toBe(true);
    expect(receiptsListHasActiveQuery({ paymentMethod: 'cash' })).toBe(true);
    expect(receiptsListHasActiveQuery({ dateFrom: '2026-01-01' })).toBe(true);
    expect(receiptsListHasActiveQuery({ billingPartnerId: '9' })).toBe(true);
    expect(receiptsListHasActiveQuery({ involvedStudentId: '6858' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveReceiptsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveReceiptsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats issued-at for list presentation only', () => {
    expect(formatReceiptListDateTime(undefined, () => 'x', '—')).toBe('—');
    expect(formatReceiptListDateTime('2026-07-10T10:00:00Z', (v) => `dt:${v}`, '—')).toBe(
      'dt:2026-07-10T10:00:00Z',
    );
  });
});
