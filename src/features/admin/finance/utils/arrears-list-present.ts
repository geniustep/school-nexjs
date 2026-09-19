/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import {
  isArrearsFollowupTab,
} from '@/features/admin/finance/arrears-filter-contracts';
import type {
  ArrearsFollowupListItem,
  ArrearsFollowupListResult,
  ArrearsFollowupTab,
} from '@/types/finance-arrears';

export const ARREARS_PAGE_SIZE = 20;

export function arrearsSupportsActionableContract(
  result: ArrearsFollowupListResult,
): boolean {
  const summary = result.summary;
  if (
    summary?.actionable_overdue_accounts_count != null ||
    summary?.total_actionable_overdue_amount != null ||
    summary?.total_pending_cheque_coverage_on_overdue != null
  ) {
    return true;
  }
  return result.items.some(
    (row) =>
      row.actionable_overdue_amount != null ||
      row.gross_overdue_amount != null ||
      row.pending_cheque_coverage_amount != null,
  );
}

export function arrearsActionableAmount(row: ArrearsFollowupListItem): number | undefined {
  return row.actionable_overdue_amount ?? row.total_overdue;
}

export function arrearsGrossAmount(row: ArrearsFollowupListItem): number | undefined {
  return row.gross_overdue_amount ?? row.total_overdue;
}

export function arrearsPendingCoverageAmount(
  row: ArrearsFollowupListItem,
): number | undefined {
  return row.pending_cheque_coverage_amount;
}

export type ArrearsListEmptyVariant = 'no-data' | 'no-match';

export type ArrearsActiveQueryInput = {
  tab?: string;
  search?: string;
};

export function resolveArrearsFollowupTab(tab: string | null | undefined): ArrearsFollowupTab {
  return isArrearsFollowupTab(tab) ? tab : 'all';
}

export function arrearsListHasActiveQuery(options: ArrearsActiveQueryInput): boolean {
  const tab = resolveArrearsFollowupTab(options.tab);
  return !!(options.search?.trim() || tab !== 'all');
}

export function resolveArrearsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): ArrearsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatArrearsListDate(
  value: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDate(value);
}
