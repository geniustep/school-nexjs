'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { ChequeDueIndicator } from '@/features/admin/finance/cheque-due-indicator';
import { ChequeDualBadges } from '@/features/admin/student-finance/components/cheque-dual-badges';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_CHEQUES } from '@/lib/permissions/finance';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import {
  rejectedChequeListApiState,
  totalRejectedChequeCount,
} from '@/lib/utils/cheque-status';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { FinanceCheque } from '@/types/finance';
import type { ListParams } from '@/types/api';

type QuickFilter = '' | 'pending' | 'due_today' | 'overdue' | 'deposited' | 'cleared' | 'rejected' | 'cancelled';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function useChequeCount(params: ListParams) {
  const state = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, {
    ...params,
    page: 1,
    page_size: 1,
  });
  return state.meta?.pagination?.total ?? null;
}

const QUICK_TITLE_KEYS: Partial<Record<QuickFilter, string>> = {
  rejected: 'admin.finance.cheques.titleRejected',
  deposited: 'admin.finance.cheques.titleDeposited',
  cleared: 'admin.finance.cheques.titleCleared',
  pending: 'admin.finance.cheques.titlePending',
  overdue: 'admin.finance.cheques.titleOverdue',
  due_today: 'admin.finance.cheques.titleDueToday',
  cancelled: 'admin.finance.cheques.titleCancelled',
};

const QUICK_DESC_KEYS: Partial<Record<QuickFilter, string>> = {
  rejected: 'admin.finance.cheques.descRejected',
  deposited: 'admin.finance.cheques.descDeposited',
  cleared: 'admin.finance.cheques.descCleared',
  pending: 'admin.finance.cheques.descPending',
  overdue: 'admin.finance.cheques.descOverdue',
  due_today: 'admin.finance.cheques.descDueToday',
  cancelled: 'admin.finance.cheques.descCancelled',
};

