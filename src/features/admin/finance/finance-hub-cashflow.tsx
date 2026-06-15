'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceHubSection } from '@/features/admin/finance/finance-hub-header';
import { sumInstallmentRemaining } from '@/features/admin/finance/finance-hub-chart-utils';
import { isoDate } from '@/features/admin/finance/finance-hub-period';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { normalizeFinanceOverview, parseFinanceList } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview, FinanceCheque, FinanceInstallment } from '@/types/finance';

function addDaysIso(base: string, days: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function FinanceHubCashflow({
  overviewData,
  currency,
  asOfDate,
}: {
  overviewData: AdminFinanceOverview | null;
  currency?: string;
  asOfDate?: string;
}) {
  const t = useT();
  const overview = normalizeFinanceOverview(overviewData);
  const totals = overview?.totals;
  const upcoming = (overview?.upcoming_installments ?? []) as FinanceInstallment[];
  const today = (asOfDate ?? overview?.as_of_date ?? isoDate(new Date())).slice(0, 10);

  const due7 = useMemo(
    () => sumInstallmentRemaining(upcoming, today, addDaysIso(today, 7)),
    [upcoming, today],
  );
  const due30 = useMemo(
    () => sumInstallmentRemaining(upcoming, today, addDaysIso(today, 30)),
    [upcoming, today],
  );

  const chequesState = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, {
    page: 1,
    page_size: 100,
    quick: 'due_today',
  });
  const chequesRows = parseFinanceList<FinanceCheque>(chequesState.data);
  const chequesDueSoonAmount = chequesRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const chequesDueSoonCount = chequesState.meta?.pagination?.total ?? chequesRows.length;

  const items = [
    {
      key: 'due_7',
      label: t('admin.finance.hub.cashflowDue7Days'),
      count: due7.count,
      amount: due7.amount,
      href: '/admin/finance/installments?quick=due_seven_days',
    },
    {
      key: 'due_30',
      label: t('admin.finance.hub.cashflowDue30Days'),
      count: due30.count,
      amount: due30.amount,
      href: '/admin/finance/installments?quick=due_seven_days',
    },
    {
      key: 'cheques_due',
      label: t('admin.finance.hub.cashflowChequesDueSoon'),
      count: chequesDueSoonCount,
      amount: chequesDueSoonAmount,
      href: '/admin/finance/cheques?quick=due_today',
    },
    {
      key: 'overdue',
      label: t('admin.finance.hub.cashflowCurrentOverdue'),
      count: totals?.overdue_installments_count ?? totals?.overdue_installments,
      amount: totals?.total_overdue,
      href: '/admin/finance/installments?quick=overdue_unpaid',
    },
  ].filter((item) => item.amount != null || (item.count != null && item.count > 0));

  if (!items.length) {
    return (
      <FinanceHubSection title={t('admin.finance.hub.cashflowTitle')}>
        <p className="muted">{t('admin.finance.hub.cashflowEmpty')}</p>
      </FinanceHubSection>
    );
  }

  return (
    <FinanceHubSection title={t('admin.finance.hub.cashflowTitle')}>
      <div className="finance-hub-cashflow-grid">
        {items.map((item) => (
          <Link key={item.key} href={item.href} className="card finance-hub-cashflow-card">
            <span className="muted">{item.label}</span>
            {item.amount != null ? (
              <strong>
                <FinanceMoney amount={item.amount} currency={currency} />
              </strong>
            ) : null}
            {item.count != null && item.count > 0 ? (
              <span className="tiny muted">
                {t('admin.finance.hub.cashflowCountHint', { count: String(item.count) })}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </FinanceHubSection>
  );
}
