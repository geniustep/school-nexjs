'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { CashSessionStatusBadge } from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/finance/finance-ui.css';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_CASH_SESSIONS } from '@/lib/permissions/finance';
import {
  cashSessionDisplayNumber,
  cashSessionJournalLabel,
  parseCashSessionList,
} from '@/lib/utils/cash-session-normalize';
import { refName } from '@/lib/utils/finance';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { CashSession } from '@/types/finance-cash-desk';
import type { ListParams } from '@/types/api';

type SessionFilters = {
  state: string;
  journalId: string;
  cashierId: string;
  dateFrom: string;
  dateTo: string;
  page: number;
};

function readFilters(searchParams: URLSearchParams): SessionFilters {
  const pageRaw = searchParams.get('page');
  return {
    state: searchParams.get('state') ?? '',
    journalId: searchParams.get('journal_id') ?? '',
    cashierId: searchParams.get('cashier_id') ?? '',
    dateFrom: searchParams.get('date_from') ?? '',
    dateTo: searchParams.get('date_to') ?? '',
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
  };
}

export default function CashDeskSessionsPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatDateTime } = useFormat();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/cash-desk/sessions');
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const query: ListParams = useMemo(
    () => ({
      page: filters.page,
      page_size: 20,
      state: filters.state || undefined,
      journal_id: filters.journalId || undefined,
      cashier_id: filters.cashierId || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    }),
    [filters],
  );

  const state = useAdminResource<unknown>(endpoints.admin.financeCashSessions, query);
  const parsed = useMemo(
    () => parseCashSessionList(state.data, state.meta),
    [state.data, state.meta],
  );

  const updateFilters = useCallback(
    (updates: Partial<Record<keyof SessionFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      const map: Record<keyof SessionFilters, string> = {
        state: 'state',
        journalId: 'journal_id',
        cashierId: 'cashier_id',
        dateFrom: 'date_from',
        dateTo: 'date_to',
        page: 'page',
      };
      for (const [key, value] of Object.entries(updates) as Array<[keyof SessionFilters, string | number | null]>) {
        const paramKey = map[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) params.delete(paramKey);
        else params.set(paramKey, String(value));
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/cash-desk/sessions?${qs}` : '/admin/finance/cash-desk/sessions');
    },
    [router, searchParams],
  );

  const columns: Column<CashSession>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.cashDesk.fields.sessionNumber'),
        render: (row) => cashSessionDisplayNumber(row),
      },
      {
        key: 'opened_at',
        header: t('admin.finance.cashDesk.fields.openedAt'),
        render: (row) => (row.opened_at ? formatDateTime(row.opened_at) : '—'),
      },
      {
        key: 'journal',
        header: t('admin.finance.cashDesk.fields.journal'),
        render: (row) => cashSessionJournalLabel(row) ?? '—',
      },
      {
        key: 'cashier',
        header: t('admin.finance.cashDesk.fields.cashier'),
        render: (row) => row.cashier_name ?? refName(row.cashier) ?? '—',
      },
      {
        key: 'state',
        header: t('admin.finance.cashDesk.fields.state'),
        render: (row) => <CashSessionStatusBadge state={row.state} />,
      },
      {
        key: 'opening',
        header: t('admin.finance.cashDesk.kpiOpening'),
        render: (row) => (
          <FinanceMoney amount={row.opening_balance ?? row.summary?.opening_balance ?? null} currency={row.currency} />
        ),
      },
      {
        key: 'expected',
        header: t('admin.finance.cashDesk.kpiExpected'),
        render: (row) => (
          <FinanceMoney amount={row.expected_balance ?? row.summary?.expected_balance ?? null} currency={row.currency} />
        ),
      },
      {
        key: 'counted',
        header: t('admin.finance.cashDesk.fields.countedBalance'),
        render: (row) => <FinanceMoney amount={row.counted_balance ?? null} currency={row.currency} />,
      },
      {
        key: 'difference',
        header: t('admin.finance.cashDesk.fields.difference'),
        render: (row) => <FinanceMoney amount={row.difference ?? null} currency={row.currency} />,
      },
      {
        key: 'closed_at',
        header: t('admin.finance.cashDesk.fields.closedAt'),
        render: (row) => (row.closed_at ? formatDateTime(row.closed_at) : '—'),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <Link
            className="btn btn--ghost btn--sm"
            href={appendReturnTo(`/admin/finance/cash-desk/sessions/${row.id}`, returnTo)}
          >
            {t('common.view')}
          </Link>
        ),
      },
    ],
    [formatDateTime, returnTo, t],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CASH_SESSIONS}>
      <div className="cash-desk-sessions-page">
        <PageHeader
          title={t('admin.finance.cashDesk.sessionsTitle')}
          subtitle={t('admin.finance.cashDesk.sessionsSubtitle')}
          actions={
            <Link className="btn btn--ghost" href="/admin/finance/cash-desk">
              {t('admin.finance.cashDesk.backToDesk')}
            </Link>
          }
        />

        <form
          className="finance-overview-filters row"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            updateFilters({
              state: String(fd.get('state') ?? ''),
              journalId: String(fd.get('journal_id') ?? ''),
              cashierId: String(fd.get('cashier_id') ?? ''),
              dateFrom: String(fd.get('date_from') ?? ''),
              dateTo: String(fd.get('date_to') ?? ''),
              page: 1,
            });
          }}
        >
          <label>
            <span className="muted">{t('admin.finance.cashDesk.fields.state')}</span>
            <select className="input" name="state" defaultValue={filters.state}>
              <option value="">{t('common.all')}</option>
              <option value="open">{t('admin.finance.cashDesk.states.open')}</option>
              <option value="closing">{t('admin.finance.cashDesk.states.closing')}</option>
              <option value="closed">{t('admin.finance.cashDesk.states.closed')}</option>
              <option value="reopened">{t('admin.finance.cashDesk.states.reopened')}</option>
            </select>
          </label>
          <label>
            <span className="muted">{t('admin.finance.cashDesk.fields.journal')}</span>
            <input className="input" name="journal_id" defaultValue={filters.journalId} />
          </label>
          <label>
            <span className="muted">{t('admin.finance.cashDesk.fields.cashier')}</span>
            <input className="input" name="cashier_id" defaultValue={filters.cashierId} />
          </label>
          <label>
            <span className="muted">{t('admin.finance.cashDesk.filters.dateFrom')}</span>
            <input className="input" type="date" name="date_from" defaultValue={filters.dateFrom} />
          </label>
          <label>
            <span className="muted">{t('admin.finance.cashDesk.filters.dateTo')}</span>
            <input className="input" type="date" name="date_to" defaultValue={filters.dateTo} />
          </label>
          <button type="submit" className="btn btn--ghost">
            {t('common.filter')}
          </button>
        </form>

        {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}

        {!state.initialLoading && !parsed.items.length ? (
          <EmptyState title={t('admin.finance.cashDesk.sessionsEmpty')} />
        ) : state.initialLoading ? (
          <div className="skeleton skeleton--card" aria-busy="true" />
        ) : (
          <>
            <DataTable columns={columns} rows={parsed.items} rowKey={(row) => row.id} />
            {parsed.pagination ? (
              <Pagination
                page={parsed.pagination.page}
                totalPages={parsed.pagination.total_pages}
                total={parsed.pagination.total}
                pageSize={parsed.pagination.page_size}
                onPage={(page) => updateFilters({ page })}
              />
            ) : null}
          </>
        )}
      </div>
    </RequireAdminPermission>
  );
}
