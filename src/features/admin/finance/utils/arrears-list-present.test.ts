import { describe, expect, it } from 'vitest';
import {
  ARREARS_PAGE_SIZE,
  arrearsListHasActiveQuery,
  formatArrearsListDate,
  resolveArrearsFollowupTab,
  resolveArrearsListEmptyVariant,
} from '@/features/admin/finance/utils/arrears-list-present';

describe('arrears-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(ARREARS_PAGE_SIZE).toBe(20);
  });

  it('resolves tab/query state', () => {
    expect(resolveArrearsFollowupTab('')).toBe('all');
    expect(resolveArrearsFollowupTab('needs_followup')).toBe('needs_followup');
    expect(resolveArrearsFollowupTab('unknown')).toBe('all');
    expect(arrearsListHasActiveQuery({})).toBe(false);
    expect(arrearsListHasActiveQuery({ tab: 'all' })).toBe(false);
    expect(arrearsListHasActiveQuery({ tab: 'payment_promises' })).toBe(true);
    expect(arrearsListHasActiveQuery({ search: 'family' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveArrearsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveArrearsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats dates for list presentation only', () => {
    expect(formatArrearsListDate(undefined, () => 'x', '—')).toBe('—');
    expect(formatArrearsListDate('2026-07-10', (v) => `d:${v}`, '—')).toBe('d:2026-07-10');
  });
});
