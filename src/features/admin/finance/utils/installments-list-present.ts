/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import {
  installmentQuickFilterLabelKey,
  isInstallmentQuickFilter,
  type InstallmentQuickFilter,
} from '@/features/admin/finance/finance-filter-contracts';

export const INSTALLMENTS_PAGE_SIZE = 20;

export type InstallmentsListEmptyVariant = 'no-data' | 'no-match';

export type InstallmentsActiveQueryInput = {
  quick?: string;
  search?: string;
  academicYearId?: string;
  classId?: string;
  levelId?: string;
  studentId?: string;
  billingPartnerId?: string;
  serviceId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
};

export function resolveInstallmentQuickFilter(
  quick: string | null | undefined,
): InstallmentQuickFilter | '' {
  return isInstallmentQuickFilter(quick) ? quick : '';
}

export function installmentsListHasActiveQuery(options: InstallmentsActiveQueryInput): boolean {
  const quick = resolveInstallmentQuickFilter(options.quick);
  return !!(
    options.search?.trim() ||
    options.academicYearId ||
    options.classId ||
    options.levelId ||
    options.studentId ||
    options.billingPartnerId ||
    options.serviceId ||
    options.dueDateFrom ||
    options.dueDateTo ||
    (quick && quick !== 'all')
  );
}

export function resolveInstallmentsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): InstallmentsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function installmentQuickFilterChipLabelKey(
  quick: InstallmentQuickFilter | '',
): string | null {
  if (!quick || quick === 'all') return null;
  return installmentQuickFilterLabelKey(quick);
}

export function formatInstallmentListDate(
  value: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDate(value);
}
