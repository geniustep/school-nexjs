'use client';

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview } from '@/types/finance';

function metricValue(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return String(value);
}

export function FinanceHubKpiGrid({ data }: { data: AdminFinanceOverview | null }) {
  const t = useT();
  const overview = normalizeFinanceOverview(data);
  const totals = overview?.totals ?? null;
  const currency = totals?.currency;

  const metrics = useMemo(
    () => [
      { key: 'total_due', label: t('admin.finance.hub.kpiTotalDue'), value: totals?.total_due },
      {
        key: 'confirmed_paid',
        label: t('admin.finance.hub.kpiConfirmedPaid'),
        value: totals?.total_collected,
      },
      {
        key: 'pending_cheques',
        label: t('admin.finance.hub.kpiPendingCheques'),
        value: totals?.cheques_pending_amount,
      },
      {
        key: 'remaining',
        label: t('admin.finance.hub.kpiRemaining'),
        value: totals?.total_remaining,
      },
      {
        key: 'uncovered',
        label: t('admin.finance.hub.kpiUncovered'),
        value: totals?.uncovered_amount,
      },
      {
        key: 'overdue',
        label: t('admin.finance.hub.kpiOverdue'),
        value: totals?.total_overdue,
      },
    ],
    [t, totals],
  );

  const visible = metrics.filter((m) => metricValue(m.value) != null);
  if (!visible.length) return null;

  return (
    <div className="finance-metrics-grid finance-hub-kpi-grid">
      {visible.map((m) => {
        const raw = normalizeMoneyValue(m.value);
        if (raw == null) return null;
        return (
          <div key={m.key} className="card finance-metric-card">
            <span className="muted">{m.label}</span>
            <strong>
              <FinanceMoney amount={raw} currency={currency} />
            </strong>
          </div>
        );
      })}
    </div>
  );
}
