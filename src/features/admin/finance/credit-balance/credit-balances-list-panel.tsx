'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { CollectionCreditDrawer } from '@/features/admin/finance/credit-balance/collection-credit-drawer';
import { CreditBalanceStatusBadge } from '@/features/admin/finance/credit-balance/credit-balance-status-badge';
import {
  CREDIT_BALANCES_PAGE_SIZE,
  creditBalancesListHasActiveQuery,
  formatCreditBalanceAccountLabel,
  resolveCreditBalancesListEmptyVariant,
} from '@/features/admin/finance/utils/credit-balances-list-present';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  aggregateCreditListSummary,
  creditBalanceErrorMessageKey,
  deriveCreditLifecycleState,
  normalizePagination,
  parseCreditBalanceListResponse,
} from '@/lib/utils/normalize-credit-balance';
import type { CreditBalanceListItem } from '@/types/finance-credit-balance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';

export type CreditBalancesListFilters = {
  search: string;
  billingPartnerId: string;
  state: string;
  hasAvailableCredit: boolean;
  page: number;
};

type CreditBalancesListPanelProps = {
  filters: CreditBalancesListFilters;
  onFiltersChange: (
    updates: Partial<Record<keyof CreditBalancesListFilters, string | number | boolean | null>>,
  ) => void;
  returnTo: string;
  onReload?: () => void;
  reloadNonce?: number;
};

function accountLabel(row: CreditBalanceListItem): string {
  const nested =
    row.billing_account && typeof row.billing_account === 'object'
      ? ((row.billing_account as { display_name?: string; name?: string }).display_name ??
        (row.billing_account as { name?: string }).name)
      : undefined;
  return formatCreditBalanceAccountLabel(row.display_name ?? nested, row.billing_partner_id);
}

