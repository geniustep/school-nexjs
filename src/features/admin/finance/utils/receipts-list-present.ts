/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

export const RECEIPTS_PAGE_SIZE = 20;

export type ReceiptsListEmptyVariant = 'no-data' | 'no-match';

export type ReceiptsActiveQueryInput = {
  search?: string;
  studentId?: string;
  involvedStudentId?: string;
  payerId?: string;
  billingPartnerId?: string;
  collectionId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  state?: string;
};

export function receiptsListHasActiveQuery(options: ReceiptsActiveQueryInput): boolean {
  return !!(
    options.search?.trim() ||
    options.studentId?.trim() ||
    options.involvedStudentId?.trim() ||
    options.payerId?.trim() ||
    options.billingPartnerId?.trim() ||
    options.collectionId?.trim() ||
    options.dateFrom ||
    options.dateTo ||
    options.paymentMethod ||
    options.state
  );
}

export function resolveReceiptsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): ReceiptsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatReceiptListDateTime(
  value: string | null | undefined,
  formatDateTime: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDateTime(value) || emptyLabel;
}
