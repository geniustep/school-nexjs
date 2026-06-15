'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { computeCollectionRate } from '@/features/admin/finance/finance-hub-chart-utils';
import { useT } from '@/features/i18n/locale-context';
import { normalizeFinanceOverview, normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview } from '@/types/finance';

type KpiDef = {
  key: string;
  labelKey: string;
  value: number | null | undefined;
  href?: string;
  hint?: string | null;
  isPercent?: boolean;
};

function metricValue(value: number | null | undefined): boolean {
  if (value == null || Number.isNaN(value)) return false;
  return true;
}

export function FinanceHubKpiGrid({
  data,
  loading,
}: {
  data: AdminFinanceOverview | null;
  loading?: boolean;
}) {
  const t = useT();
  const overview = normalizeFinanceOverview(data);
  const totals = overview?.totals ?? null;
  const currency = totals?.currency;
  const collectionRate = computeCollectionRate(overview);

  const metrics = useMemo<KpiDef[]>(
    () => [
      {
        key: 'total_due',
        labelKey: 'admin.finance.hub.kpiTotalDue',
        value: totals?.total_due,
        href: '/admin/finance/installments',
        hint:
          totals?.students_with_balance != null
            ? t('admin.finance.hub.kpiStudentsHint', { count: String(totals.students_with_balance) })
            : null,
      },
      {
        key: 'confirmed_paid',
        labelKey: 'admin.finance.hub.kpiConfirmedPaid',
        value: totals?.total_collected,
        href: '/admin/finance/collections',
      },
      {
        key: 'remaining',
        labelKey: 'admin.finance.hub.kpiRemaining',
        value: totals?.total_remaining,
        href: '/admin/finance/installments',
      },
      {
        key: 'overdue',
        labelKey: 'admin.finance.hub.kpiOverdue',
        value: totals?.total_overdue,
        href: '/admin/finance/installments?quick=overdue_unpaid',
        hint:
          totals?.overdue_installments_count != null
            ? t('admin.finance.hub.kpiOverdueInstallmentsHint', {
                count: String(totals.overdue_installments_count),
              })
            : null,
      },
      {
        key: 'collection_rate',
        labelKey: 'admin.finance.hub.kpiCollectionRate',
        value: collectionRate,
        isPercent: true,
        href: '/admin/finance/collections',
      },
    ],
    [totals, collectionRate, t],
  );

  const visible = metrics.filter((m) => metricValue(m.value));

  if (loading && !visible.length) {
    return (
      <div className="finance-metrics-grid finance-hub-kpi-grid" aria-busy="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card finance-metric-card finance-hub-skeleton-card" />
        ))}
      </div>
    );
  }

  if (!visible.length) return null;

  return (
    <div className="finance-metrics-grid finance-hub-kpi-grid">
      {visible.map((metric) => {
        const raw = normalizeMoneyValue(metric.value);
        if (raw == null) return null;
        const body = (
          <>
            <span className="muted">{t(metric.labelKey)}</span>
            <strong>
              {metric.isPercent ? (
                `${raw}%`
              ) : (
                <FinanceMoney amount={raw} currency={currency} />
              )}
            </strong>
            {metric.hint ? <span className="tiny muted">{metric.hint}</span> : null}
          </>
        );
        if (metric.href) {
          return (
            <Link key={metric.key} href={metric.href} className="card finance-metric-card finance-metric-card--link">
              {body}
            </Link>
          );
        }
        return (
          <div key={metric.key} className="card finance-metric-card">
            {body}
          </div>
        );
      })}
    </div>
  );
}