export function CreditBalancesListPanel({
  filters,
  onFiltersChange,
  returnTo,
}: CreditBalancesListPanelProps) {
  const t = useT();
  const { schools, activeSchoolId } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const query: ListParams = useMemo(
    () => ({
      page: filters.page,
      page_size: CREDIT_BALANCES_PAGE_SIZE,
      search: filters.search || undefined,
      billing_partner_id: filters.billingPartnerId || undefined,
      state: filters.state || undefined,
      has_available_credit: filters.hasAvailableCredit ? 'true' : undefined,
    }),
    [filters],
  );

  const state = useAdminResource<unknown>(endpoints.admin.financeCreditBalances, query);
  const parsed = useMemo(
    () => parseCreditBalanceListResponse(state.data, state.meta),
    [state.data, state.meta],
  );
  const rows = parsed.items;
  const pg = normalizePagination(state.meta) ?? state.meta?.pagination ?? null;
  const totalCount = pg?.total ?? 0;
  const headerSummary =
    parsed.summary ?? (pg ? aggregateCreditListSummary(rows, pg) : null);

  const hasBlockedOnly =
    rows.some((row) => (row.gross_unallocated_amount ?? 0) > 0) &&
    rows.every((row) => (row.available_credit_amount ?? 0) <= 0) &&
    rows.some((row) => (row.blocked_unallocated_amount ?? 0) > 0);

  const hasActiveQuery = creditBalancesListHasActiveQuery(filters);
  const emptyVariant = resolveCreditBalancesListEmptyVariant({
    hasActiveQuery,
    hasAvailableCreditOnly: filters.hasAvailableCredit,
  });
  const isRefetching = state.fetching && !state.initialLoading;

  const columns: Column<CreditBalanceListItem>[] = useMemo(
    () => [
      {
        key: 'payer',
        header: t('admin.finance.creditBalances.columns.payer'),
        render: (row) => (
          <Link
            href={`/admin/finance/billing-accounts/${row.billing_partner_id}/credit-balance?returnTo=${encodeURIComponent(returnTo)}`}
            dir="auto"
          >
            {accountLabel(row)}
          </Link>
        ),
      },
      {
        key: 'reference',
        header: t('admin.finance.creditBalances.columns.reference'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {row.reference ?? t('common.dash')}
          </span>
        ),
      },
      {
        key: 'sources',
        header: t('admin.finance.creditBalances.columns.sourceCount'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {row.source_count ?? t('common.dash')}
          </span>
        ),
      },
      {
        key: 'gross',
        header: t('admin.finance.creditBalances.metrics.gross'),
        render: (row) => (
          <FinanceMoney amount={row.gross_unallocated_amount} currency={row.currency} />
        ),
      },
      {
        key: 'pending',
        header: t('admin.finance.creditBalances.metrics.pending'),
        render: (row) => (
          <FinanceMoney amount={row.pending_unallocated_amount} currency={row.currency} />
        ),
      },
      {
        key: 'available',
        header: t('admin.finance.creditBalances.metrics.available'),
        render: (row) => (
          <FinanceMoney amount={row.available_credit_amount} currency={row.currency} />
        ),
      },
      {
        key: 'blocked',
        header: t('admin.finance.creditBalances.metrics.blocked'),
        render: (row) => (
          <FinanceMoney amount={row.blocked_unallocated_amount} currency={row.currency} />
        ),
      },
      {
        key: 'applied',
        header: t('admin.finance.creditBalances.metrics.applied'),
        render: (row) => (
          <FinanceMoney amount={row.applied_credit_amount} currency={row.currency} />
        ),
      },
      {
        key: 'state',
        header: t('admin.finance.creditBalances.columns.state'),
        render: (row) => (
          <CreditBalanceStatusBadge
            state={row.lifecycle_state ?? deriveCreditLifecycleState(row)}
          />
        ),
      },
      {
        key: 'actions',
        header: t('admin.finance.creditBalances.columns.actions'),
        render: (row) => (
          <Link
            href={`/admin/finance/billing-accounts/${row.billing_partner_id}/credit-balance?returnTo=${encodeURIComponent(returnTo)}`}
            className="btn btn--ghost btn--sm"
          >
            {t('admin.finance.creditBalances.openDetails')}
          </Link>
        ),
      },
    ],
    [t, returnTo],
  );

  function resetAll() {
    onFiltersChange({
      search: '',
      billingPartnerId: '',
      state: '',
      hasAvailableCredit: false,
      page: 1,
    });
  }

  const showEmpty = !state.initialLoading && !state.error && rows.length === 0 && !isRefetching;
  const showResults = !state.initialLoading && !state.error && rows.length > 0;

  return (
    <div className="finance-receivable-list finance-credit-balances-list">
      <div className="finance-credit-header-metrics finance-receivable-list__context">
        {activeSchool ? (
          <p className="muted finance-billing-page-school">
            {t('admin.finance.activeSchool')}: <strong dir="auto">{activeSchool.name}</strong>
          </p>
        ) : null}
        <div className="finance-metrics-grid finance-credit-summary-grid">
          <div className="card finance-metric-card">
            <span className="muted">{t('admin.finance.creditBalances.header.accountCount')}</span>
            {state.loading && !rows.length ? (
              <span className="finance-skeleton finance-skeleton--metric" aria-hidden />
            ) : (
              <strong className="mono" dir="ltr">
                {totalCount}
              </strong>
            )}
          </div>
          {headerSummary ? (
            <>
              <MetricCard
                label={t('admin.finance.creditBalances.metrics.gross')}
                amount={headerSummary.gross_unallocated_amount}
                loading={state.loading && !rows.length}
              />
              <MetricCard
                label={t('admin.finance.creditBalances.metrics.available')}
                amount={headerSummary.available_credit_amount}
                loading={state.loading && !rows.length}
                highlight="available"
              />
              <MetricCard
                label={t('admin.finance.creditBalances.metrics.pending')}
                amount={headerSummary.pending_unallocated_amount}
                loading={state.loading && !rows.length}
              />
              <MetricCard
                label={t('admin.finance.creditBalances.metrics.blocked')}
                amount={headerSummary.blocked_unallocated_amount}
                loading={state.loading && !rows.length}
                highlight="blocked"
              />
            </>
          ) : null}
        </div>
        {pg ? (
          <p className="finance-receivable-list__result-count" dir="ltr">
            {t('admin.finance.creditBalances.resultCount', { total: totalCount })}
          </p>
        ) : null}
      </div>

      <form
        className="toolbar finance-hub-filters finance-credit-filters finance-receivable-list__toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onFiltersChange({
            search: String(fd.get('search') ?? '').trim(),
            billingPartnerId: String(fd.get('billing_partner_id') ?? '').trim(),
            state: String(fd.get('state') ?? ''),
            hasAvailableCredit: fd.get('has_available_credit') === 'on',
            page: 1,
          });
        }}
      >
        <label className="finance-filter-field finance-receivable-list__search">
          <span className="tiny muted">{t('common.search')}</span>
          <input className="input" name="search" defaultValue={filters.search} dir="auto" />
          {filters.search ? (
            <button
              type="button"
              className="finance-receivable-list__search-clear"
              aria-label={t('common.clear')}
              onClick={() => onFiltersChange({ search: '', page: 1 })}
            >
              ×
            </button>
          ) : null}
        </label>
        <label className="finance-filter-field">
          <span className="tiny muted">{t('admin.finance.creditBalances.filters.billingPartner')}</span>
          <input
            className="input mono"
            name="billing_partner_id"
            defaultValue={filters.billingPartnerId}
            inputMode="numeric"
            dir="ltr"
          />
        </label>
        <label className="finance-filter-field">
          <span className="tiny muted">{t('admin.finance.creditBalances.filters.state')}</span>
          <select className="input" name="state" defaultValue={filters.state}>
            <option value="">{t('admin.finance.creditBalances.filters.stateAll')}</option>
            <option value="available">{t('admin.finance.creditBalances.states.available')}</option>
            <option value="pending">{t('admin.finance.creditBalances.states.pending')}</option>
            <option value="blocked">{t('admin.finance.creditBalances.states.blocked')}</option>
            <option value="applied">{t('admin.finance.creditBalances.states.applied')}</option>
          </select>
        </label>
        <label className="finance-filter-field finance-filter-field--checkbox">
          <input
            type="checkbox"
            name="has_available_credit"
            defaultChecked={filters.hasAvailableCredit}
          />
          <span>{t('admin.finance.creditBalances.filters.hasAvailable')}</span>
        </label>
        <button type="submit" className="btn btn--primary btn--sm">
          {t('admin.studentsList.applyFilters')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            {t('admin.finance.creditBalances.filters.reset')}
          </button>
        ) : null}
        <button type="button" className="btn btn--ghost btn--sm" onClick={state.reload}>
          {t('common.refresh')}
        </button>
      </form>

      {hasActiveQuery ? (
        <div className="finance-receivable-list__chips">
          {filters.search ? (
            <span className="finance-receivable-list__chip">
              <span dir="auto">{filters.search}</span>
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => onFiltersChange({ search: '', page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
          {filters.state ? (
            <span className="finance-receivable-list__chip">
              {t(`admin.finance.creditBalances.states.${filters.state}`)}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => onFiltersChange({ state: '', page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
          {filters.hasAvailableCredit ? (
            <span className="finance-receivable-list__chip">
              {t('admin.finance.creditBalances.filters.hasAvailable')}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => onFiltersChange({ hasAvailableCredit: false, page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {state.error ? (
        <ApiErrorView
          error={{
            code: state.error.code,
            message: t(creditBalanceErrorMessageKey(state.error.code)),
          }}
          onRetry={state.reload}
        />
      ) : null}

      {state.initialLoading ? <LoadingState label={t('common.loading')} /> : null}

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.creditBalances.refetching')}
        </p>
      ) : null}

      {showEmpty ? (
        <EmptyState
          title={
            emptyVariant === 'no-match'
              ? filters.hasAvailableCredit
                ? t('admin.finance.creditBalances.emptyNoAvailableTitle')
                : t('admin.finance.creditBalances.noMatch.title')
              : t('admin.finance.creditBalances.emptyTitle')
          }
          description={
            emptyVariant === 'no-match'
              ? filters.hasAvailableCredit
                ? t('admin.finance.creditBalances.emptyNoAvailableDesc')
                : t('admin.finance.creditBalances.noMatch.description')
              : t('admin.finance.creditBalances.emptyDesc')
          }
          action={
            hasActiveQuery ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
                {t('admin.finance.creditBalances.filters.reset')}
              </button>
            ) : undefined
          }
        />
      ) : null}

      {showResults ? (
        <div
          className={
            isRefetching
              ? 'finance-receivable-list__results finance-receivable-list__results--fetching'
              : 'finance-receivable-list__results'
          }
          aria-busy={isRefetching || undefined}
        >
          {hasBlockedOnly && !filters.hasAvailableCredit ? (
            <p className="finance-credit-notice" role="status">
              {t('admin.finance.creditBalances.noticeBlockedOnly')}
            </p>
          ) : null}
          {(headerSummary?.available_credit_amount ?? 0) <= 0 && rows.length > 0 ? (
            <p className="finance-credit-notice finance-credit-notice--muted" role="status">
              {t('admin.finance.creditBalances.noticeNoAvailable')}
            </p>
          ) : null}

          <div className="finance-credit-list-desktop">
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.billing_partner_id} />
          </div>
          <div className="finance-credit-list-mobile">
            {rows.map((row) => (
              <article key={row.billing_partner_id} className="card finance-credit-card">
                <div className="finance-credit-card__head">
                  <strong dir="auto">{accountLabel(row)}</strong>
                  <CreditBalanceStatusBadge
                    state={row.lifecycle_state ?? deriveCreditLifecycleState(row)}
                  />
                </div>
                <dl className="finance-credit-card__metrics">
                  <div>
                    <dt>{t('admin.finance.creditBalances.metrics.gross')}</dt>
                    <dd>
                      <FinanceMoney
                        amount={row.gross_unallocated_amount}
                        currency={row.currency}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.creditBalances.metrics.available')}</dt>
                    <dd>
                      <FinanceMoney
                        amount={row.available_credit_amount}
                        currency={row.currency}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.creditBalances.metrics.blocked')}</dt>
                    <dd>
                      <FinanceMoney
                        amount={row.blocked_unallocated_amount}
                        currency={row.currency}
                      />
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/admin/finance/billing-accounts/${row.billing_partner_id}/credit-balance?returnTo=${encodeURIComponent(returnTo)}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.finance.creditBalances.openDetails')}
                </Link>
              </article>
            ))}
          </div>
          {pg ? (
            <Pagination
              page={pg.page}
              pageSize={pg.page_size ?? CREDIT_BALANCES_PAGE_SIZE}
              total={pg.total}
              totalPages={pg.total_pages}
              onPage={(page) => onFiltersChange({ page })}
            />
          ) : null}
        </div>
      ) : null}

      <CollectionCreditDrawer
        open={selectedCollectionId != null}
        collectionId={selectedCollectionId}
        returnTo={returnTo}
        onClose={() => setSelectedCollectionId(null)}
        onApplied={state.reload}
      />
    </div>
  );
}

function MetricCard({
  label,
  amount,
  loading,
  highlight,
}: {
  label: string;
  amount?: number | null;
  loading?: boolean;
  highlight?: 'available' | 'blocked';
}) {
  return (
    <div
      className={`card finance-metric-card finance-credit-metric-card${
        highlight ? ` finance-credit-metric-card--${highlight}` : ''
      }`}
    >
      <span className="muted">{label}</span>
      {loading ? (
        <span className="finance-skeleton finance-skeleton--metric" aria-hidden />
      ) : (
        <strong>
          <FinanceMoney amount={amount} />
        </strong>
      )}
    </div>
  );
}
