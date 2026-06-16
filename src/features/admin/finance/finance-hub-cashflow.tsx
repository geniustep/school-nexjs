'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { financeDeepLinkHref } from '@/features/admin/finance/finance-deep-links';
import { FinanceHubSection } from '@/features/admin/finance/finance-hub-header';
import { formatFinancePlural } from '@/features/admin/finance/finance-hub-plural';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { resolveFinanceCurrency } from '@/lib/i18n/format-money';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview } from '@/types/finance';

export function FinanceHubCashflow({
  overviewData,
  currency,
}: {
  overviewData: AdminFinanceOverview | null;
  currency?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const resolvedCurrency = resolveFinanceCurrency(currency);
  const overview = normalizeFinanceOverview(overviewData);
  const attention = overview?.attention;
  const totals = overview?.totals;

  const items = useMemo(
    () =>
      [
        {
          key: 'due_7',
          label: t('admin.finance.hub.cashflowDue7Days'),
          count: attention?.due_next_7_days_installments?.count ?? 0,
          countKind: 'installment' as const,
          amount: attention?.due_next_7_days_installments?.amount,
          href: financeDeepLinkHref('installmentsDueNext7Days'),
          actionKey: 'admin.finance.hub.cashflowActionInstallments',
        },
        {
          key: 'due_30',
          label: t('admin.finance.hub.cashflowDue30Days'),
          count: attention?.due_next_30_days_installments?.count ?? 0,
          countKind: 'installment' as const,
          amount: attention?.due_next_30_days_installments?.amount,
          href: financeDeepLinkHref('installmentsDueNext30Days'),
          actionKey: 'admin.finance.hub.cashflowActionInstallments',
        },
        {
          key: 'cheques_due',
          label: t('admin.finance.hub.cashflowChequesDueSoon'),
          count: attention?.cheques_due_soon?.count ?? 0,
          countKind: 'cheque' as const,
          amount: attention?.cheques_due_soon?.amount,
          href: financeDeepLinkHref('chequesDueSoon'),
          actionKey: 'admin.finance.hub.cashflowActionCheques',
        },
        {
          key: 'overdue',
          label: t('admin.finance.hub.cashflowCurrentOverdue'),
          count:
            attention?.overdue_installments?.count ??
            totals?.overdue_installments_count ??
            totals?.overdue_installments ??
            0,
          countKind: 'overdueInstallment' as const,
          amount: attention?.overdue_installments?.amount ?? totals?.total_overdue,
          href: financeDeepLinkHref('overdueInstallments'),
          actionKey: 'admin.finance.hub.cashflowActionOverdue',
        },
      ].filter((item) => (item.count != null && item.count > 0) || (item.amount != null && item.amount > 0)),
    [attention, totals, t],
  );

  if (!items.length) {
    return (
      <FinanceHubSection title={t('admin.finance.hub.cashflowTitle')}>
        <p className="muted finance-hub-chart__empty">{t('admin.finance.hub.cashflowEmpty')}</p>
      </FinanceHubSection>
    );
  }

  return (
    <FinanceHubSection title={t('admin.finance.hub.cashflowTitle')}>
      <div className="finance-hub-cashflow-grid" data-count={Math.min(items.length, 4)}>
        {items.map((item) => (
          <Link key={item.key} href={item.href} className="card finance-hub-cashflow-card">
            <span className="finance-hub-cashflow-card__label muted">{item.label}</span>
            {item.amount != null ? (
              <strong className="finance-hub-cashflow-card__amount">
                <FinanceMoney amount={item.amount} currency={resolvedCurrency} />
              </strong>
            ) : null}
            {item.count != null && item.count > 0 ? (
              <span className="finance-hub-cashflow-card__count tiny muted">
                {formatFinancePlural(t, locale, item.countKind, item.count)}
              </span>
            ) : null}
            <span className="finance-hub-cashflow-card__action btn btn--ghost btn--sm">{t(item.actionKey)}</span>
          </Link>
        ))}
      </div>
    </FinanceHubSection>
  );
}
