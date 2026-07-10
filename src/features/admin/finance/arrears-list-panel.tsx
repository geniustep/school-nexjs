'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { ArrearsFollowupDrawer } from '@/features/admin/finance/arrears-followup-drawer';
import {
  ARREARS_FOLLOWUP_TABS,
  arrearsFollowupTabApiParam,
  arrearsFollowupTabLabelKey,
} from '@/features/admin/finance/arrears-filter-contracts';
import type { ArrearsFollowupTab } from '@/types/finance-arrears';
import {
  ARREARS_PAGE_SIZE,
  arrearsListHasActiveQuery,
  formatArrearsListDate,
  resolveArrearsFollowupTab,
  resolveArrearsListEmptyVariant,
} from '@/features/admin/finance/utils/arrears-list-present';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { parseBillingAccountListResponse } from '@/lib/utils/normalize-billing-account';
import {
  buildBillingAccountHref,
  buildFamilyCollectHref,
  computeArrearsSummaryFromRows,
  filterMergedRowsByTab,
  mergeArrearsRows,
  parseArrearsFollowupListResponse,
} from '@/lib/utils/normalize-arrears';
import type { ArrearsMergedRow } from '@/types/finance-arrears';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';

export type ArrearsListFilters = {
  tab: string;
  search: string;
  page: number;
};

type ArrearsListPanelProps = {
  filters: ArrearsListFilters;
  onFiltersChange: (
    updates: Partial<Record<keyof ArrearsListFilters, string | number | null>>,
  ) => void;
  returnTo?: string;
};

const TAB_BUTTONS = ARREARS_FOLLOWUP_TABS.filter((tab) => tab !== 'all');

function rowLabel(row: ArrearsMergedRow): string {
  return row.display_name ?? row.family_name ?? row.guardian_name ?? `#${row.family_id}`;
}

function resolveFollowupBadgeClass(status?: string | null): string {
  const value = status?.trim().toLowerCase() ?? '';
  if (value.includes('promise') || value.includes('وعد')) {
    return 'finance-arrears-badge finance-arrears-badge--blue';
  }
  if (value.includes('resolved') || value.includes('closed') || value.includes('مغلق')) {
    return 'finance-arrears-badge finance-arrears-badge--green';
  }
  if (value.includes('needs') || value.includes('overdue') || value.includes('متأخر')) {
    return 'finance-arrears-badge finance-arrears-badge--red';
  }
  return 'finance-arrears-badge finance-arrears-badge--amber';
}

function KpiCard({
  label,
  value,
  tone,
  amount,
  currency,
}: {
  label: string;
  value?: number | string;
  tone: 'red' | 'amber' | 'blue' | 'slate';
  amount?: number | null;
  currency?: unknown;
}) {
  return (
    <div className={`finance-billing-kpi finance-billing-kpi--${tone}`}>
      <span className="finance-billing-kpi__label">{label}</span>
      <strong className="finance-billing-kpi__value">
        {amount != null ? (
          <FinanceMoney amount={amount} currency={currency} className="finance-billing-kpi__amount" />
        ) : (
          <span dir="ltr">{value ?? '—'}</span>
        )}
      </strong>
    </div>
  );
}

