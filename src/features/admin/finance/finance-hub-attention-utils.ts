import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import { rejectedChequeQuickHref, totalRejectedChequeCount } from '@/lib/utils/cheque-status';
import type { FinancePluralKind } from '@/features/admin/finance/finance-hub-plural';
import type { AdminFinanceOverview, FinanceInstallment } from '@/types/finance';

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

export function buildFinanceHubAttentionItems(input: {
  overview: AdminFinanceOverview | null;
  rejectedChequeCount: number | null;
  bouncedChequeCount: number | null;
  draftCollectionsCount: number | null;
  chequesDueSoonCount: number | null;
  chequesDueSoonAmount: number | null;
}): FinanceHubAttentionItem[] {
  const { overview } = input;
  const totals = overview?.totals;
  const cheques = overview?.cheques;
  const items: FinanceHubAttentionItem[] = [];

  const overdueCount = totals?.overdue_installments_count ?? totals?.overdue_installments ?? 0;
  if (overdueCount > 0) {
    const overdueRows = (overview?.overdue_installments ?? []) as FinanceInstallment[];
    items.push({
      key: 'overdue_installments',
      severity: 'critical',
      count: overdueCount,
      amount: sumOverdueInstallments(overdueRows) || totals?.total_overdue,
      href: '/admin/finance/installments?quick=overdue_unpaid',
      actionKey: 'admin.finance.hub.actionOverdueInstallments',
      pluralKind: 'overdueInstallment',
    });
  }

  const overdueCheques = cheques?.overdue ?? 0;
  if (overdueCheques > 0) {
    items.push({
      key: 'overdue_cheques',
      severity: 'critical',
      count: overdueCheques,
      amount: totals?.cheques_rejected_amount,
      href: '/admin/finance/cheques?quick=overdue',
      actionKey: 'admin.finance.hub.actionOverdueCheques',
      pluralKind: 'overdueCheque',
    });
  }

  const verifiedRejected = totalRejectedChequeCount(
    input.rejectedChequeCount,
    input.bouncedChequeCount,
  );
  const overviewRejected = totals?.cheques_rejected_count ?? cheques?.bounced ?? cheques?.rejected ?? 0;
  const rejectedMismatch =
    verifiedRejected !== overviewRejected &&
    input.rejectedChequeCount != null &&
    input.bouncedChequeCount != null;

  if (rejectedMismatch) {
    items.push({
      key: 'rejected_cheques_unverified',
      severity: 'warning',
      count: overviewRejected,
      actionKey: 'admin.finance.hub.actionReviewCheques',
      titleKey: 'admin.finance.hub.alertRejectedChequesUnverified',
    });
  } else if (verifiedRejected > 0) {
    items.push({
      key: 'rejected_cheques',
      severity: 'critical',
      count: verifiedRejected,
      amount: totals?.cheques_rejected_amount,
      href: rejectedChequeQuickHref(),
      actionKey: 'admin.finance.hub.actionRejectedCheques',
      pluralKind: 'rejectedCheque',
    });
  }

  if ((input.chequesDueSoonCount ?? 0) > 0) {
    items.push({
      key: 'cheques_due_soon',
      severity: 'warning',
      count: input.chequesDueSoonCount ?? 0,
      amount: input.chequesDueSoonAmount,
      href: '/admin/finance/cheques?quick=due_today',
      actionKey: 'admin.finance.hub.actionChequesDueSoon',
      pluralKind: 'chequeDueSoon',
    });
  }

  if ((input.draftCollectionsCount ?? 0) > 0) {
    items.push({
      key: 'draft_collections',
      severity: 'warning',
      count: input.draftCollectionsCount ?? 0,
      href: '/admin/finance/collections?state=draft',
      actionKey: 'admin.finance.hub.actionDraftCollections',
      pluralKind: 'draftCollection',
    });
  }

  if ((totals?.draft_agreements_count ?? 0) > 0) {
    items.push({
      key: 'draft_agreements',
      severity: 'info',
      count: totals?.draft_agreements_count ?? 0,
      href: '/admin/finance/agreements?state=draft',
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
      href: '/admin/finance/student-fees',
      actionKey: 'admin.finance.hub.actionUncovered',
      titleKey: 'admin.finance.hub.alertUncoveredAmount',
    });
  }

  return items;
}
