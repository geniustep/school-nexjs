'use client';

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  buildReceivableStatusSlices,
  slicePercent,
} from '@/features/admin/finance/finance-hub-chart-utils';
import {
  findSelectedYear,
  resolveSummaryScopeMode,
} from '@/features/admin/finance/finance-hub-scope-utils';
import { useT } from '@/features/i18n/locale-context';
import { resolveFinanceCurrency } from '@/lib/i18n/format-money';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { AcademicYearOption } from '@/lib/utils/academic-years';
import type { AdminFinanceOverview } from '@/types/finance';

const RECEIVABLE_COLORS: Record<string, string> = {
  paid: '#2563eb',
  due: '#f59e0b',
  overdue: '#dc2626',
};

function ReceivableDonutChart({
  slices,
  currency,
  labelForKey,
  centerTotal,
  centerLabel,
}: {
  slices: Array<{ key: string; amount: number }>;
  currency: string;
  labelForKey: (key: string) => string;
  centerTotal: number;
  centerLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (total <= 0) return null;

  let offset = 0;
  const segments = slices.map((slice) => {
    const pct = (slice.amount / total) * 100;
    const segment = {
      ...slice,
      pct,
      color: RECEIVABLE_COLORS[slice.key] ?? '#64748b',
      offset,
    };
    offset += pct;
    return segment;
  });

  const gradient = segments
    .map((segment) => `${segment.color} ${segment.offset}% ${segment.offset + segment.pct}%`)
    .join(', ');

  return (
    <div className="finance-hub-donut finance-hub-donut--enhanced">
      <div className="finance-hub-donut__visual">
        <div className="finance-hub-donut__ring" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="finance-hub-donut__center">
          <span className="finance-hub-donut__center-value">
            <FinanceMoney amount={centerTotal} currency={currency} />
          </span>
          <span className="finance-hub-donut__center-label tiny muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="finance-hub-donut__legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="finance-hub-donut__swatch" style={{ background: segment.color }} />
            <div className="finance-hub-donut__legend-text">
              <span>{labelForKey(segment.key)}</span>
              <strong>
                <FinanceMoney amount={segment.amount} currency={currency} />
                <span className="finance-hub-donut__pct"> · {slicePercent(segment.amount, total)}%</span>
              </strong>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FinanceHubReceivableChart({
  overview,
  currency,
  yearId,
  yearOptions,
  yearsLoading,
}: {
  overview: AdminFinanceOverview | null;
  currency?: string;
  yearId: string;
  yearOptions: AcademicYearOption[];
  yearsLoading?: boolean;
}) {
  const t = useT();
  const resolvedCurrency = resolveFinanceCurrency(currency);
  const receivableSlices = useMemo(() => buildReceivableStatusSlices(overview), [overview]);
  const centerTotal = normalizeMoneyValue(overview?.totals?.total_due) ?? 0;
  const mode = resolveSummaryScopeMode(yearId, yearOptions, yearsLoading);
  const selectedYear = findSelectedYear(yearId, yearOptions);
  const yearName = selectedYear?.name?.trim() ?? '';

  const scopeNote =
    mode === 'year' && yearName
      ? t('admin.finance.hub.receivableScopeYear', { year: yearName })
      : mode === 'all'
        ? t('admin.finance.hub.receivableScopeAll')
        : t('admin.finance.hub.receivableScopeNeutral');

  return (
    <article className="finance-hub-chart card finance-hub-receivable-panel">
      <h3>{t('admin.finance.hub.chartReceivableStatus')}</h3>
      <p className="finance-hub-chart__scope tiny muted">{scopeNote}</p>
      {receivableSlices.length === 0 ? (
        <p className="muted finance-hub-chart__empty">{t('admin.finance.hub.chartReceivableStatusEmpty')}</p>
      ) : (
        <ReceivableDonutChart
          slices={receivableSlices}
          currency={resolvedCurrency}
          labelForKey={(key) => t(`admin.finance.hub.receivableStatus.${key}`)}
          centerTotal={centerTotal}
          centerLabel={t('admin.finance.hub.chartReceivableCenter')}
        />
      )}
    </article>
  );
}
