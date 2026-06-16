'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceHubSection } from '@/features/admin/finance/finance-hub-header';
import {
  buildCollectionTrend,
  buildPaymentMethodSlices,
  slicePercent,
  sumTrendAmount,
} from '@/features/admin/finance/finance-hub-chart-utils';
import { FinanceHubPeriodFilters } from '@/features/admin/finance/finance-hub-period-filters';
import type { FinanceHubFilterState } from '@/features/admin/finance/finance-hub-period';
import { isPaginatedCollectionTotalIncomplete } from '@/features/admin/finance/finance-hub-metrics';
import { FinanceHubReceivableChart } from '@/features/admin/finance/finance-hub-receivable-chart';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { resolveFinanceCurrency } from '@/lib/i18n/format-money';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { AcademicYearOption } from '@/lib/utils/academic-years';
import type { AdminFinanceOverview, PaymentCollection } from '@/types/finance';

function CollectionTrendChart({
  points,
  currency,
  formatLabel,
}: {
  points: Array<{ key: string; amount: number; label: string }>;
  currency: string;
  formatLabel: (key: string) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.amount), 1);
  const useLine = points.length > 6;

  if (useLine) {
    const width = 320;
    const height = 160;
    const padding = 12;
    const coords = points.map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (point.amount / max) * (height - padding * 2);
      return { x, y, point, index };
    });
    const path = coords.map((c) => `${c.x},${c.y}`).join(' ');

    return (
      <div className="finance-hub-trend finance-hub-trend--line">
        <svg viewBox={`0 0 ${width} ${height}`} className="finance-hub-trend__svg" role="img">
          <polyline
            fill="none"
            stroke="var(--color-primary, #2563eb)"
            strokeWidth="2.5"
            points={path}
          />
          {coords.map(({ x, y, index }) => (
            <circle
              key={points[index].key}
              cx={x}
              cy={y}
              r={4}
              fill="var(--color-primary, #2563eb)"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        {active != null ? (
          <div className="finance-hub-chart-tooltip card">
            <span>{formatLabel(points[active].label)}</span>
            <FinanceMoney amount={points[active].amount} currency={currency} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="finance-hub-trend finance-hub-trend--bars">
      <div className="finance-hub-bar-chart__plot finance-hub-bar-chart__plot--filled">
        {points.map((point, index) => {
          const pct = Math.max(12, (point.amount / max) * 100);
          return (
            <div key={point.key} className="finance-hub-bar-chart__column">
              <button
                type="button"
                className="finance-hub-bar-chart__bar-wrap"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onBlur={() => setActive(null)}
                aria-label={`${formatLabel(point.label)}: ${point.amount}`}
              >
                <span className="finance-hub-bar-chart__bar" style={{ height: `${pct}%` }} />
              </button>
              <span className="finance-hub-bar-chart__value">
                <FinanceMoney amount={point.amount} currency={currency} />
              </span>
              <span className="finance-hub-bar-chart__label">{formatLabel(point.label)}</span>
            </div>
          );
        })}
      </div>
      {active != null ? (
        <div className="finance-hub-chart-tooltip card">
          <span>{formatLabel(points[active].label)}</span>
          <FinanceMoney amount={points[active].amount} currency={currency} />
        </div>
      ) : null}
    </div>
  );
}

function PaymentMethodBars({
  slices,
  currency,
  t,
}: {
  slices: Array<{ code: string; amount: number; count: number }>;
  currency: string;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (total <= 0) return null;

  return (
    <ul className="finance-hub-method-bars">
      {slices.map((slice) => {
        const pct = slicePercent(slice.amount, total);
        return (
          <li key={slice.code} className="finance-hub-method-bars__item">
            <div className="finance-hub-method-bars__head">
              <span>{paymentMethodLabel(slice.code, t)}</span>
              <strong>
                <FinanceMoney amount={slice.amount} currency={currency} />
                <span className="muted"> · {pct}%</span>
              </strong>
            </div>
            <div className="finance-hub-method-bars__track" aria-hidden>
              <span className="finance-hub-method-bars__fill" style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
            {slice.count > 0 ? (
              <span className="tiny muted">
                {t('admin.finance.hub.chartPaymentMethodOps', { count: String(slice.count) })}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function FinanceHubCharts({
  dateFrom,
  dateTo,
  currency,
  filters,
  onFiltersChange,
  overview,
  yearId,
  yearOptions,
  yearsLoading,
  overviewLoading,
}: {
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  filters: FinanceHubFilterState;
  onFiltersChange: (next: FinanceHubFilterState) => void;
  overview: AdminFinanceOverview | null;
  yearId: string;
  yearOptions: AcademicYearOption[];
  yearsLoading?: boolean;
  overviewLoading?: boolean;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const resolvedCurrency = resolveFinanceCurrency(currency);
  const collectionsState = useAdminResource<PaymentCollection[]>(endpoints.admin.financePaymentCollections, {
    date_from: dateFrom,
    date_to: dateTo,
    state: 'confirmed',
    page: 1,
    page_size: 100,
  });

  const collectionRows = useMemo(
    () => parseFinanceList<PaymentCollection>(collectionsState.data),
    [collectionsState.data],
  );
  const pagination = collectionsState.meta?.pagination ?? null;
  const partialTotal = isPaginatedCollectionTotalIncomplete(collectionRows.length, pagination);

  const trend = useMemo(
    () => buildCollectionTrend(collectionRows, dateFrom, dateTo),
    [collectionRows, dateFrom, dateTo],
  );
  const trendTotal = useMemo(() => sumTrendAmount(trend), [trend]);
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
    <FinanceHubSection
      title={t('admin.finance.hub.analyticsTitle')}
      subtitle={t('admin.finance.hub.analyticsScopeNote')}
      action={<FinanceHubPeriodFilters filters={filters} onChange={onFiltersChange} />}
    >
      {partialTotal ? (
        <p className="finance-hub-chart__partial muted" role="status">
          {t('admin.finance.hub.chartPartialPagination')}
        </p>
      ) : null}
      <div className="finance-hub-charts-grid">
        <article className="finance-hub-chart card">
          <div className="finance-hub-chart__head">
            <div className="finance-hub-chart__head-copy">
              <h3>{t('admin.finance.hub.chartCollectionTrend')}</h3>
              <p className="finance-hub-chart__scope tiny muted">
                {t('admin.finance.hub.chartConfirmedPeriodTotal')}
              </p>
            </div>
            {!collectionsState.loading && trend.length > 0 ? (
              <p className="finance-hub-chart__total tiny muted">
                {t('admin.finance.hub.chartPeriodTotal')}:{' '}
                <FinanceMoney amount={trendTotal} currency={resolvedCurrency} />
              </p>
            ) : null}
          </div>
          <div className="finance-hub-chart__body">
            {renderChartState(
              collectionsState.loading,
              collectionsState.error,
              collectionsState.reload,
              trend.length === 0,
              t('admin.finance.hub.chartCollectionTrendEmpty'),
              <CollectionTrendChart
                points={trend}
                currency={resolvedCurrency}
                formatLabel={formatTrendLabel}
              />,
            )}
          </div>
        </article>

        {overviewLoading ? (
          <article className="finance-hub-chart card" aria-busy="true">
            <div className="finance-hub-chart__head">
              <div className="finance-hub-chart__head-copy">
                <h3>{t('admin.finance.hub.chartReceivableStatus')}</h3>
              </div>
            </div>
            <div className="finance-hub-chart__skeleton" />
          </article>
        ) : (
          <FinanceHubReceivableChart
            overview={overview}
            currency={currency}
            yearId={yearId}
            yearOptions={yearOptions}
            yearsLoading={yearsLoading}
            compact
          />
        )}

        <article className="finance-hub-chart card">
          <div className="finance-hub-chart__head">
            <div className="finance-hub-chart__head-copy">
              <h3>{t('admin.finance.hub.chartPaymentMethods')}</h3>
              <p className="finance-hub-chart__scope tiny muted">
                {t('admin.finance.hub.chartConfirmedPeriodTotal')}
              </p>
            </div>
          </div>
          <div className="finance-hub-chart__body">
            {renderChartState(
              collectionsState.loading,
              collectionsState.error,
              collectionsState.reload,
              methodSlices.length === 0,
              t('admin.finance.hub.chartPaymentMethodsEmpty'),
              <PaymentMethodBars slices={methodSlices} currency={resolvedCurrency} t={t} />,
            )}
          </div>
        </article>
      </div>
    </FinanceHubSection>
  );
}
