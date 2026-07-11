'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Cash Desk sessions list shell only.
 * Open/close/reopen, difference approval, collection gate, and closure PDF remain outside adopted scope.
 */

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { CashSessionStatusBadge } from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import {
  CASH_DESK_SESSIONS_PAGE_SIZE,
  cashDeskSessionsListHasActiveQuery,
  formatCashSessionListDateTime,
  resolveCashDeskSessionsListEmptyVariant,
} from '@/features/admin/finance/cash-desk/cash-desk-sessions-list-present';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  cashSessionDisplayNumber,
  cashSessionJournalLabel,
  parseCashSessionList,
} from '@/lib/utils/cash-session-normalize';
import { refName } from '@/lib/utils/finance';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { CashSession } from '@/types/finance-cash-desk';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/cash-desk/cash-desk-sessions-list.css';

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

export function CashDeskSessionsListPanel() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatDateTime } = useFormat();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/cash-desk/sessions');
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const dash = t('common.dash');

  const hasActiveQuery = cashDeskSessionsListHasActiveQuery(filters);
  const emptyVariant = resolveCashDeskSessionsListEmptyVariant({ hasActiveQuery });

  const query: ListParams = useMemo(
    () => ({
      page: filters.page,
      page_size: CASH_DESK_SESSIONS_PAGE_SIZE,
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
  const isRefetching = state.fetching && !state.initialLoading;
  const pg = parsed.pagination;

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
      for (const [key, value] of Object.entries(updates) as Array<
        [keyof SessionFilters, string | number | null]
      >) {
        const paramKey = map[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) params.delete(paramKey);
        else params.set(paramKey, String(value));
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/cash-desk/sessions?${qs}` : '/admin/finance/cash-desk/sessions');
    },
    [router, searchParams],
  );

  const resetFilters = useCallback(() => {
    router.replace('/admin/finance/cash-desk/sessions');
  }, [router]);

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
        render: (row) => (
          <span className="cash-desk-sessions-list__datetime" dir="ltr">
            {formatCashSessionListDateTime(row.opened_at, formatDateTime, dash)}
          </span>
        ),
      },
      {
        key: 'journal',
        header: t('admin.finance.cashDesk.fields.journal'),
        render: (row) => (
          <span dir="auto">{cashSessionJournalLabel(row) ?? dash}</span>
        ),
      },
      {
        key: 'cashier',
        header: t('admin.finance.cashDesk.fields.cashier'),
        render: (row) => (
          <span dir="auto">{row.cashier_name ?? refName(row.cashier) ?? dash}</span>
        ),
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
          <span className="cash-desk-sessions-list__amount">
            <FinanceMoney
              amount={row.opening_balance ?? row.summary?.opening_balance ?? null}
              currency={row.currency}
            />
          </span>
        ),
      },
      {
        key: 'expected',
        header: t('admin.finance.cashDesk.kpiExpected'),
        render: (row) => (
          <span className="cash-desk-sessions-list__amount">
            <FinanceMoney
              amount={row.expected_balance ?? row.summary?.expected_balance ?? null}
              currency={row.currency}
            />
          </span>
        ),
      },
      {
        key: 'counted',
        header: t('admin.finance.cashDesk.fields.countedBalance'),
        render: (row) => (
          <span className="cash-desk-sessions-list__amount">
            <FinanceMoney amount={row.counted_balance ?? null} currency={row.currency} />
          </span>
        ),
      },
      {
        key: 'difference',
        header: t('admin.finance.cashDesk.fields.difference'),
        render: (row) => (
          <span className="cash-desk-sessions-list__amount">
            <FinanceMoney amount={row.difference ?? null} currency={row.currency} />
          </span>
        ),
      },
      {
        key: 'closed_at',
        header: t('admin.finance.cashDesk.fields.closedAt'),
        render: (row) => (
          <span className="cash-desk-sessions-list__datetime" dir="ltr">
            {formatCashSessionListDateTime(row.closed_at, formatDateTime, dash)}
          </span>
        ),
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
    [dash, formatDateTime, returnTo, t],
  );

  const emptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        title={t('admin.finance.cashDesk.sessionsNoMatch.title')}
        description={t('admin.finance.cashDesk.sessionsNoMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.finance.cashDesk.sessionsResetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState title={t('admin.finance.cashDesk.sessionsEmpty')} />
    );

  return (
    <div className="cash-desk-sessions-page cash-desk-sessions-list finance-receivable-list">
      <PageHeader
        title={t('admin.finance.cashDesk.sessionsTitle')}
        subtitle={t('admin.finance.cashDesk.sessionsSubtitle')}
        actions={
          <Link className="btn btn--ghost" href="/admin/finance/cash-desk">
            {t('admin.finance.cashDesk.backToDesk')}
          </Link>
        }
      />

      {pg?.total != null ? (
        <p className="finance-receivable-list__result-count" dir="ltr">
          {t('admin.finance.cashDesk.sessionsResultCount', { total: pg.total })}
        </p>
      ) : null}

      <form
        className="finance-overview-filters row finance-receivable-list__toolbar cash-desk-sessions-list__toolbar"
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
          <input className="input" name="journal_id" defaultValue={filters.journalId} dir="ltr" />
        </label>
        <label>
          <span className="muted">{t('admin.finance.cashDesk.fields.cashier')}</span>
          <input className="input" name="cashier_id" defaultValue={filters.cashierId} dir="ltr" />
        </label>
        <label>
          <span className="muted">{t('admin.finance.cashDesk.filters.dateFrom')}</span>
          <input
            className="input"
            type="date"
            name="date_from"
            defaultValue={filters.dateFrom}
            dir="ltr"
          />
        </label>
        <label>
          <span className="muted">{t('admin.finance.cashDesk.filters.dateTo')}</span>
          <input
            className="input"
            type="date"
            name="date_to"
            defaultValue={filters.dateTo}
            dir="ltr"
          />
        </label>
        <button type="submit" className="btn btn--ghost">
          {t('common.filter')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost" onClick={resetFilters}>
            {t('admin.finance.cashDesk.sessionsResetFilters')}
          </button>
        ) : null}
      </form>

      {hasActiveQuery ? (
        <div
          className="finance-receivable-list__chips"
          aria-label={t('admin.finance.cashDesk.sessionsActiveFilters')}
        >
          {filters.state ? (
            <span className="finance-receivable-list__chip">
              {t(`admin.finance.cashDesk.states.${filters.state}`)}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => updateFilters({ state: '', page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
          {filters.journalId ? (
            <span className="finance-receivable-list__chip">
              <span dir="ltr">{filters.journalId}</span>
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => updateFilters({ journalId: '', page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
          {filters.cashierId ? (
            <span className="finance-receivable-list__chip">
              <span dir="ltr">{filters.cashierId}</span>
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => updateFilters({ cashierId: '', page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
          {filters.dateFrom || filters.dateTo ? (
            <span className="finance-receivable-list__chip">
              <span dir="ltr">
                {filters.dateFrom || '…'} → {filters.dateTo || '…'}
              </span>
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => updateFilters({ dateFrom: '', dateTo: '', page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.cashDesk.sessionsRefetching')}
        </p>
      ) : null}

      {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}

      {!state.error && !state.initialLoading && !parsed.items.length ? emptyState : null}

      {state.initialLoading ? <div className="skeleton skeleton--card" aria-busy="true" /> : null}

      {!state.initialLoading && !state.error && parsed.items.length > 0 ? (
        <div
          className={
            isRefetching
              ? 'cash-desk-sessions-list__table-wrap finance-receivable-list__results finance-receivable-list__results--fetching'
              : 'cash-desk-sessions-list__table-wrap finance-receivable-list__results'
          }
        >
          <DataTable columns={columns} rows={parsed.items} rowKey={(row) => row.id} />
          {pg ? (
            <Pagination
              page={pg.page}
              totalPages={pg.total_pages}
              total={pg.total}
              pageSize={pg.page_size}
              onPage={(page) => updateFilters({ page })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