export default function AdminFinanceChequesPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/cheques');
  const studentIdFilter = searchParams.get('student_id') ?? '';
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('');

  useEffect(() => {
    const quick = searchParams.get('quick') as QuickFilter | null;
    if (quick) setQuickFilter(quick);
  }, [searchParams]);

  const rejectedOnlyCount = useChequeCount({ state: 'rejected' });
  const bouncedOnlyCount = useChequeCount({ state: 'bounced' });
  const rejectedCount = totalRejectedChequeCount(rejectedOnlyCount, bouncedOnlyCount);

  const receivedCount = useChequeCount({ state: 'received' });
  const depositedCount = useChequeCount({ state: 'deposited' });
  const clearedCount = useChequeCount({ state: 'cleared' });
  const overdueCount = useChequeCount({ overdue_only: 'true' });
  const dueTodayCount = useChequeCount({
    state: 'received',
    maturity_date_from: todayIso(),
    maturity_date_to: todayIso(),
  });

  const params: ListParams = useMemo(() => {
    const p: ListParams = {
      page,
      page_size: 20,
      search: query || undefined,
      student_id: studentIdFilter || undefined,
    };
    if (dueFrom) p.maturity_date_from = dueFrom;
    if (dueTo) p.maturity_date_to = dueTo;
    if (overdueOnly) p.overdue_only = 'true';
    if (quickFilter === 'pending') p.state = 'received';
    if (quickFilter === 'deposited') p.state = 'deposited';
    if (quickFilter === 'cleared') p.state = 'cleared';
    if (quickFilter === 'rejected') {
      p.state = rejectedChequeListApiState(rejectedOnlyCount, bouncedOnlyCount);
    }
    if (quickFilter === 'cancelled') p.state = 'cancelled';
    if (quickFilter === 'overdue') p.overdue_only = 'true';
    if (quickFilter === 'due_today') {
      const today = todayIso();
      p.maturity_date_from = today;
      p.maturity_date_to = today;
    }
    return p;
  }, [
    page,
    query,
    dueFrom,
    dueTo,
    overdueOnly,
    quickFilter,
    studentIdFilter,
    rejectedOnlyCount,
    bouncedOnlyCount,
  ]);

  const state = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, params);
  const rows = parseFinanceList<FinanceCheque>(state.data);
  const pg = state.meta?.pagination;

  const hasFilters = !!(query || dueFrom || dueTo || overdueOnly || quickFilter);

  const summaryItems = [
    { key: 'received', label: t('admin.finance.cheques.summary.received'), value: receivedCount, quick: 'pending' as QuickFilter },
    { key: 'deposited', label: t('admin.finance.cheques.summary.deposited'), value: depositedCount, quick: 'deposited' as QuickFilter },
    { key: 'due_today', label: t('admin.finance.cheques.summary.dueToday'), value: dueTodayCount, quick: 'due_today' as QuickFilter },
    { key: 'overdue', label: t('admin.finance.cheques.summary.overdue'), value: overdueCount, quick: 'overdue' as QuickFilter },
    { key: 'cleared', label: t('admin.finance.cheques.summary.cleared'), value: clearedCount, quick: 'cleared' as QuickFilter },
    { key: 'rejected', label: t('admin.finance.cheques.summary.rejected'), value: rejectedCount, quick: 'rejected' as QuickFilter },
  ].filter((item) => item.value != null);

  const columns: Column<FinanceCheque>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.cheques.chequeNumber'),
        render: (row) => <span className="mono">{row.cheque_number ?? t('common.dash')}</span>,
      },
      {
        key: 'holder',
        header: t('admin.finance.cheques.holderName'),
        render: (row) => <span dir="auto">{row.holder_name ?? t('common.dash')}</span>,
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => {
          const sid = row.student_id ?? row.student?.id;
          const label =
            row.student_name ?? financeStudentDisplayName(row.student ?? {}) ?? t('admin.finance.unavailable');
          if (!sid) return <span dir="auto">{label}</span>;
          return (
            <Link
              href={buildStudentFinanceLink(sid, 'finance', returnTo)}
              onClick={(e) => e.stopPropagation()}
              dir="auto"
            >
              {label}
            </Link>
          );
        },
      },
      {
        key: 'bank',
        header: t('admin.finance.cheques.bankName'),
        render: (row) => <span dir="auto">{row.bank_name ?? t('common.dash')}</span>,
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={row.currency} />,
      },
      {
        key: 'received',
        header: t('admin.finance.cheques.receivedDate'),
        render: (row) => formatDate(row.received_date) || t('common.dash'),
      },
      {
        key: 'due',
        header: t('admin.finance.cheques.dueDate'),
        render: (row) => formatDate(row.due_date) || t('common.dash'),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => (
          <ChequeDualBadges
            lifecycleState={(row as FinanceCheque & { lifecycle_state?: string }).lifecycle_state ?? row.state ?? 'received'}
            maturityStatus={(row as FinanceCheque & { maturity_status?: string }).maturity_status}
          />
        ),
      },
      {
        key: 'dueFlag',
        header: t('admin.finance.cheques.dueStatus'),
        render: (row) => <ChequeDueIndicator cheque={row} />,
      },
    ],
    [t, formatDate, returnTo],
  );

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: 'pending', label: t('admin.finance.cheques.filters.pending') },
    { key: 'due_today', label: t('admin.finance.cheques.filters.dueToday') },
    { key: 'overdue', label: t('admin.finance.cheques.filters.overdue') },
    { key: 'deposited', label: t('admin.finance.cheques.filters.deposited') },
    { key: 'cleared', label: t('admin.finance.cheques.filters.cleared') },
    { key: 'rejected', label: t('admin.finance.cheques.filters.rejected') },
  ];

  function clearFilters() {
    setSearch('');
    setQuery('');
    setDueFrom('');
    setDueTo('');
    setOverdueOnly(false);
    setQuickFilter('');
    setPage(1);
    router.replace('/admin/finance/cheques');
  }

  const pageTitle = quickFilter && QUICK_TITLE_KEYS[quickFilter]
    ? t(QUICK_TITLE_KEYS[quickFilter]!)
    : t('admin.finance.cheques.title');
  const pageSubtitle = quickFilter && QUICK_DESC_KEYS[quickFilter]
    ? t(QUICK_DESC_KEYS[quickFilter]!)
    : t('admin.finance.cheques.subtitle');

  const emptyState = quickFilter ? (
    <EmptyState
      title={t('admin.finance.cheques.emptyFilteredTitle', {
        filter: t(`admin.finance.cheques.filters.${quickFilter === 'pending' ? 'pending' : quickFilter}`),
      })}
      description={t('admin.finance.cheques.emptyFilteredDesc')}
      action={
        <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
          {t('admin.finance.cheques.showAllCheques')}
        </button>
      }
    />
  ) : (
    <EmptyState title={t('admin.finance.cheques.empty')} />
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CHEQUES}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader title={pageTitle} subtitle={pageSubtitle} />

      {quickFilter ? (
        <div className="finance-cheque-active-filter">
          <span className="finance-cheque-active-filter__chip">
            {t('admin.finance.cheques.activeFilterChip', {
              filter: t(`admin.finance.cheques.filters.${quickFilter === 'pending' ? 'pending' : quickFilter}`),
            })}
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
            {t('admin.finance.cheques.clearFilter')}
          </button>
        </div>
      ) : null}

      {summaryItems.length > 0 ? (
        <div className="finance-metrics-grid finance-cheque-summary-grid finance-cheque-summary-grid--balanced">
          {summaryItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`card finance-metric-card finance-cheque-summary-card${quickFilter === item.quick ? ' is-active' : ''}`}
              onClick={() => {
                setPage(1);
                setQuickFilter((prev) => (prev === item.quick ? '' : item.quick));
                setOverdueOnly(false);
              }}
            >
              <span className="muted">{item.label}</span>
              <strong className="mono">{item.value}</strong>
            </button>
          ))}
        </div>
      ) : null}

      <div className="finance-cheque-quick-filters finance-cheque-quick-filters--compact">
        {quickFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`btn btn--ghost btn--sm${quickFilter === f.key ? ' is-active' : ''}`}
            onClick={() => {
              setPage(1);
              setQuickFilter((prev) => (prev === f.key ? '' : f.key));
              setOverdueOnly(false);
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
        }}
      >
        <input
          className="input"
          placeholder={t('admin.finance.cheques.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="input"
          type="date"
          value={dueFrom}
          onChange={(e) => setDueFrom(e.target.value)}
          aria-label={t('admin.finance.cheques.dueFrom')}
        />
        <input
          className="input"
          type="date"
          value={dueTo}
          onChange={(e) => setDueTo(e.target.value)}
          aria-label={t('admin.finance.cheques.dueTo')}
        />
        <label className="row finance-cheque-overdue-toggle">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              if (e.target.checked) setQuickFilter('');
            }}
          />
          {t('admin.finance.cheques.filters.overdueOnly')}
        </label>
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
        {hasFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
            {t('admin.finance.collections.resetFilters')}
          </button>
        ) : null}
      </form>

      <ResourceView
        state={{ ...state, data: rows.length ? rows : state.data }}
        loadingLabel={t('common.loading')}
        empty={emptyState}
      >
        {(list) => (
          <>
            <DataTable
              columns={columns}
              rows={list}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(`/admin/finance/cheques/${row.id}`)}
            />
            {pg ? (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            ) : null}
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
