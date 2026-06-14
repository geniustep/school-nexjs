'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { useStudentInstallments } from '@/features/admin/student-finance/hooks/use-student-installments';
import type { InstallmentListParams, StudentInstallment } from '@/features/admin/student-finance/types';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import { resolveReferenceLabel } from '@/features/admin/student-finance/utils/reference-labels';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { refName } from '@/lib/utils/finance';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

type QuickView =
  | ''
  | 'overdue_unpaid'
  | 'partially_paid'
  | 'due_today'
  | 'due_7_days'
  | 'hidden';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function inDaysIso(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export function InstallmentsListPanel({
  studentId,
  returnTo,
  initialQuick,
}: {
  studentId: number;
  returnTo?: string | null;
  initialQuick?: QuickView;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const refState = useFinanceReferenceData();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [timingStatus, setTimingStatus] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [visibleOnly, setVisibleOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quickView, setQuickView] = useState<QuickView>(initialQuick ?? '');

  useEffect(() => {
    if (initialQuick) setQuickView(initialQuick);
  }, [initialQuick]);

  const installmentQuery: InstallmentListParams = useMemo(() => {
    const base: InstallmentListParams = {
      page,
      page_size: 20,
      search: query || undefined,
      payment_status: paymentStatus || undefined,
      service_category: serviceCategory || undefined,
      visible_only: visibleOnly ? 1 : undefined,
      overdue_only: overdueOnly ? 1 : undefined,
      due_date_from: dateFrom || undefined,
      due_date_to: dateTo || undefined,
    };

    if (quickView === 'overdue_unpaid') {
      base.timing_status = 'overdue';
      base.exclude_paid = 1;
    } else if (quickView === 'partially_paid') {
      base.payment_status = 'partially_paid';
    } else if (quickView === 'due_today') {
      base.due_date_from = todayIso();
      base.due_date_to = todayIso();
    } else if (quickView === 'due_7_days') {
      base.due_date_from = todayIso();
      base.due_date_to = inDaysIso(7);
    } else if (quickView === 'hidden') {
      base.visible_only = 0;
    } else if (timingStatus) {
      base.timing_status = timingStatus;
    }

    return base;
  }, [
    page,
    query,
    paymentStatus,
    timingStatus,
    serviceCategory,
    visibleOnly,
    overdueOnly,
    dateFrom,
    dateTo,
    quickView,
  ]);

  const state = useStudentInstallments(studentId, installmentQuery);
  const pg = state.meta?.pagination;
  const safeReturn = sanitizeReturnTo(returnTo, '/admin/finance/installments');

  const quickFilters: { key: QuickView; label: string }[] = [
    { key: 'overdue_unpaid', label: t('admin.finance.installments.quick.overdueUnpaid') },
    { key: 'partially_paid', label: t('admin.finance.installments.quick.partiallyPaid') },
    { key: 'due_today', label: t('admin.finance.installments.quick.dueToday') },
    { key: 'due_7_days', label: t('admin.finance.installments.quick.dueSevenDays') },
    { key: 'hidden', label: t('admin.finance.installments.quick.hiddenFromParent') },
  ];

  const columns: Column<StudentInstallment>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('nav.students'),
        render: (_row: StudentInstallment) => (
          <Link
            href={buildStudentFinanceLink(studentId, 'finance', safeReturn)}
            onClick={(e) => e.stopPropagation()}
          >
            #{studentId}
          </Link>
        ),
      },
      {
        key: 'service',
        header: t('admin.finance.installments.columns.service'),
        render: (row: StudentInstallment) => refName(row.service) ?? t('common.dash'),
      },
      {
        key: 'period',
        header: t('admin.finance.installments.columns.period'),
        render: (row: StudentInstallment) => formatPeriodRange(formatDate, row.period_start, row.period_end),
      },
      {
        key: 'display_from',
        header: t('admin.finance.installments.columns.displayFrom'),
        render: (row: StudentInstallment) => formatDate(row.display_from) || t('common.dash'),
      },
      {
        key: 'due_date',
        header: t('admin.finance.installments.columns.dueDate'),
        render: (row: StudentInstallment) => formatDate(row.due_date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.finance.installments.columns.amount'),
        render: (row: StudentInstallment) => <FinanceMoney amount={row.amount} />,
      },
      {
        key: 'paid',
        header: t('admin.finance.installments.columns.paid'),
        render: (row: StudentInstallment) => <FinanceMoney amount={row.confirmed_paid_amount} />,
      },
      {
        key: 'pending_cheque',
        header: t('admin.finance.installments.columns.pendingCheque'),
        render: (row: StudentInstallment) => <FinanceMoney amount={row.pending_cheque_amount} />,
      },
      {
        key: 'remaining',
        header: t('admin.finance.installments.columns.remaining'),
        render: (row: StudentInstallment) => <FinanceMoney amount={row.remaining_amount} />,
      },
      {
        key: 'status',
        header: t('admin.finance.installments.columns.status'),
        render: (row: StudentInstallment) => (
          <InstallmentStatusBadges
            paymentStatus={row.payment_status ?? 'unpaid'}
            timingStatus={row.timing_status ?? 'not_applicable'}
            isVisible={row.is_visible}
          />
        ),
      },
    ],
    [t, formatDate, studentId, safeReturn],
  );

  return (
    <>
      <div className="finance-cheque-quick-filters">
        {quickFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`btn btn--ghost btn--sm${quickView === f.key ? ' is-active' : ''}`}
            onClick={() => {
              setPage(1);
              setQuickView((prev) => (prev === f.key ? '' : f.key));
              setOverdueOnly(false);
              setPaymentStatus('');
              setTimingStatus('');
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <form
        className="toolbar finance-hub-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
          setQuickView('');
        }}
      >
        <input
          className="input"
          placeholder={t('admin.finance.installments.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setQuickView('');
          }}
        >
          <option value="">{t('admin.finance.installments.filters.allPaymentStatuses')}</option>
          <option value="unpaid">{t('admin.finance.installments.paymentStatuses.unpaid')}</option>
          <option value="partially_paid">{t('admin.finance.installments.paymentStatuses.partiallyPaid')}</option>
          <option value="paid">{t('admin.finance.installments.paymentStatuses.paid')}</option>
        </select>
        <select
          className="input"
          value={timingStatus}
          onChange={(e) => {
            setTimingStatus(e.target.value);
            setQuickView('');
          }}
        >
          <option value="">{t('admin.finance.installments.filters.allTimingStatuses')}</option>
          <option value="upcoming">{t('admin.finance.installments.timingStatuses.upcoming')}</option>
          <option value="due">{t('admin.finance.installments.timingStatuses.due')}</option>
          <option value="overdue">{t('admin.finance.installments.timingStatuses.overdue')}</option>
          <option value="hidden">{t('admin.finance.installments.timingStatuses.hidden')}</option>
        </select>
        <select
          className="input"
          value={serviceCategory}
          onChange={(e) => setServiceCategory(e.target.value)}
        >
          <option value="">{t('admin.finance.installments.filters.allCategories')}</option>
          {(refState.data?.service_categories ?? []).map((c) => (
            <option key={c.value} value={c.value}>
              {resolveReferenceLabel(t, 'service_category', c.value, refState.data?.service_categories)}
            </option>
          ))}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={visibleOnly}
            onChange={(e) => setVisibleOnly(e.target.checked)}
          />
          {t('admin.finance.installments.filters.visibleOnly')}
        </label>
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              setQuickView('');
            }}
          />
          {t('admin.finance.installments.filters.overdueOnly')}
        </label>
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
      </form>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        empty={
          <EmptyState
            title={t('admin.finance.installments.emptyTitle')}
            description={t('admin.finance.installments.emptyDesc')}
          />
        }
      >
        {(rows) => (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
            {pg && (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
