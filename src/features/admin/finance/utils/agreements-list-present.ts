/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Presentation helpers for Agreements list chrome.
 * Does not change agreement amendments, billing party transition, or detail mutations.
 */

export const AGREEMENTS_PAGE_SIZE = 20;

export type AgreementsListEmptyVariant = 'no-data' | 'no-match';

export type AgreementsActiveQueryInput = {
  search?: string;
  stateFilter?: string;
  yearId?: string;
  dateFrom?: string;
  dateTo?: string;
  billingPartnerId?: string;
};

export function agreementsListHasActiveQuery(options: AgreementsActiveQueryInput): boolean {
  return !!(
    options.search?.trim() ||
    options.stateFilter ||
    options.yearId ||
    options.dateFrom ||
    options.dateTo ||
    options.billingPartnerId?.trim()
  );
}

export function resolveAgreementsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): AgreementsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatAgreementListDate(
  value: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDate(value) || emptyLabel;
}

export function formatAgreementListNumber(
  row: { number?: string | null; name?: string | null; id: number },
): string {
  return row.number ?? row.name ?? `#${row.id}`;
}
