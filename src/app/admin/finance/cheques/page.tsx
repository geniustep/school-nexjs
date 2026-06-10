'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { ChequeDueIndicator } from '@/features/admin/finance/cheque-due-indicator';
import { ChequeStatusBadge } from '@/features/admin/finance/cheque-status-badge';
import { ChequeSummaryCard } from '@/features/admin/finance/cheque-summary-card';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_CHEQUES } from '@/lib/permissions/finance';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { FinanceCheque } from '@/types/finance';
import type { ListParams } from '@/types/api';

type QuickFilter = '' | 'pending' | 'due_today' | 'overdue' | 'deposited' | 'cleared' | 'rejected' | 'cancelled';

export default function AdminFinanceChequesPage() {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('');

  const params: ListParams = useMemo(() => {
    const p: ListParams = { page, page_size: 20, search: query || undefined };
    if (stateFilter) p.state = stateFilter;
    if (dueFrom) p.due_from = dueFrom;
    if (dueTo) p.due_to = dueTo;
    if (overdueOnly) p.overdue_only = 'true';
    if (quickFilter === 'pending') p.state = 'received';
    if (quickFilter === 'deposited') p.state = 'deposited';
    if (quickFilter === 'cleared') p.state = 'cleared';
    if (quickFilter === 'rejected') p.state = 'rejected';
    if (quickFilter === 'cancelled') p.state = 'cancelled';
    if (quickFilter === 'overdue') p.overdue_only = 'true';
    if (quickFilter === 'due_today') {
      const today = new Date().toISOString().slice(0, 10);
      p.due_from = today;
      p.due_to = today;
    }
    return p;
  }, [page, query, stateFilter, dueFrom, dueTo, overdueOnly, quickFilter]);

  const state = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, params);
  const rows = parseFinanceList<FinanceCheque>(state.data);
  const pg = state.meta?.pagination;

  const alertState = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, {
    page: 1,
    page_size: 5,
    overdue_only: 'true',
  });
  const dueSoonState = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, {
    page: 1,
    page_size: 5,
    due_to: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    state: 'received',
  });
  const depositedPendingState = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, {
    page: 1,
    page_size: 5,
    state: 'deposited',
  });

  const columns: Column<FinanceCheque>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.cheques.chequeNumber'),
        render: (row) => row.cheque_number ?? t('common.dash'),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) =>
          row.student_name ?? financeStudentDisplayName(row.student ?? {}) ?? t('common.dash'),
      },
      {
        key: 'holder',
        header: t('admin.finance.cheques.holderName'),
        render: (row) => row.holder_name ?? t('common.dash'),
      },
      {
        key: 'bank',
        header: t('admin.finance.cheques.bankName'),
        render: (row) => row.bank_name ?? t('common.dash'),
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
        render: (row) => <ChequeStatusBadge state={row.state ?? 'received'} />,
      },
      {
        key: 'dueFlag',
        header: t('admin.finance.cheques.dueStatus'),
        render: (row) => <ChequeDueIndicator cheque={row} />,
      },
    ],
    [t, formatDate],
  );

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: 'pending', label: t('admin.finance.cheques.filters.pending') },
    { key: 'due_today', label: t('admin.finance.cheques.filters.dueToday') },
    { key: 'overdue', label: t('admin.finance.cheques.filters.overdue') },
    { key: 'deposited', label: t('admin.finance.cheques.filters.deposited') },
    { key: 'cleared', label: t('admin.finance.cheques.filters.cleared') },
    { key: 'rejected', label: t('admin.finance.cheques.filters.rejected') },
    { key: 'cancelled', label: t('admin.finance.cheques.filters.cancelled') },
  ];

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CHEQUES}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader title={t('admin.finance.cheques.title')} subtitle={t('admin.finance.cheques.subtitle')} />

      <section className="finance-cheque-alerts">
        {parseFinanceList<FinanceCheque>(dueSoonState.data).length > 0 && (
          <div className="card">
            <h3>{t('admin.finance.cheques.alerts.dueSoon')}</h3>
            <div className="finance-cheque-alert-grid">
              {parseFinanceList<FinanceCheque>(dueSoonState.data).map((c) => (
                <ChequeSummaryCard key={c.id} cheque={c} />
              ))}
            </div>
          </div>
        )}
        {parseFinanceList<FinanceCheque>(alertState.data).length > 0 && (
          <div className="card">
            <h3>{t('admin.finance.cheques.alerts.overdue')}</h3>
            <div className="finance-cheque-alert-grid">
              {parseFinanceList<FinanceCheque>(alertState.data).map((c) => (
                <ChequeSummaryCard key={c.id} cheque={c} />
              ))}
            </div>
          </div>
        )}
        {parseFinanceList<FinanceCheque>(depositedPendingState.data).length > 0 && (
          <div className="card">
            <h3>{t('admin.finance.cheques.alerts.depositedNotCleared')}</h3>
            <div className="finance-cheque-alert-grid">
              {parseFinanceList<FinanceCheque>(depositedPendingState.data).map((c) => (
                <ChequeSummaryCard key={c.id} cheque={c} />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="finance-cheque-quick-filters">
        {quickFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`btn btn--ghost btn--sm${quickFilter === f.key ? ' is-active' : ''}`}
            onClick={() => {
              setPage(1);
              setQuickFilter((prev) => (prev === f.key ? '' : f.key));
              setStateFilter('');
              setOverdueOnly(false);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
          setQuickFilter('');
        }}
      >
        <input
          className="input"
          placeholder={t('admin.finance.cheques.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setQuickFilter('');
          }}
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="received">{t('admin.finance.cheques.states.received')}</option>
          <option value="deposited">{t('admin.finance.cheques.states.deposited')}</option>
          <option value="cleared">{t('admin.finance.cheques.states.cleared')}</option>
          <option value="rejected">{t('admin.finance.cheques.states.rejected')}</option>
          <option value="cancelled">{t('admin.finance.cheques.states.cancelled')}</option>
        </select>
        <input className="input" type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} aria-label={t('admin.finance.cheques.dueFrom')} />
        <input className="input" type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} aria-label={t('admin.finance.cheques.dueTo')} />
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              setQuickFilter('');
            }}
          />
          {t('admin.finance.cheques.filters.overdueOnly')}
        </label>
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
      </form>

      <ResourceView
        state={{ ...state, data: rows.length ? rows : state.data }}
        loadingLabel={t('common.loading')}
        empty={<EmptyState title={t('admin.finance.cheques.empty')} />}
      >
        {(list) => (
          <>
            <DataTable
              columns={columns}
              rows={list}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(`/admin/finance/cheques/${row.id}`)}
            />
            {pg && <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />}
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
