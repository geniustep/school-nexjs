import { describe, expect, it } from 'vitest';
import {
  CHEQUES_PAGE_SIZE,
  chequeListLifecycleTone,
  chequeQuickFilterChipLabelKey,
  chequesListHasActiveQuery,
  formatChequeListDate,
  resolveChequeListLifecycleState,
  resolveChequeListMaturityStatus,
  resolveChequeQuickFilter,
  resolveChequesListEmptyVariant,
} from '@/features/admin/finance/utils/cheques-list-present';

describe('cheques-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(CHEQUES_PAGE_SIZE).toBe(20);
  });

  it('resolves quick-filter presentation state', () => {
    expect(resolveChequeQuickFilter('')).toBe('');
    expect(resolveChequeQuickFilter('overdue')).toBe('overdue');
    expect(resolveChequeQuickFilter('unknown')).toBe('');
    expect(chequeQuickFilterChipLabelKey('')).toBeNull();
    expect(chequeQuickFilterChipLabelKey('all')).toBeNull();
    expect(chequeQuickFilterChipLabelKey('due_today')).toBe('admin.finance.cheques.filters.dueToday');
    expect(chequesListHasActiveQuery({})).toBe(false);
    expect(chequesListHasActiveQuery({ quick: 'all' })).toBe(false);
    expect(chequesListHasActiveQuery({ quick: 'rejected' })).toBe(true);
    expect(chequesListHasActiveQuery({ search: 'CHK' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveChequesListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveChequesListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats dates for list presentation only', () => {
    expect(formatChequeListDate(undefined, () => 'x', '—')).toBe('—');
    expect(formatChequeListDate('2026-07-10', (v) => `d:${v}`, '—')).toBe('d:2026-07-10');
  });

  it('presents lifecycle label inputs and tones without testing transitions', () => {
    expect(resolveChequeListLifecycleState('deposited', 'received')).toBe('deposited');
    expect(resolveChequeListLifecycleState(null, 'cleared')).toBe('cleared');
    expect(resolveChequeListLifecycleState(null, null)).toBe('received');
    expect(resolveChequeListMaturityStatus('overdue')).toBe('overdue');
    expect(resolveChequeListMaturityStatus('  ')).toBeNull();
    expect(chequeListLifecycleTone('cleared')).toBe('green');
    expect(chequeListLifecycleTone('received')).toBe('amber');
    expect(chequeListLifecycleTone('rejected')).toBe('red');
  });
});
