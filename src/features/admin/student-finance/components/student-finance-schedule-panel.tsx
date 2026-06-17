'use client';

import { useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { refName } from '@/lib/utils/finance';
import { resolveInstallmentDisplayLabel } from '../utils/resolve-installment-display';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { useStudentFinanceInstallmentsPage } from '../hooks/use-student-finance-installments-page';
import { resolveStudentFinanceCurrency } from '../utils/resolve-student-finance-currency';
import type { StudentInstallment } from '../types';
import { formatPeriodRange } from '../utils/format-period';
import { InstallmentStatusBadges } from './installment-status-badges';
import type { StudentFinancePanelProps } from './student-finance-panel-props';

function resolveScheduleStatus(row: StudentInstallment, t: (key: string) => string): string {
  if ((row.pending_cheque_amount ?? 0) > 0 || row.payment_status === 'pending_cheque') {
    return t('admin.student360.financeWorkspace.schedule.status.pendingChequeCoverage');
  }
  if (row.display_state) {
    const key = `admin.student360.financeWorkspace.schedule.status.${row.display_state}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  if (row.state === 'cancelled') return t('admin.student360.financeWorkspace.schedule.status.cancelled');
  if (row.payment_status === 'paid') return t('admin.student360.financeWorkspace.schedule.status.paid');
  if (row.payment_status === 'partially_paid') {
    return t('admin.student360.financeWorkspace.schedule.status.partiallyPaid');
  }
  if (row.timing_status === 'overdue') return t('admin.student360.financeWorkspace.schedule.status.overdue');
  if (row.timing_status === 'due') return t('admin.student360.financeWorkspace.schedule.status.due');
  if (row.timing_status === 'upcoming' || row.timing_status === 'hidden') {
    return t('admin.student360.financeWorkspace.schedule.status.upcoming');
  }
  return t('common.dash');
}

export function StudentFinanceSchedulePanel({
  studentId,
  effectiveYearId,
  financialOverview,
  financeRefreshSignal = 0,
  onOpenCollection,
  canCollect,
}: StudentFinancePanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [timingStatus, setTimingStatus] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const currency = resolveStudentFinanceCurrency({ financialOverview });

  const query = useMemo(
    () => ({
      page,
      page_size: 20,
      academic_year_id: Number(effectiveYearId),
      payment_status: paymentStatus || undefined,
      timing_status: timingStatus || undefined,
      service_category: serviceFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [page, effectiveYearId, paymentStatus, timingStatus, serviceFilter, dateFrom, dateTo],
  );

  const installmentsState = useStudentFinanceInstallmentsPage(
    studentId,
    query,
    !!effectiveYearId,
    financeRefreshSignal,
  );
  const summary = installmentsState.summary;

  const scheduleSummary = useMemo(() => {
    const rows = installmentsState.data;
    let paid = 0;
    let due = 0;
    let overdue = 0;
    let upcoming = 0;
    for (const row of rows) {
      if (row.payment_status === 'paid') paid += 1;
      else if (row.timing_status === 'overdue') overdue += 1;
      else if (row.timing_status === 'due') due += 1;
      else upcoming += 1;
    }
    return {
      total: summary?.total_count ?? rows.length,
      paid,
      due,
      overdue,
      upcoming,
    };
  }, [installmentsState.data, summary?.total_count]);

  const columns: Column<StudentInstallment>[] = useMemo(
    () => [
      {
        key: 'sequence',
        header: t('admin.student360.financeWorkspace.schedule.columns.installment'),
        render: (row) => row.sequence ?? t('common.dash'),
      },
      {
        key: 'service',
        header: t('admin.student360.financeWorkspace.schedule.columns.fee'),
        render: (row) => {
          const title = resolveInstallmentDisplayLabel(row, locale);
          return title || refName(row.service) || t('common.dash');
        },
      },
      {
        key: 'period',
        header: t('admin.student360.financeWorkspace.schedule.columns.period'),
        render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end, row.due_date),
      },
      {
        key: 'due_date',
        header: t('admin.student360.financeWorkspace.schedule.columns.dueDate'),
        render: (row) => formatDate(row.due_date),
      },
      {
        key: 'amount',
        header: t('admin.student360.financeWorkspace.schedule.columns.amount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={currency} />,
      },
      {
        key: 'paid',
        header: t('admin.student360.financeWorkspace.schedule.columns.paid'),
        render: (row) => <FinanceMoney amount={row.confirmed_paid_amount} currency={currency} />,
      },
      {
        key: 'remaining',
        header: t('admin.student360.financeWorkspace.schedule.columns.remaining'),
        render: (row) => <FinanceMoney amount={row.remaining_amount} currency={currency} />,
      },
      {
        key: 'status',
        header: t('admin.student360.financeWorkspace.schedule.columns.status'),
        render: (row) => (
          <div className="student-finance-schedule-status">
            <InstallmentStatusBadges
              paymentStatus={row.payment_status ?? 'unpaid'}
              timingStatus={row.timing_status ?? 'not_applicable'}
              isVisible={row.is_visible}
            />
            <span className="tiny muted">{resolveScheduleStatus(row, t)}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: t('admin.student360.financeWorkspace.schedule.columns.actions'),
        render: (row) =>
          canCollect && (row.remaining_amount ?? 0) > 0 ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenCollection}>
              {t('admin.finance.collectionWorkflow.recordPayment')}
            </button>
          ) : (
            t('common.dash')
          ),
      },
    ],
    [t, formatDate, currency, canCollect, onOpenCollection, locale],
  );

  return (
    <Card className="student-finance-section">
      <Student360SectionHeader
        title={t('admin.student360.financeWorkspace.tabs.schedule')}
        description={t('admin.student360.financeWorkspace.schedule.description')}
      />

      <dl className="detail-list compact student-finance-schedule-summary">
        <div>
          <dt>{t('admin.student360.financeWorkspace.schedule.summary.total')}</dt>
          <dd>{scheduleSummary.total}</dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.schedule.summary.paid')}</dt>
          <dd>{scheduleSummary.paid}</dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.schedule.summary.due')}</dt>
          <dd>{scheduleSummary.due}</dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.schedule.summary.overdue')}</dt>
          <dd>{scheduleSummary.overdue}</dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.schedule.summary.upcoming')}</dt>
          <dd>{scheduleSummary.upcoming}</dd>
        </div>
      </dl>

      <div className="student-finance-filters-toolbar">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          {filtersOpen
            ? t('admin.student360.financeOps.filters.hide')
            : t('admin.student360.financeOps.filters.show')}
        </button>
      </div>

      {filtersOpen ? (
        <div className="student-finance-filters">
          <label>
            <span className="tiny muted">{t('admin.student360.financeOps.filters.paymentStatus')}</span>
            <select className="input" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
              <option value="">{t('admin.student360.financeOps.filters.all')}</option>
              <option value="unpaid">{t('admin.student360.financeOps.paymentStatus.unpaid')}</option>
              <option value="partially_paid">{t('admin.student360.financeOps.paymentStatus.partially_paid')}</option>
              <option value="paid">{t('admin.student360.financeOps.paymentStatus.paid')}</option>
            </select>
          </label>
          <label>
            <span className="tiny muted">{t('admin.student360.financeOps.filters.timingStatus')}</span>
            <select className="input" value={timingStatus} onChange={(e) => { setTimingStatus(e.target.value); setPage(1); }}>
              <option value="">{t('admin.student360.financeOps.filters.all')}</option>
              <option value="upcoming">{t('admin.student360.financeOps.timingStatus.upcoming')}</option>
              <option value="due">{t('admin.student360.financeOps.timingStatus.due')}</option>
              <option value="overdue">{t('admin.student360.financeOps.timingStatus.overdue')}</option>
            </select>
          </label>
          <label>
            <span className="tiny muted">{t('admin.student360.financeOps.filters.dateFrom')}</span>
            <input className="input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          </label>
          <label>
            <span className="tiny muted">{t('admin.student360.financeOps.filters.dateTo')}</span>
            <input className="input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </label>
        </div>
      ) : null}

      {installmentsState.initialLoading ? <StudentSectionSkeleton rows={6} /> : null}
      {installmentsState.error ? <ApiErrorView error={installmentsState.error} onRetry={installmentsState.reload} /> : null}
      {!installmentsState.initialLoading && !installmentsState.error && installmentsState.data.length === 0 ? (
        <EmptyState title={t('admin.student360.financeWorkspace.schedule.emptyTitle')} />
      ) : null}
      {!installmentsState.error && installmentsState.data.length > 0 ? (
        <>
          <div className="student-finance-table-wrap">
            <DataTable columns={columns} rows={installmentsState.data} rowKey={(row) => row.id} />
          </div>
          {installmentsState.data.length >= 20 ? (
            <Pagination page={page} totalPages={page + 1} total={page * 20} onPage={setPage} />
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
