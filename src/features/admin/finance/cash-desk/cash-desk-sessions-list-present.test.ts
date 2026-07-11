import { describe, expect, it } from 'vitest';
import {
  CASH_DESK_SESSIONS_PAGE_SIZE,
  cashDeskSessionsListHasActiveQuery,
  formatCashSessionListDateTime,
  resolveCashDeskSessionsListEmptyVariant,
} from '@/features/admin/finance/cash-desk/cash-desk-sessions-list-present';

describe('cash-desk-sessions-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(CASH_DESK_SESSIONS_PAGE_SIZE).toBe(20);
  });

  it('detects active filter state', () => {
    expect(cashDeskSessionsListHasActiveQuery({})).toBe(false);
    expect(cashDeskSessionsListHasActiveQuery({ state: '  ' })).toBe(false);
    expect(cashDeskSessionsListHasActiveQuery({ state: 'open' })).toBe(true);
    expect(cashDeskSessionsListHasActiveQuery({ journalId: '3' })).toBe(true);
    expect(cashDeskSessionsListHasActiveQuery({ cashierId: '9' })).toBe(true);
    expect(cashDeskSessionsListHasActiveQuery({ dateFrom: '2026-01-01' })).toBe(true);
    expect(cashDeskSessionsListHasActiveQuery({ dateTo: '2026-01-31' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveCashDeskSessionsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveCashDeskSessionsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats session datetime presentation only', () => {
    expect(formatCashSessionListDateTime(null, () => 'x', '—')).toBe('—');
    expect(formatCashSessionListDateTime(undefined, () => 'x', '—')).toBe('—');
    expect(
      formatCashSessionListDateTime('2026-07-10T10:00:00Z', (v) => `fmt:${v}`, '—'),
    ).toBe('fmt:2026-07-10T10:00:00Z');
  });
});
