/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import type { BillingAccountKindFilter } from '@/features/admin/finance/billing-account-kind';

export const BILLING_ACCOUNTS_PAGE_SIZE = 20;

export type BillingAccountsListEmptyVariant = 'no-data' | 'no-match';

export type BillingAccountsActiveQueryInput = {
  search?: string;
  academicYearId?: string;
  classId?: string;
  levelId?: string;
  hasBalance?: boolean;
  hasOverdue?: boolean;
  accountKind?: BillingAccountKindFilter;
};

export function billingAccountsListHasActiveQuery(
  options: BillingAccountsActiveQueryInput,
): boolean {
  return !!(
    options.search?.trim() ||
    options.academicYearId ||
    options.classId ||
    options.levelId ||
    options.hasBalance ||
    options.hasOverdue ||
    (options.accountKind && options.accountKind !== 'all')
  );
}

export function resolveBillingAccountsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): BillingAccountsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}
