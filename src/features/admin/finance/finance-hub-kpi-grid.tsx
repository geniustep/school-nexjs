'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { formatFinancePlural } from '@/features/admin/finance/finance-hub-plural';
import { computeCollectionRate } from '@/features/admin/finance/finance-hub-chart-utils';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { normalizeFinanceOverview, normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import { resolveFinanceCurrency } from '@/lib/i18n/format-money';
import type { AdminFinanceOverview } from '@/types/finance';

type KpiDef = {
  key: string;
  labelKey: string;
  value: number | null | undefined;
  href?: string;
  hint?: string | null;
  isPercent?: boolean;
  alwaysShow?: boolean;
};

export function FinanceHubKpiGrid({
  data,
  loading,
}: {
  data: AdminFinanceOverview | null;
  loading?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const overview = normalizeFinanceOverview(data);
  const totals = overview?.totals ?? null;
  const currency = resolveFinanceCurrency(totals?.currency);
  const collectionRate = computeCollectionRate(overview);
  const hasOverview = overview != null;

  const metrics = useMemo<KpiDef[]>(
    () => [
      {
        key: 'total_due',
        labelKey: 'admin.finance.hub.kpiTotalDue',
        value: totals?.total_due,
        href: '/admin/finance/installments',
        hint:
          totals?.students_with_balance != null && totals.students_with_balance > 0
            ? formatFinancePlural(t, locale, 'student', totals.students_with_balance)
            : null,
        alwaysShow: true,
      },
      {
        key: 'collected',
        labelKey: 'admin.finance.hub.kpiCollected',
        value: totals?.total_collected,
        href: '/admin/finance/collections',
        alwaysShow: true,
      },
      {
        key: 'remaining',
        labelKey: 'admin.finance.hub.kpiRemaining',
        value: totals?.total_remaining,
        href: '/admin/finance/installments',
        alwaysShow: true,
      },
      {
        key: 'overdue',
        labelKey: 'admin.finance.hub.kpiOverdue',
        value: totals?.total_overdue,
        href: '/admin/finance/installments?quick=overdue_unpaid',
        hint:
          totals?.overdue_installments_count != null && totals.overdue_installments_count > 0
            ? formatFinancePlural(t, locale, 'overdueInstallment', totals.overdue_installments_count)
            : null,
        alwaysShow: true,
      },
      {
        key: 'collection_rate',
        labelKey: 'admin.finance.hub.kpiCollectionRate',
        value: collectionRate,
        isPercent: true,
        href: '/admin/finance/collections',
        alwaysShow: collectionRate != null,
      },
    ],
    [totals, collectionRate, t, locale],
  );

  const visible = hasOverview ? metrics.filter((m) => m.alwaysShow !== false) : [];

  if (loading && !hasOverview) {
    return (
      <div className="finance-hub-kpi-grid finance-hub-kpi-grid--five" aria-busy="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card finance-metric-card finance-hub-skeleton-card" />
        ))}
      </div>
    );
  }

  if (!visible.length) return null;

  return (
    <div className="finance-hub-kpi-grid finance-hub-kpi-grid--five">
      {visible.map((metric) => {
        const raw = metric.isPercent ? metric.value : normalizeMoneyValue(metric.value ?? 0);
        if (raw == null && !metric.alwaysShow) return null;
        const body = (
          <>
            <span className="finance-metric-card__label muted">{t(metric.labelKey)}</span>
            <strong className="finance-metric-card__value">
              {metric.isPercent ? (
                `${raw ?? 0}%`
              ) : (
                <FinanceMoney amount={raw ?? 0} currency={currency} />
              )}
            </strong>
            {metric.hint ? <span className="finance-metric-card__hint tiny muted">{metric.hint}</span> : null}
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
