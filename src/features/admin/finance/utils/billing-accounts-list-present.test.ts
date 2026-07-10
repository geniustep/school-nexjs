import { describe, expect, it } from 'vitest';
import {
  BILLING_ACCOUNTS_PAGE_SIZE,
  billingAccountsListHasActiveQuery,
  resolveBillingAccountsListEmptyVariant,
} from '@/features/admin/finance/utils/billing-accounts-list-present';

describe('billing-accounts-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(BILLING_ACCOUNTS_PAGE_SIZE).toBe(20);
  });

  it('detects active search and URL filters', () => {
    expect(billingAccountsListHasActiveQuery({})).toBe(false);
    expect(billingAccountsListHasActiveQuery({ accountKind: 'all' })).toBe(false);
    expect(billingAccountsListHasActiveQuery({ search: '  ' })).toBe(false);
    expect(billingAccountsListHasActiveQuery({ search: 'family' })).toBe(true);
    expect(billingAccountsListHasActiveQuery({ hasBalance: true })).toBe(true);
    expect(billingAccountsListHasActiveQuery({ hasOverdue: true })).toBe(true);
    expect(billingAccountsListHasActiveQuery({ accountKind: 'family' })).toBe(true);
    expect(billingAccountsListHasActiveQuery({ academicYearId: '3' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveBillingAccountsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveBillingAccountsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });
});
