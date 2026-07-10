import { describe, expect, it } from 'vitest';
import {
  CREDIT_BALANCES_PAGE_SIZE,
  creditBalancesListHasActiveQuery,
  formatCreditBalanceAccountLabel,
  resolveCreditBalancesListEmptyVariant,
} from '@/features/admin/finance/utils/credit-balances-list-present';

describe('credit-balances-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(CREDIT_BALANCES_PAGE_SIZE).toBe(20);
  });

  it('detects active search and URL filters', () => {
    expect(creditBalancesListHasActiveQuery({})).toBe(false);
    expect(creditBalancesListHasActiveQuery({ search: '  ' })).toBe(false);
    expect(creditBalancesListHasActiveQuery({ search: 'payer' })).toBe(true);
    expect(creditBalancesListHasActiveQuery({ state: 'available' })).toBe(true);
    expect(creditBalancesListHasActiveQuery({ hasAvailableCredit: true })).toBe(true);
    expect(creditBalancesListHasActiveQuery({ billingPartnerId: '12' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveCreditBalancesListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveCreditBalancesListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
    expect(
      resolveCreditBalancesListEmptyVariant({
        hasActiveQuery: false,
        hasAvailableCreditOnly: true,
      }),
    ).toBe('no-match');
  });

  it('formats account/balance presentation labels', () => {
    expect(formatCreditBalanceAccountLabel('Family A', 9)).toBe('Family A');
    expect(formatCreditBalanceAccountLabel('  ', 9)).toBe('#9');
    expect(formatCreditBalanceAccountLabel(null, 42)).toBe('#42');
  });
});
