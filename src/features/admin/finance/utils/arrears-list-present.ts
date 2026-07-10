/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import {
  isArrearsFollowupTab,
} from '@/features/admin/finance/arrears-filter-contracts';
import type { ArrearsFollowupTab } from '@/types/finance-arrears';

export const ARREARS_PAGE_SIZE = 20;

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
