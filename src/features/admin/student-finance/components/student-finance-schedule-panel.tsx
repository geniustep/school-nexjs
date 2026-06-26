'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiErrorView } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { refName } from '@/lib/utils/finance';
import { resolveInstallmentDisplayLabel } from '../utils/resolve-installment-display';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { useStudentFinanceInstallmentsPage } from '../hooks/use-student-finance-installments-page';
import { resolveStudentFinanceCurrency } from '../utils/resolve-student-finance-currency';
import type { StudentInstallment } from '../types';
import { formatPeriodRange } from '../utils/format-period';
import {
  computeScheduleSummaryCounts,
  hasInstallmentPendingChequeCoverage,
  isInstallmentDueNowForSummary,
  isInstallmentOverdueForSummary,
  isInstallmentPaidForSummary,
  isInstallmentUpcomingForSummary,
  resolveEffectiveInstallmentPaymentStatus,
  resolveEffectiveInstallmentTimingStatus,
  resolveMinUnpaidInstallmentSequence,
} from '../utils/resolve-installment-presentation';
import { InstallmentRowStatusBadges } from './installment-status-badges';
import type { StudentFinancePanelProps } from './student-finance-panel-props';


export function StudentFinanceSchedulePanel({
  studentId,
  effectiveYearId,
  financialOverview,
  financeRefreshSignal = 0,
  onOpenCollection,
  canCollect,
  scheduleMode = 'official',
  allowInstallmentCollection = true,
}: StudentFinancePanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  // A draft fee agreement renders the schedule as a non-binding preview: never
  // allow collection, regardless of capability, until the agreement is approved.
  const isDraftPreview = scheduleMode === 'draft_preview';
  const allowCollection = canCollect && allowInstallmentCollection && !isDraftPreview;
  const agreementsHref = `/admin/students/${studentId}?tab=finance&financeSubTab=agreements`;
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
      page_size: 100,
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
    const counts = computeScheduleSummaryCounts(rows, allowCollection);
    return {
      total: summary?.total_count ?? rows.length,
      paid: counts.paid,
      due: counts.dueNow,
      overdue: counts.overdue,
      upcoming: counts.upcoming,
    };
  }, [installmentsState.data, summary?.total_count, allowCollection]);

  const hasActiveFilters = Boolean(paymentStatus || timingStatus || serviceFilter || dateFrom || dateTo);
  const summaryItemsMuted = scheduleSummary.total === 0;

  const resetFilters = () => {
    setPaymentStatus('');
    setTimingStatus('');
    setServiceFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const scheduleCtx = useMemo(
    () => ({
      canCollect: allowCollection,
      minUnpaidSequence: resolveMinUnpaidInstallmentSequence(installmentsState.data),
    }),
    [installmentsState.data, allowCollection],
  );

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
        render: (row) => {
          const pendingCheque = hasInstallmentPendingChequeCoverage(row);
          const effectivePayment = resolveEffectiveInstallmentPaymentStatus(row);
          const rawTiming = resolveEffectiveInstallmentTimingStatus(row);
          const effectiveTiming =
            rawTiming === 'hidden' && isInstallmentDueNowForSummary(row, scheduleCtx)
              ? 'due'
              : rawTiming;
          return (
            <div className="student-finance-schedule-status">
              <InstallmentRowStatusBadges
                paymentStatus={effectivePayment}
                timingStatus={effectiveTiming ?? row.timing_status ?? 'not_applicable'}
                isVisible={row.is_visible}
                pendingChequeCoverage={pendingCheque}
              />
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: t('admin.student360.financeWorkspace.schedule.columns.actions'),
        render: (row) =>
          allowCollection && (row.remaining_amount ?? 0) > 0 ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenCollection}>
              {t('admin.finance.collectionWorkflow.recordPayment')}
            </button>
          ) : (
            t('common.dash')
          ),
      },
    ],
    [t, formatDate, currency, allowCollection, onOpenCollection, locale, scheduleCtx],
  );

  return (
    <div className="student-finance-schedule-panel student-finance-tab student-360-tab-panel">
      <Student360SectionHeader
        title={
          isDraftPreview
            ? t('admin.student360.financeWorkspace.schedule.draftPreview.title')
            : t('admin.student360.financeWorkspace.tabs.schedule')
        }
        description={
          isDraftPreview
            ? t('admin.student360.financeWorkspace.schedule.draftPreview.description')
            : t('admin.student360.financeWorkspace.schedule.description')
        }
      />

      {isDraftPreview ? (
        <div className="student-finance-schedule-callout" role="note">
          <span className="student-finance-schedule-callout__icon" aria-hidden="true">
            !
          </span>
          <div className="student-finance-schedule-callout__body">
            <p>{t('admin.student360.financeWorkspace.schedule.draftPreview.explanation')}</p>
            <Link href={agreementsHref} className="btn btn--primary btn--sm">
              {t('admin.student360.financeWorkspace.actionState.reviewDraft')}
            </Link>
          </div>
        </div>
      ) : null}

      <Student360MetricGrid
        variant="finance"
        className={`student-finance-schedule-summary${summaryItemsMuted ? ' student-360-metric-grid--muted' : ''}`}
        items={[
          {
            key: 'total',
            label: t('admin.student360.financeWorkspace.schedule.summary.total'),
            value: scheduleSummary.total,
            tone: summaryItemsMuted ? 'none' : 'slate',
          },
          {
            key: 'paid',
            label: t('admin.student360.financeWorkspace.schedule.summary.paid'),
            value: scheduleSummary.paid,
            tone: summaryItemsMuted ? 'none' : 'green',
          },
          {
            key: 'due',
            label: t('admin.student360.financeWorkspace.schedule.summary.due'),
            value: scheduleSummary.due,
            tone: summaryItemsMuted ? 'none' : 'amber',
          },
          {
            key: 'overdue',
            label: t('admin.student360.financeWorkspace.schedule.summary.overdue'),
            value: scheduleSummary.overdue,
            tone: summaryItemsMuted ? 'none' : 'red',
          },
          {
            key: 'upcoming',
            label: t('admin.student360.financeWorkspace.schedule.summary.upcoming'),
            value: scheduleSummary.upcoming,
            tone: summaryItemsMuted ? 'none' : 'blue',
          },
        ]}
      />

      <article className="student-finance-schedule-table-card">
        <div className="student-finance-schedule-table-card__toolbar">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {filtersOpen
              ? t('admin.student360.financeOps.filters.hide')
              : t('admin.student360.financeOps.filters.show')}
            {hasActiveFilters && !filtersOpen ? (
              <span className="student-finance-filters-badge" aria-hidden="true">
                ●
              </span>
            ) : null}
          </button>
          {hasActiveFilters ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              {t('admin.studentsList.resetFilters')}
            </button>
          ) : null}
        </div>

        {filtersOpen ? (
          <div className="student-finance-schedule-filters-panel">
            <div className="student-finance-schedule-filters-panel__group">
              <label className="student-finance-schedule-filters-panel__field">
                <span className="student-finance-schedule-filters-panel__label">
                  {t('admin.student360.financeOps.filters.paymentStatus')}
                </span>
                <select className="input" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
                  <option value="">{t('admin.student360.financeOps.filters.all')}</option>
                  <option value="unpaid">{t('admin.student360.financeOps.paymentStatus.unpaid')}</option>
                  <option value="partially_paid">{t('admin.student360.financeOps.paymentStatus.partially_paid')}</option>
                  <option value="paid">{t('admin.student360.financeOps.paymentStatus.paid')}</option>
                </select>
              </label>
              <label className="student-finance-schedule-filters-panel__field">
                <span className="student-finance-schedule-filters-panel__label">
                  {t('admin.student360.financeOps.filters.timingStatus')}
                </span>
                <select className="input" value={timingStatus} onChange={(e) => { setTimingStatus(e.target.value); setPage(1); }}>
                  <option value="">{t('admin.student360.financeOps.filters.all')}</option>
                  <option value="upcoming">{t('admin.student360.financeOps.timingStatus.upcoming')}</option>
                  <option value="due">{t('admin.student360.financeOps.timingStatus.due')}</option>
                  <option value="overdue">{t('admin.student360.financeOps.timingStatus.overdue')}</option>
                </select>
              </label>
            </div>
            <div className="student-finance-schedule-filters-panel__group student-finance-schedule-filters-panel__group--dates">
              <label className="student-finance-schedule-filters-panel__field">
                <span className="student-finance-schedule-filters-panel__label">
                  {t('admin.student360.financeOps.filters.dateFrom')}
                </span>
                <input className="input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
              </label>
              <label className="student-finance-schedule-filters-panel__field">
                <span className="student-finance-schedule-filters-panel__label">
                  {t('admin.student360.financeOps.filters.dateTo')}
                </span>
                <input className="input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
              </label>
            </div>
          </div>
        ) : null}

        {installmentsState.initialLoading ? <StudentSectionSkeleton rows={6} /> : null}
        {installmentsState.error ? <ApiErrorView error={installmentsState.error} onRetry={installmentsState.reload} /> : null}
        {!installmentsState.initialLoading && !installmentsState.error && installmentsState.data.length === 0 ? (
          <div className="student-finance-schedule-empty" role="status">
            <span className="student-finance-schedule-empty__icon" aria-hidden="true">
              —
            </span>
            <p>{t('admin.student360.financeWorkspace.schedule.emptyTitle')}</p>
          </div>
        ) : null}
        {!installmentsState.error && installmentsState.data.length > 0 ? (
          <>
            <div className="student-finance-table-wrap">
              <DataTable columns={columns} rows={installmentsState.data} rowKey={(row) => row.id} />
            </div>
            {installmentsState.data.length >= 100 ? (
              <Pagination page={page} totalPages={page + 1} total={page * 100} onPage={setPage} />
            ) : null}
          </>
        ) : null}
      </article>
    </div>
  );
}
