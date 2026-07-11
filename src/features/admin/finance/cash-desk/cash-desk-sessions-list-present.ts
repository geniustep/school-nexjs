/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Presentation helpers for Cash Desk sessions list chrome.
 * Does not change open/close/reopen, difference approval, gate, or PDF semantics.
 */

export const CASH_DESK_SESSIONS_PAGE_SIZE = 20;

export type CashDeskSessionsListEmptyVariant = 'no-data' | 'no-match';

export type CashDeskSessionsActiveQueryInput = {
  state?: string;
  journalId?: string;
  cashierId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function cashDeskSessionsListHasActiveQuery(
  options: CashDeskSessionsActiveQueryInput,
): boolean {
  return !!(
    options.state?.trim() ||
    options.journalId?.trim() ||
    options.cashierId?.trim() ||
    options.dateFrom ||
    options.dateTo
  );
}

export function resolveCashDeskSessionsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): CashDeskSessionsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatCashSessionListDateTime(
  value: string | null | undefined,
  formatDateTime: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDateTime(value) || emptyLabel;
}
