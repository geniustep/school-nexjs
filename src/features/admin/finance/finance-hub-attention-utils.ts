import { FINANCE_DEEP_LINKS, financeDeepLinkHref } from '@/features/admin/finance/finance-deep-links';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { FinancePluralKind } from '@/features/admin/finance/finance-hub-plural';
import type { AdminFinanceOverview, FinanceAttentionMetric, FinanceInstallment } from '@/types/finance';

export type FinanceHubAttentionSeverity = 'critical' | 'warning' | 'info';

export type FinanceHubAttentionItem = {
  key: string;
  severity: FinanceHubAttentionSeverity;
  count: number;
  amount?: number | null;
  href?: string;
  actionKey: string;
  pluralKind?: FinancePluralKind;
  titleKey?: string;
};

function sumOverdueInstallments(rows: FinanceInstallment[] | undefined): number {
  if (!rows?.length) return 0;
  return rows.reduce((sum, row) => {
    const remaining = normalizeMoneyValue(row.remaining_amount);
    return sum + (remaining ?? 0);
  }, 0);
}

function pushAttentionMetric(
  items: FinanceHubAttentionItem[],
  key: string,
  metric: FinanceAttentionMetric | undefined,
  config: {
    severity: FinanceHubAttentionSeverity;
    hrefKey: keyof typeof FINANCE_DEEP_LINKS;
    actionKey: string;
    pluralKind?: FinancePluralKind;
    titleKey?: string;
  },
) {
  const count = metric?.count ?? 0;
  if (count <= 0) return;
  items.push({
    key,
    severity: config.severity,
    count,
    amount: metric?.amount ?? null,
    href: financeDeepLinkHref(config.hrefKey),
    actionKey: config.actionKey,
    pluralKind: config.pluralKind,
    titleKey: config.titleKey,
  });
}

export function buildFinanceHubAttentionItems(input: {
  overview: AdminFinanceOverview | null;
  rejectedChequeCount?: number | null;
  bouncedChequeCount?: number | null;
}): FinanceHubAttentionItem[] {
  const { overview } = input;
  const totals = overview?.totals;
  const attention = overview?.attention;
  const items: FinanceHubAttentionItem[] = [];

  const overdueMetric = attention?.overdue_installments;
  const overdueCount =
    overdueMetric?.count ?? totals?.overdue_installments_count ?? totals?.overdue_installments ?? 0;

  if (overdueCount > 0) {
    const overdueRows = (overview?.overdue_installments ?? []) as FinanceInstallment[];
    items.push({
      key: 'overdue_installments',
      severity: 'critical',
      count: overdueCount,
      amount:
        overdueMetric?.amount ??
        (sumOverdueInstallments(overdueRows) || (totals?.total_overdue ?? null)),
      href: financeDeepLinkHref('overdueInstallments'),
      actionKey: 'admin.finance.hub.actionOverdueInstallments',
      pluralKind: 'overdueInstallment',
    });
  }

  pushAttentionMetric(items, 'cheques_rejected', attention?.cheques_rejected, {
    severity: 'critical',
    hrefKey: 'chequesRejected',
    actionKey: 'admin.finance.hub.actionRejectedCheques',
    pluralKind: 'rejectedCheque',
  });

  pushAttentionMetric(items, 'cheques_due_soon', attention?.cheques_due_soon, {
    severity: 'warning',
    hrefKey: 'chequesDueSoon',
    actionKey: 'admin.finance.hub.actionChequesDueSoon',
    pluralKind: 'chequeDueSoon',
  });

  pushAttentionMetric(items, 'draft_collections', attention?.draft_collections, {
    severity: 'warning',
    hrefKey: 'draftCollections',
    actionKey: 'admin.finance.hub.actionDraftCollections',
    pluralKind: 'draftCollection',
  });

  if ((totals?.draft_agreements_count ?? 0) > 0) {
    items.push({
      key: 'draft_agreements',
      severity: 'info',
      count: totals?.draft_agreements_count ?? 0,
      href: financeDeepLinkHref('draftAgreements'),
      actionKey: 'admin.finance.hub.actionDraftAgreements',
      pluralKind: 'draftAgreement',
    });
  }

  const uncovered = normalizeMoneyValue(totals?.uncovered_amount);
  if (uncovered != null && uncovered > 0) {
    items.push({
      key: 'uncovered_amount',
      severity: 'warning',
      count: totals?.students_with_balance ?? 0,
      amount: uncovered,
      href: financeDeepLinkHref('studentFees'),
      actionKey: 'admin.finance.hub.actionUncovered',
      titleKey: 'admin.finance.hub.alertUncoveredAmount',
    });
  }

  return items;
}

export function readAttentionMetric(
  overview: AdminFinanceOverview | null | undefined,
  key: keyof NonNullable<AdminFinanceOverview['attention']>,
): FinanceAttentionMetric | null {
  return overview?.attention?.[key] ?? null;
}