export function ArrearsListPanel({ filters, onFiltersChange, returnTo = '/admin/finance/arrears' }: ArrearsListPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const tabValid = resolveArrearsFollowupTab(filters.tab);

  const [drawerFamilyId, setDrawerFamilyId] = useState<number | null>(null);
  const [drawerFamilyLabel, setDrawerFamilyLabel] = useState<string | undefined>();

  const billingQuery: ListParams = useMemo(
    () => ({
      page: filters.page,
      page_size: ARREARS_PAGE_SIZE,
      search: filters.search || undefined,
      has_overdue: 1,
      account_kind: 'family',
    }),
    [filters.page, filters.search],
  );

  const followupQuery: ListParams = useMemo(() => {
    const tabParam = arrearsFollowupTabApiParam(tabValid);
    return {
      search: filters.search || undefined,
      tab: tabParam,
      quick: tabParam,
      status: tabParam,
    };
  }, [filters.search, tabValid]);

  const billingState = useAdminResource<unknown>(endpoints.admin.financeBillingAccounts, billingQuery);
  const followupState = useAdminResource<unknown>(endpoints.admin.financeArrearsFollowups, followupQuery);

  const followupUnavailable =
    followupState.error?.code === 'not_found' ||
    (followupState.error?.details?.status != null && Number(followupState.error.details.status) === 404);

  const billingParsed = useMemo(
    () => parseBillingAccountListResponse(billingState.data, billingState.meta),
    [billingState.data, billingState.meta],
  );

  const followupParsed = useMemo(
    () =>
      followupUnavailable
        ? { items: [], summary: null, appliedTab: tabValid }
        : parseArrearsFollowupListResponse(followupState.data, tabValid),
    [followupState.data, tabValid, followupUnavailable],
  );

  const followupFamilyIds = useMemo(
    () => new Set(followupParsed.items.map((row) => row.family_id)),
    [followupParsed.items],
  );

  const mergedAll = useMemo(
    () => mergeArrearsRows(billingParsed.items, followupParsed.items),
    [billingParsed.items, followupParsed.items],
  );

  const rows = useMemo(
    () => filterMergedRowsByTab(mergedAll, tabValid, followupFamilyIds),
    [mergedAll, tabValid, followupFamilyIds],
  );

  const summary = useMemo(
    () => computeArrearsSummaryFromRows(mergedAll, followupParsed.summary),
    [mergedAll, followupParsed.summary],
  );

  const pg = billingParsed.pagination ?? billingState.meta?.pagination;
  const pageCurrency = rows.find((row) => row.currency)?.currency;

  const loading = billingState.initialLoading;
  const error = billingState.error;
  const isRefetching =
    (billingState.fetching || followupState.fetching) && !billingState.initialLoading;
  const hasActiveQuery = arrearsListHasActiveQuery(filters);
  const emptyVariant = resolveArrearsListEmptyVariant({ hasActiveQuery });

  function reloadAll() {
    billingState.reload();
    followupState.reload();
  }

  function openDrawer(row: ArrearsMergedRow) {
    setDrawerFamilyId(row.family_id);
    setDrawerFamilyLabel(rowLabel(row));
  }

  function setTab(next: ArrearsFollowupTab) {
    onFiltersChange({ tab: next === 'all' ? null : next, page: 1 });
  }

  function clearSearch() {
    onFiltersChange({ search: null, page: 1 });
  }

  function resetQuery() {
    onFiltersChange({ tab: null, search: null, page: 1 });
  }

  const columns: Column<ArrearsMergedRow>[] = useMemo(
    () => [
      {
        key: 'family',
        header: t('admin.finance.arrears.columns.family'),
        render: (row) => (
          <button
            type="button"
            className="finance-arrears-family-link"
            onClick={(e) => {
              e.stopPropagation();
              openDrawer(row);
            }}
            dir="auto"
          >
            {rowLabel(row)}
          </button>
        ),
      },
      {
        key: 'student_count',
        header: t('admin.finance.arrears.columns.studentCount'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {row.student_count ?? t('common.dash')}
          </span>
        ),
      },
      {
        key: 'total_overdue',
        header: t('admin.finance.arrears.columns.totalOverdue'),
        className: 'finance-table-money finance-table-money--danger',
        render: (row) => (
          <FinanceMoney
            amount={row.total_overdue}
            currency={row.currency}
            className="finance-table-money__value"
          />
        ),
      },
      {
        key: 'total_remaining',
        header: t('admin.finance.arrears.columns.totalRemaining'),
        className: 'finance-table-money',
        render: (row) => (
          <FinanceMoney amount={row.total_remaining} currency={row.currency} className="finance-table-money__value" />
        ),
      },
      {
        key: 'oldest_overdue',
        header: t('admin.finance.arrears.columns.oldestOverdue'),
        render: (row) => (
          <span className="finance-receivable-list__date" dir="ltr">
            {formatArrearsListDate(row.oldest_overdue_date, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'followup_status',
        header: t('admin.finance.arrears.columns.followupStatus'),
        render: (row) => {
          const label = row.followup_status_label ?? row.followup_status ?? t('common.dash');
          return (
            <span className={resolveFollowupBadgeClass(row.followup_status)} dir="auto">
              {label}
            </span>
          );
        },
      },
      {
        key: 'payment_promise',
        header: t('admin.finance.arrears.columns.paymentPromise'),
        render: (row) =>
          row.payment_promise_date || row.payment_promise_amount != null ? (
            <span className="finance-arrears-promise-cell">
              <span className="finance-receivable-list__date" dir="ltr">
                {formatArrearsListDate(row.payment_promise_date, formatDate, t('common.dash'))}
              </span>
              {row.payment_promise_amount != null ? (
                <>
                  {' · '}
                  <FinanceMoney amount={row.payment_promise_amount} currency={row.currency} />
                </>
              ) : null}
            </span>
          ) : (
            t('common.dash')
          ),
      },
      {
        key: 'next_followup',
        header: t('admin.finance.arrears.columns.nextFollowup'),
        render: (row) =>
          row.next_followup_date ? (
            <span className="finance-arrears-next-date finance-receivable-list__date" dir="ltr">
              {formatArrearsListDate(row.next_followup_date, formatDate, t('common.dash'))}
            </span>
          ) : (
            t('common.dash')
          ),
      },
      {
        key: 'assigned_user',
        header: t('admin.finance.arrears.columns.assignedUser'),
        render: (row) => <span dir="auto">{row.assigned_user_name ?? t('common.dash')}</span>,
      },
      {
        key: 'actions',
        header: t('admin.finance.arrears.columns.actions'),
        render: (row) => (
          <div className="finance-arrears-row-actions">
            <Link
              href={buildFamilyCollectHref(row.family_id, returnTo, {
                source: 'arrears',
                suggestedAmount: row.total_overdue,
              })}
              className="btn btn--primary btn--sm finance-arrears-row-actions__primary"
              onClick={(e) => e.stopPropagation()}
            >
              {t('admin.finance.arrears.actions.receivePayment')}
            </Link>
            <div className="finance-arrears-row-actions__secondary">
              <Link
                href={buildBillingAccountHref(row.family_id, returnTo)}
                className="btn btn--ghost btn--sm"
                onClick={(e) => e.stopPropagation()}
              >
                {t('admin.finance.arrears.actions.openAccount')}
              </Link>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer(row);
                }}
              >
                {t('admin.finance.arrears.actions.logContact')}
              </button>
            </div>
          </div>
        ),
      },
    ],
    [t, formatDate, returnTo],
  );

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <ApiErrorView error={error} onRetry={reloadAll} />;
  }

  const showEmpty = rows.length === 0 && !isRefetching;

  return (
    <div className="finance-receivable-list finance-arrears-list">
      <section className="finance-arrears-kpis finance-receivable-list__context" aria-label={t('admin.finance.arrears.kpiSection')}>
        <div className="finance-billing-kpis">
          <KpiCard
            label={t('admin.finance.arrears.kpis.overdueFamilies')}
            value={summary.overdue_families_count ?? mergedAll.length}
            tone="red"
          />
          <KpiCard
            label={t('admin.finance.arrears.kpis.totalOverdue')}
            amount={summary.total_overdue_amount}
            currency={pageCurrency}
            tone="amber"
          />
          <KpiCard
            label={t('admin.finance.arrears.kpis.paymentPromises')}
            value={summary.payment_promises_count ?? 0}
            tone="blue"
          />
          <KpiCard
            label={t('admin.finance.arrears.kpis.todayFollowups')}
            value={summary.today_followups_count ?? 0}
            tone="slate"
          />
        </div>
      </section>

      {pg ? (
        <p className="finance-receivable-list__result-count" dir="ltr">
          {t('admin.finance.arrears.resultCount', { total: pg.total })}
        </p>
      ) : null}

      {followupUnavailable ? (
        <p className="finance-billing-kind-filter-notice" role="status">
          {t('admin.finance.arrears.followupApiUnavailable')}
        </p>
      ) : null}

      <div className="finance-cheque-quick-filters finance-cheque-quick-filters--compact finance-arrears-tabs finance-receivable-list__tabs">
        <button
          type="button"
          className={`btn btn--ghost btn--sm${tabValid === 'all' ? ' is-active' : ''}`}
          onClick={() => setTab('all')}
        >
          {t(arrearsFollowupTabLabelKey('all'))}
        </button>
        {TAB_BUTTONS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`btn btn--ghost btn--sm${tabValid === tab ? ' is-active' : ''}`}
            onClick={() => setTab(tabValid === tab ? 'all' : tab)}
          >
            {t(arrearsFollowupTabLabelKey(tab))}
          </button>
        ))}
      </div>

      {tabValid !== 'all' ? (
        <div className="finance-receivable-list__chips">
          <span className="finance-receivable-list__chip">
            {t(arrearsFollowupTabLabelKey(tabValid))}
            <button
              type="button"
              className="finance-receivable-list__chip-clear"
              aria-label={t('common.clear')}
              onClick={() => setTab('all')}
            >
              ×
            </button>
          </span>
        </div>
      ) : null}

      <form
        className="toolbar finance-hub-filters finance-receivable-list__toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onFiltersChange({
            search: String(fd.get('search') ?? '').trim() || null,
            page: 1,
          });
        }}
      >
        <div className="finance-receivable-list__search">
          <input
            className="input"
            name="search"
            placeholder={t('admin.finance.arrears.searchPlaceholder')}
            defaultValue={filters.search}
            dir="auto"
          />
          {filters.search ? (
            <button
              type="button"
              className="finance-receivable-list__search-clear"
              aria-label={t('common.clear')}
              onClick={clearSearch}
            >
              ×
            </button>
          ) : null}
        </div>
        <button type="submit" className="btn btn--primary btn--sm">
          {t('common.search')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetQuery}>
            {t('common.clear')}
          </button>
        ) : null}
      </form>

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.arrears.refetching')}
        </p>
      ) : null}

      {showEmpty ? (
        <EmptyState
          title={
            emptyVariant === 'no-match'
              ? t('admin.finance.arrears.noMatch.title')
              : t('admin.finance.arrears.emptyTitle')
          }
          description={
            emptyVariant === 'no-match'
              ? t('admin.finance.arrears.noMatch.description')
              : t('admin.finance.arrears.emptyDesc')
          }
          action={
            hasActiveQuery ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={resetQuery}>
                {t('common.clear')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={
            isRefetching
              ? 'finance-receivable-list__results finance-receivable-list__results--fetching'
              : 'finance-receivable-list__results'
          }
          aria-busy={isRefetching || undefined}
        >
          <div className="finance-arrears-desktop">
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => String(row.family_id)}
              onRowClick={openDrawer}
              stickyHeader
            />
          </div>
          <div className="finance-arrears-mobile">
            {rows.map((row) => (
              <article key={row.family_id} className="finance-arrears-card">
                <div className="finance-arrears-card__head">
                  <button
                    type="button"
                    className="finance-arrears-family-link finance-arrears-card__title"
                    onClick={() => openDrawer(row)}
                    dir="auto"
                  >
                    {rowLabel(row)}
                  </button>
                  <span className={resolveFollowupBadgeClass(row.followup_status)} dir="auto">
                    {row.followup_status_label ?? row.followup_status ?? t('common.dash')}
                  </span>
                </div>
                <dl className="finance-arrears-card__metrics">
                  <div>
                    <dt>{t('admin.finance.arrears.columns.totalOverdue')}</dt>
                    <dd>
                      <FinanceMoney
                        amount={row.total_overdue}
                        currency={row.currency}
                        className="finance-table-money__value finance-table-money__value--danger"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.arrears.columns.nextFollowup')}</dt>
                    <dd className="finance-receivable-list__date" dir="ltr">
                      {formatArrearsListDate(row.next_followup_date, formatDate, t('common.dash'))}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={buildFamilyCollectHref(row.family_id, returnTo, {
                    source: 'arrears',
                    suggestedAmount: row.total_overdue,
                  })}
                  className="btn btn--primary btn--sm finance-arrears-card__collect"
                >
                  {t('admin.finance.arrears.actions.receivePayment')}
                </Link>
              </article>
            ))}
          </div>
          {pg ? (
            <Pagination
              page={pg.page}
              pageSize={pg.page_size ?? ARREARS_PAGE_SIZE}
              totalPages={pg.total_pages}
              total={pg.total}
              onPage={(page) => onFiltersChange({ page })}
            />
          ) : null}
        </div>
      )}

      <ArrearsFollowupDrawer
        open={drawerFamilyId != null}
        familyId={drawerFamilyId}
        familyLabel={drawerFamilyLabel}
        onClose={() => {
          setDrawerFamilyId(null);
          setDrawerFamilyLabel(undefined);
        }}
        onSaved={reloadAll}
      />
    </div>
  );
}
