/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

export const CREDIT_BALANCES_PAGE_SIZE = 20;

export type CreditBalancesListEmptyVariant = 'no-data' | 'no-match';

export type CreditBalancesActiveQueryInput = {
  search?: string;
  billingPartnerId?: string;
  state?: string;
  hasAvailableCredit?: boolean;
};

export function creditBalancesListHasActiveQuery(
  options: CreditBalancesActiveQueryInput,
): boolean {
  return !!(
    options.search?.trim() ||
    options.billingPartnerId?.trim() ||
    options.state ||
    options.hasAvailableCredit
  );
}

export function resolveCreditBalancesListEmptyVariant(options: {
  hasActiveQuery: boolean;
  hasAvailableCreditOnly?: boolean;
}): CreditBalancesListEmptyVariant {
  if (options.hasAvailableCreditOnly || options.hasActiveQuery) return 'no-match';
  return 'no-data';
}

export function formatCreditBalanceAccountLabel(
  displayName: string | null | undefined,
  billingPartnerId: number | string,
  fallbackPrefix = '#',
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  return `${fallbackPrefix}${billingPartnerId}`;
}
