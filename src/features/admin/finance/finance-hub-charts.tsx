'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceHubSection } from '@/features/admin/finance/finance-hub-header';
import {
  buildCollectionTrend,
  buildPaymentMethodSlices,
  buildReceivableStatusSlices,
} from '@/features/admin/finance/finance-hub-chart-utils';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview, PaymentCollection } from '@/types/finance';

function BarChart({
  points,
  currency,
  formatLabel,
}: {
  points: Array<{ key: string; amount: number; label: string }>;
  currency?: string;
  formatLabel: (key: string) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.amount), 1);

  return (
    <div className="finance-hub-bar-chart">
      <div className="finance-hub-bar-chart__plot" role="img" aria-hidden={points.length === 0}>
        {points.map((point, index) => (
          <div key={point.key} className="finance-hub-bar-chart__column">
            <button
              type="button"
              className="finance-hub-bar-chart__bar-wrap"
              style={{ height: `${Math.max(8, (point.amount / max) * 100)}%` }}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              aria-label={`${formatLabel(point.label)}: ${point.amount}`}
            >
              <span className="finance-hub-bar-chart__bar" />
            </button>
            <span className="finance-hub-bar-chart__label">{formatLabel(point.label)}</span>
          </div>
        ))}
      </div>
      {active != null && points[active] ? (
        <div className="finance-hub-chart-tooltip card">
          <span>{formatLabel(points[active].label)}</span>
          <strong>
            <FinanceMoney amount={points[active].amount} currency={currency} />
          </strong>
        </div>
      ) : null}
    </div>
  );
}

function DonutChart({
  slices,
  currency,
  labelForKey,
}: {
  slices: Array<{ key: string; amount: number }>;
  currency?: string;
  labelForKey: (key: string) => string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (total <= 0) return null;

  let offset = 0;
  const colors = ['#2563eb', '#f59e0b', '#dc2626', '#64748b'];
  const segments = slices.map((slice, index) => {
    const pct = (slice.amount / total) * 100;
    const segment = { ...slice, pct, color: colors[index % colors.length], offset };
    offset += pct;
    return segment;
  });

  const gradient = segments
    .map((segment) => `${segment.color} ${segment.offset}% ${segment.offset + segment.pct}%`)
    .join(', ');

  return (
    <div className="finance-hub-donut">
      <div
        className="finance-hub-donut__ring"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label={labelForKey('chart')}
      />
      <ul className="finance-hub-donut__legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="finance-hub-donut__swatch" style={{ background: segment.color }} />
            <span>{labelForKey(segment.key)}</span>
            <strong>
              <FinanceMoney amount={segment.amount} currency={currency} />
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FinanceHubCharts({
  overview,
  dateFrom,
  dateTo,
  currency,
}: {
  overview: AdminFinanceOverview | null;
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const collectionsState = useAdminResource<PaymentCollection[]>(endpoints.admin.financePaymentCollections, {
    date_from: dateFrom,
    date_to: dateTo,
    page: 1,
    page_size: 100,
  });

  const collectionRows = useMemo(
    () => parseFinanceList<PaymentCollection>(collectionsState.data),
    [collectionsState.data],
  );

  const trend = useMemo(
    () => buildCollectionTrend(collectionRows, dateFrom, dateTo),
    [collectionRows, dateFrom, dateTo],
  );
  const receivableSlices = useMemo(() => buildReceivableStatusSlices(overview), [overview]);
  const methodSlices = useMemo(() => buildPaymentMethodSlices(collectionRows), [collectionRows]);

  const formatTrendLabel = (key: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return formatDate(key) || key;
    if (/^\d{4}-\d{2}$/.test(key)) return key;
    return key;
  };

  const renderChartState = (
    loading: boolean,
    error: typeof collectionsState.error,
    onRetry: () => void,
    empty: boolean,
    emptyLabel: string,
    chart: ReactNode,
  ) => {
    if (loading && empty) return <div className="finance-hub-chart__skeleton" aria-busy="true" />;
    if (error) return <ApiErrorView error={error} onRetry={onRetry} />;
    if (empty) return <p className="muted finance-hub-chart__empty">{emptyLabel}</p>;
    return chart;
  };

  return (
    <FinanceHubSection title={t('admin.finance.hub.analyticsTitle')}>
      <div className="finance-hub-charts-grid">
        <article className="finance-hub-chart card">
          <h3>{t('admin.finance.hub.chartCollectionTrend')}</h3>
          {renderChartState(
            collectionsState.loading,
            collectionsState.error,
            collectionsState.reload,
            trend.length === 0,
            t('admin.finance.hub.chartCollectionTrendEmpty'),
            <BarChart points={trend} currency={currency} formatLabel={formatTrendLabel} />,
          )}
        </article>

        <article className="finance-hub-chart card">
          <h3>{t('admin.finance.hub.chartReceivableStatus')}</h3>
          {receivableSlices.length === 0 ? (
            <p className="muted finance-hub-chart__empty">{t('admin.finance.hub.chartReceivableStatusEmpty')}</p>
          ) : (
            <DonutChart
              slices={receivableSlices}
              currency={currency}
              labelForKey={(key) => t(`admin.finance.hub.receivableStatus.${key}`)}
            />
          )}
        </article>

        <article className="finance-hub-chart card">
          <h3>{t('admin.finance.hub.chartPaymentMethods')}</h3>
          {renderChartState(
            collectionsState.loading,
            collectionsState.error,
            collectionsState.reload,
            methodSlices.length === 0,
            t('admin.finance.hub.chartPaymentMethodsEmpty'),
            <ul className="finance-hub-method-list">
              {methodSlices.map((slice) => (
                <li key={slice.code}>
                  <span>{paymentMethodLabel(slice.code, t)}</span>
                  <strong>
                    <FinanceMoney amount={slice.amount} currency={currency} />
                  </strong>
                </li>
              ))}
            </ul>,
          )}
        </article>
      </div>
    </FinanceHubSection>
  );
}
