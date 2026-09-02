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
export const INSTALLMENTS_MAX_SELECTED_SERVICES = 50;

export type InstallmentsListEmptyVariant = 'no-data' | 'no-match';

export function parseInstallmentServiceIds(value: string | null | undefined): number[] {
  if (!value) return [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const token of value.split(',')) {
    const normalized = token.trim();
    if (!/^\d+$/.test(normalized)) continue;
    const id = Number(normalized);
    if (id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length === INSTALLMENTS_MAX_SELECTED_SERVICES) break;
  }
  return ids;
}

export function serializeInstallmentServiceIds(ids: number[]): string {
  return parseInstallmentServiceIds(ids.join(',')).join(',');
}

export function toggleInstallmentServiceId(current: string, serviceId: number): string {
  const ids = parseInstallmentServiceIds(current);
  const next = ids.includes(serviceId)
    ? ids.filter((id) => id !== serviceId)
    : [...ids, serviceId];
  return serializeInstallmentServiceIds(next);
}

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
