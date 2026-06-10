'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { collectionState, financeStudentDisplayName, refName } from '@/lib/utils/finance';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import type {
  AdminFinanceOverview,
  FinanceFollowupStudent,
  FinanceOverviewTotals,
  PaymentCollection,
} from '@/types/finance';
import type { ListParams } from '@/types/api';

function pickTotals(data: AdminFinanceOverview | null): FinanceOverviewTotals | null {
  if (!data) return null;
  return data.totals ?? data.summary ?? null;
}

function metricValue(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return String(value);
}

export function FinanceOverviewPanel() {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const { options: yearOptions } = useAcademicYearOptions(null);
  const [yearId, setYearId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params: ListParams = {
    academic_year_id: yearId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };
  const state = useAdminResource<AdminFinanceOverview>(endpoints.admin.financeOverview, params);
  const totals = pickTotals(state.data);
  const currency = totals?.currency;
  const recent = state.data?.recent_collections ?? [];
  const followup =
    state.data?.followup_students ?? state.data?.students_needing_followup ?? [];

  const recentColumns: Column<PaymentCollection>[] = useMemo(
    () => [
      {
        key: 'ref',
        header: t('admin.finance.reference'),
        render: (row) => row.reference ?? row.name ?? t('common.dash'),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => refName(row.student) ?? t('common.dash'),
      },
      {
        key: 'date',
        header: t('admin.finance.collectionDate'),
        render: (row) => formatDate(row.collection_date ?? row.date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionAmount'),
        render: (row) => (
          <FinanceMoney amount={row.amount ?? row.total_amount} currency={row.currency ?? currency} />
        ),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={collectionState(row)} />,
      },
    ],
    [t, formatDate, currency],
  );

  const followupColumns: Column<FinanceFollowupStudent>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('nav.students'),
        render: (row) => financeStudentDisplayName(row.student ? { name: row.student.name } : row),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (row) => row.class?.name ?? t('common.dash'),
      },
      {
        key: 'remaining',
        header: t('admin.finance.remainingAmount'),
        render: (row) => (
          <FinanceMoney amount={row.remaining_amount} currency={row.currency ?? currency} />
        ),
      },
      {
        key: 'overdue',
        header: t('admin.finance.overdueAmount'),
        render: (row) => (
          <FinanceMoney amount={row.overdue_amount} currency={row.currency ?? currency} />
        ),
      },
    ],
    [t, currency],
  );

  const metrics = [
    { label: t('admin.finance.overviewTotalDue'), value: totals?.total_due },
    { label: t('admin.finance.overviewTotalCollected'), value: totals?.total_collected },
    { label: t('admin.finance.overviewTotalRemaining'), value: totals?.total_remaining },
    { label: t('admin.finance.overviewTotalOverdue'), value: totals?.total_overdue },
    {
      label: t('admin.finance.overviewStudentsWithBalance'),
      value: totals?.students_with_balance,
      isCount: true,
    },
    {
      label: t('admin.finance.overviewOverdueInstallments'),
      value: totals?.overdue_installments_count,
      isCount: true,
    },
    {
      label: t('admin.finance.overviewPeriodCollections'),
      value: totals?.period_collections_count ?? totals?.collections_count,
      isCount: true,
    },
    {
      label: t('admin.finance.overviewPeriodCollectedAmount'),
      value: totals?.period_collections_amount ?? totals?.collections_amount,
    },
    {
      label: t('admin.finance.overviewRegisteredCollectionsPeriod'),
      value: totals?.total_collected_period,
    },
    {
      label: t('admin.finance.overviewClearedLiquidityPeriod'),
      value: totals?.total_cleared_liquidity_period,
    },
    {
      label: t('admin.finance.cheques.overviewPending'),
      value: totals?.cheques_pending_amount,
    },
    {
      label: t('admin.finance.cheques.overviewDue'),
      value: totals?.cheques_due_amount,
    },
    {
      label: t('admin.finance.cheques.overviewDeposited'),
      value: totals?.cheques_deposited_amount,
    },
    {
      label: t('admin.finance.cheques.overviewCleared'),
      value: totals?.cheques_cleared_amount,
    },
    {
      label: t('admin.finance.cheques.overviewRejected'),
      value: totals?.cheques_rejected_amount,
    },
    {
      label: t('admin.finance.cheques.overviewPendingCount'),
      value: totals?.cheques_pending_count,
      isCount: true,
    },
    {
      label: t('admin.finance.cheques.overviewDueCount'),
      value: totals?.cheques_due_count,
      isCount: true,
    },
    {
      label: t('admin.finance.cheques.overviewDepositedCount'),
      value: totals?.cheques_deposited_count,
      isCount: true,
    },
    {
      label: t('admin.finance.cheques.overviewClearedCount'),
      value: totals?.cheques_cleared_count,
      isCount: true,
    },
    {
      label: t('admin.finance.cheques.overviewRejectedCount'),
      value: totals?.cheques_rejected_count,
      isCount: true,
    },
  ];

  return (
    <div className="form-stack">
      <div className="toolbar finance-overview-filters">
        <select className="input" value={yearId} onChange={(e) => setYearId(e.target.value)}>
          <option value="">{t('admin.finance.allAcademicYears')}</option>
          {yearOptions.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <label>
          {t('admin.finance.dateFrom')}
          <input
            className="input"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label>
          {t('admin.finance.dateTo')}
          <input
            className="input"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
      </div>

      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {() => {
          const hasTotals = metrics.some((m) => metricValue(m.value) != null);
          if (!hasTotals && !recent.length && !followup.length) {
            return (
              <EmptyState
                title={t('admin.finance.noOverviewMetricsTitle')}
                description={t('admin.finance.noOverviewMetricsDesc')}
              />
            );
          }
          return (
            <>
              {hasTotals && (
                <div className="finance-metrics-grid">
                  {metrics.map((m) => {
                    const raw = normalizeMoneyValue(m.value);
                    if (raw == null) return null;
                    return (
                      <div key={m.label} className="card finance-metric-card">
                        <span className="muted">{m.label}</span>
                        <strong>
                          {m.isCount ? (
                            raw
                          ) : (
                            <FinanceMoney amount={raw} currency={currency} />
                          )}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}

              {recent.length > 0 && (
                <section className="card">
                  <h3>{t('admin.finance.recentCollections')}</h3>
                  <DataTable
                    columns={recentColumns}
                    rows={recent}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => router.push(`/admin/finance/collections/${row.id}`)}
                  />
                </section>
              )}

              {followup.length > 0 && (
                <section className="card">
                  <h3>{t('admin.finance.studentsNeedingFollowup')}</h3>
                  <DataTable
                    columns={followupColumns}
                    rows={followup}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => router.push(`/admin/finance/students/${row.id}`)}
                  />
                </section>
              )}
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}
