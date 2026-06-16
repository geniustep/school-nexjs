import type { InstallmentQuickFilter, ChequeQuickFilter } from '@/features/admin/finance/finance-filter-contracts';

export type FinanceDeepLinkScope = 'school' | 'student';

export type FinanceDeepLinkDef = {
  path: string;
  query?: Record<string, string>;
  scope: FinanceDeepLinkScope;
  titleKey?: string;
  descriptionKey?: string;
  actionKey?: string;
  pluralKind?: string;
};

function href(path: string, query?: Record<string, string>): string {
  if (!query || !Object.keys(query).length) return path;
  const sp = new URLSearchParams(query);
  return `${path}?${sp.toString()}`;
}

export const FINANCE_DEEP_LINKS = {
  financeHub: { path: '/admin/finance', scope: 'school' as const },

  installmentsAll: {
    path: '/admin/finance/installments',
    scope: 'school' as const,
    titleKey: 'admin.finance.installments.title',
    descriptionKey: 'admin.finance.installments.subtitle',
  },

  overdueInstallments: {
    path: '/admin/finance/installments',
    query: { quick: 'overdue_unpaid' satisfies InstallmentQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.installments.titleOverdueUnpaid',
    descriptionKey: 'admin.finance.installments.descOverdueUnpaid',
    actionKey: 'admin.finance.hub.actionOverdueInstallments',
    pluralKind: 'overdueInstallment',
  },

  installmentsDueNext7Days: {
    path: '/admin/finance/installments',
    query: { quick: 'due_next_7_days' satisfies InstallmentQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.installments.titleDueSevenDays',
    actionKey: 'admin.finance.hub.cashflowActionInstallments',
    pluralKind: 'installment',
  },

  installmentsDueNext30Days: {
    path: '/admin/finance/installments',
    query: { quick: 'due_next_30_days' satisfies InstallmentQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.installments.titleDueThirtyDays',
    actionKey: 'admin.finance.hub.cashflowActionInstallments',
    pluralKind: 'installment',
  },

  installmentsHasBalance: {
    path: '/admin/finance/installments',
    query: { quick: 'has_balance' satisfies InstallmentQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.installments.titleHasBalance',
  },

  chequesAll: {
    path: '/admin/finance/cheques',
    scope: 'school' as const,
    titleKey: 'admin.finance.cheques.title',
    descriptionKey: 'admin.finance.cheques.subtitle',
  },

  chequesDueSoon: {
    path: '/admin/finance/cheques',
    query: { quick: 'due_next_7_days' satisfies ChequeQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.cheques.titleDueNextSevenDays',
    descriptionKey: 'admin.finance.cheques.descDueNextSevenDays',
    actionKey: 'admin.finance.hub.actionChequesDueSoon',
    pluralKind: 'chequeDueSoon',
  },

  chequesDueToday: {
    path: '/admin/finance/cheques',
    query: { quick: 'due_today' satisfies ChequeQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.cheques.titleDueToday',
    descriptionKey: 'admin.finance.cheques.descDueToday',
  },

  chequesOverdue: {
    path: '/admin/finance/cheques',
    query: { quick: 'overdue' satisfies ChequeQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.cheques.titleOverdue',
    descriptionKey: 'admin.finance.cheques.descOverdue',
    actionKey: 'admin.finance.hub.actionOverdueCheques',
    pluralKind: 'overdueCheque',
  },

  chequesRejected: {
    path: '/admin/finance/cheques',
    query: { quick: 'rejected' satisfies ChequeQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.cheques.titleRejected',
    descriptionKey: 'admin.finance.cheques.descRejected',
    actionKey: 'admin.finance.hub.actionRejectedCheques',
    pluralKind: 'rejectedCheque',
  },

  chequesCollected: {
    path: '/admin/finance/cheques',
    query: { quick: 'collected' satisfies ChequeQuickFilter },
    scope: 'school' as const,
    titleKey: 'admin.finance.cheques.titleCollected',
    descriptionKey: 'admin.finance.cheques.descCollected',
  },

  draftCollections: {
    path: '/admin/finance/collections',
    query: { state: 'draft' },
    scope: 'school' as const,
    actionKey: 'admin.finance.hub.actionDraftCollections',
    pluralKind: 'draftCollection',
  },

  confirmedCollections: {
    path: '/admin/finance/collections',
    query: { state: 'confirmed' },
    scope: 'school' as const,
  },

  collectionsAll: {
    path: '/admin/finance/collections',
    scope: 'school' as const,
  },

  draftAgreements: {
    path: '/admin/finance/agreements',
    query: { state: 'draft' },
    scope: 'school' as const,
    actionKey: 'admin.finance.hub.actionDraftAgreements',
    pluralKind: 'draftAgreement',
  },

  agreementsAll: {
    path: '/admin/finance/agreements',
    scope: 'school' as const,
  },

  studentFees: {
    path: '/admin/finance/student-fees',
    scope: 'school' as const,
    actionKey: 'admin.finance.hub.actionUncovered',
  },

  feePlans: {
    path: '/admin/finance/fee-plans',
    scope: 'school' as const,
  },

  feeTypes: {
    path: '/admin/finance/fee-plans',
    query: { catalog: 'open' },
    scope: 'school' as const,
  },

  services: {
    path: '/admin/finance/services',
    scope: 'school' as const,
  },
} as const satisfies Record<string, FinanceDeepLinkDef>;

export function financeDeepLinkHref(key: keyof typeof FINANCE_DEEP_LINKS): string {
  const def = FINANCE_DEEP_LINKS[key];
  return href(def.path, 'query' in def ? def.query : undefined);
}

export function financeDeepLinkHrefWithQuery(
  key: keyof typeof FINANCE_DEEP_LINKS,
  extra?: Record<string, string>,
): string {
  const def = FINANCE_DEEP_LINKS[key];
  const baseQuery = 'query' in def ? def.query : undefined;
  return href(def.path, { ...baseQuery, ...extra });
}
