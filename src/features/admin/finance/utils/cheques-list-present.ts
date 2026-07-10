/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import {
  chequeQuickFilterLabelKey,
  isChequeQuickFilter,
  type ChequeQuickFilter,
} from '@/features/admin/finance/finance-filter-contracts';

export const CHEQUES_PAGE_SIZE = 20;

export type ChequesListEmptyVariant = 'no-data' | 'no-match';

export type ChequesActiveQueryInput = {
  quick?: string;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  studentId?: string;
  billingPartnerId?: string;
};

export function resolveChequeQuickFilter(quick: string | null | undefined): ChequeQuickFilter | '' {
  return isChequeQuickFilter(quick) ? quick : '';
}

export function chequesListHasActiveQuery(options: ChequesActiveQueryInput): boolean {
  const quick = resolveChequeQuickFilter(options.quick);
  return !!(
    options.search?.trim() ||
    options.dueFrom ||
    options.dueTo ||
    options.studentId?.trim() ||
    options.billingPartnerId?.trim() ||
    (quick && quick !== 'all')
  );
}

export function resolveChequesListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): ChequesListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function chequeQuickFilterChipLabelKey(quick: ChequeQuickFilter | ''): string | null {
  if (!quick || quick === 'all') return null;
  return chequeQuickFilterLabelKey(quick);
}

export function formatChequeListDate(
  value: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDate(value) || emptyLabel;
}

/** List presentation only — does not change lifecycle transition eligibility. */
export function resolveChequeListLifecycleState(
  lifecycleState?: string | null,
  state?: string | null,
): string {
  const lifecycle = lifecycleState?.trim();
  if (lifecycle) return lifecycle;
  const fallback = state?.trim();
  return fallback || 'received';
}

/** List presentation only — maturity badge input, not transition logic. */
export function resolveChequeListMaturityStatus(
  maturityStatus?: string | null,
): string | null {
  const value = maturityStatus?.trim();
  return value || null;
}

export function chequeListLifecycleTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'cleared':
      return 'green';
    case 'deposited':
    case 'received':
      return 'amber';
    case 'bounced':
    case 'rejected':
    case 'cancelled':
    case 'returned_to_payer':
      return 'red';
    default:
      return 'slate';
  }
}
