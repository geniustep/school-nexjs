import { describe, expect, it } from 'vitest';
import {
  formatInstallmentListDate,
  INSTALLMENTS_PAGE_SIZE,
  installmentQuickFilterChipLabelKey,
  installmentsListHasActiveQuery,
  resolveInstallmentQuickFilter,
  resolveInstallmentsListEmptyVariant,
} from '@/features/admin/finance/utils/installments-list-present';

describe('installments-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(INSTALLMENTS_PAGE_SIZE).toBe(20);
  });

  it('resolves quick-filter presentation contract', () => {
    expect(resolveInstallmentQuickFilter('overdue_unpaid')).toBe('overdue_unpaid');
    expect(resolveInstallmentQuickFilter('bogus')).toBe('');
    expect(installmentQuickFilterChipLabelKey('overdue_unpaid')).toBe(
      'admin.finance.installments.quick.overdueUnpaid',
    );
    expect(installmentQuickFilterChipLabelKey('')).toBeNull();
  });

  it('detects active query including quick filters', () => {
    expect(installmentsListHasActiveQuery({})).toBe(false);
    expect(installmentsListHasActiveQuery({ quick: 'all' })).toBe(false);
    expect(installmentsListHasActiveQuery({ quick: 'due_today' })).toBe(true);
    expect(installmentsListHasActiveQuery({ search: 'ali' })).toBe(true);
    expect(installmentsListHasActiveQuery({ dueDateFrom: '2026-01-01' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveInstallmentsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveInstallmentsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats dates for list presentation only', () => {
    expect(formatInstallmentListDate(null, () => 'x', '—')).toBe('—');
    expect(formatInstallmentListDate('2026-07-01', (v) => `d:${v}`, '—')).toBe('d:2026-07-01');
  });
});
