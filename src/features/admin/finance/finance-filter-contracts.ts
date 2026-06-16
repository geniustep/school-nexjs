/** Odoo finance quick-filter contract (school db, module 18.0.1.0.101). */

export const INSTALLMENT_QUICK_FILTERS = [
  'overdue_unpaid',
  'due_today',
  'due_next_7_days',
  'due_next_30_days',
  'has_balance',
  'all',
] as const;

export type InstallmentQuickFilter = (typeof INSTALLMENT_QUICK_FILTERS)[number];

export const CHEQUE_QUICK_FILTERS = [
  'due_today',
  'due_next_7_days',
  'overdue',
  'rejected',
  'collected',
  'all',
] as const;

export type ChequeQuickFilter = (typeof CHEQUE_QUICK_FILTERS)[number];

export function isInstallmentQuickFilter(value: string | null | undefined): value is InstallmentQuickFilter {
  return !!value && (INSTALLMENT_QUICK_FILTERS as readonly string[]).includes(value);
}

export function isChequeQuickFilter(value: string | null | undefined): value is ChequeQuickFilter {
  return !!value && (CHEQUE_QUICK_FILTERS as readonly string[]).includes(value);
}

export function installmentQuickFilterLabelKey(quick: InstallmentQuickFilter): string {
  switch (quick) {
    case 'overdue_unpaid':
      return 'admin.finance.installments.quick.overdueUnpaid';
    case 'due_today':
      return 'admin.finance.installments.quick.dueToday';
    case 'due_next_7_days':
      return 'admin.finance.installments.quick.dueSevenDays';
    case 'due_next_30_days':
      return 'admin.finance.installments.quick.dueThirtyDays';
    case 'has_balance':
      return 'admin.finance.installments.quick.hasBalance';
    case 'all':
      return 'admin.finance.installments.quick.all';
    default:
      return 'admin.finance.installments.quick.all';
  }
}

export function installmentQuickFilterTitleKey(quick: InstallmentQuickFilter): string | null {
  switch (quick) {
    case 'overdue_unpaid':
      return 'admin.finance.installments.titleOverdueUnpaid';
    case 'due_today':
      return 'admin.finance.installments.titleDueToday';
    case 'due_next_7_days':
      return 'admin.finance.installments.titleDueSevenDays';
    case 'due_next_30_days':
      return 'admin.finance.installments.titleDueThirtyDays';
    case 'has_balance':
      return 'admin.finance.installments.titleHasBalance';
    default:
      return null;
  }
}

export function chequeQuickFilterLabelKey(quick: ChequeQuickFilter): string {
  switch (quick) {
    case 'due_today':
      return 'admin.finance.cheques.filters.dueToday';
    case 'due_next_7_days':
      return 'admin.finance.cheques.filters.dueNextSevenDays';
    case 'overdue':
      return 'admin.finance.cheques.filters.overdue';
    case 'rejected':
      return 'admin.finance.cheques.filters.rejected';
    case 'collected':
      return 'admin.finance.cheques.filters.collected';
    case 'all':
      return 'admin.finance.cheques.filters.all';
    default:
      return 'admin.finance.cheques.filters.all';
  }
}

export function chequeQuickFilterTitleKey(quick: ChequeQuickFilter): string | null {
  switch (quick) {
    case 'due_today':
      return 'admin.finance.cheques.titleDueToday';
    case 'due_next_7_days':
      return 'admin.finance.cheques.titleDueNextSevenDays';
    case 'overdue':
      return 'admin.finance.cheques.titleOverdue';
    case 'rejected':
      return 'admin.finance.cheques.titleRejected';
    case 'collected':
      return 'admin.finance.cheques.titleCollected';
    default:
      return null;
  }
}

export function chequeQuickFilterDescKey(quick: ChequeQuickFilter): string | null {
  switch (quick) {
    case 'due_today':
      return 'admin.finance.cheques.descDueToday';
    case 'due_next_7_days':
      return 'admin.finance.cheques.descDueNextSevenDays';
    case 'overdue':
      return 'admin.finance.cheques.descOverdue';
    case 'rejected':
      return 'admin.finance.cheques.descRejected';
    case 'collected':
      return 'admin.finance.cheques.descCollected';
    default:
      return null;
  }
}
