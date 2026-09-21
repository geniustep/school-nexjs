'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { ArrearsFollowupDrawer } from '@/features/admin/finance/arrears-followup-drawer';
import { ArrearsAdvancedFilters } from '@/features/admin/finance/arrears-advanced-filters';
import {
  ARREARS_FOLLOWUP_TABS,
  arrearsFollowupTabApiParam,
  arrearsFollowupTabLabelKey,
} from '@/features/admin/finance/arrears-filter-contracts';
import type {
  ArrearsFollowupListItem,
  ArrearsFollowupTab,
  ArrearsListFilters,
} from '@/types/finance-arrears';
import {
  ARREARS_PAGE_SIZE,
  arrearsActionableAmount,
  arrearsGrossAmount,
  arrearsListHasActiveQuery,
  arrearsPendingCoverageAmount,
  arrearsSupportsActionableContract,
  formatArrearsListDate,
  resolveArrearsFollowupTab,
  resolveArrearsListEmptyVariant,
} from '@/features/admin/finance/utils/arrears-list-present';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  arrearsBillingPartnerId,
  buildArrearsCollectHref,
  buildBillingAccountHref,
  parseArrearsFollowupListResponse,
} from '@/lib/utils/normalize-arrears';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';
import './arrears-redesign.css';

type ArrearsListPanelProps = {
  filters: ArrearsListFilters;
  onFiltersChange: (
    updates: Partial<Record<keyof ArrearsListFilters, string | number | null>>,
  ) => void;
  onOpenFamily: (familyId: number) => void;
  onCloseFamily: () => void;
  returnTo?: string;
};

const TAB_BUTTONS = ARREARS_FOLLOWUP_TABS.filter((tab) => tab !== 'all');

const ADVANCED_FILTER_KEYS: Array<keyof ArrearsListFilters> = [
  'academicYearId', 'levelId', 'classId', 'workflowStatus', 'contactResult',
  'assignedUserId', 'followupDue', 'pendingCheque', 'paymentPromise',
  'contacted', 'actionableMin', 'actionableMax', 'oldestAge', 'dueMonth',
  'feeTypeId',
];

function arrearsAdvancedQuery(filters: ArrearsListFilters): ListParams {
  return {
    academic_year_id: filters.academicYearId || undefined,
    level_id: filters.levelId || undefined,
    class_id: filters.classId || undefined,
    workflow_status: filters.workflowStatus || undefined,
    contact_result: filters.contactResult || undefined,
    assigned_user_id: filters.assignedUserId || undefined,
    followup_due: filters.followupDue || undefined,
    pending_cheque: filters.pendingCheque || undefined,
    payment_promise: filters.paymentPromise || undefined,
    contacted: filters.contacted || undefined,
    actionable_min: filters.actionableMin || undefined,
    actionable_max: filters.actionableMax || undefined,
    oldest_age: filters.oldestAge || undefined,
    due_month: filters.dueMonth || undefined,
    fee_type_id: filters.feeTypeId || undefined,
  };
}

function rowLabel(row: ArrearsFollowupListItem): string {
  return row.guardian_name ?? row.display_name ?? row.family_name ?? `#${arrearsBillingPartnerId(row)}`;
}

function resolveFollowupBadgeClass(status?: string | null): string {
  const value = status?.trim().toLowerCase() ?? '';
  if (value.includes('promise') || value.includes('وعد')) return 'finance-arrears-badge finance-arrears-badge--blue';
  if (value.includes('resolved') || value.includes('closed') || value.includes('مغلق')) return 'finance-arrears-badge finance-arrears-badge--green';
  if (value.includes('needs') || value.includes('overdue') || value.includes('متأخر')) return 'finance-arrears-badge finance-arrears-badge--red';
  return 'finance-arrears-badge finance-arrears-badge--amber';
}

function SummaryMetric({
  label,
  value,
  amount,
  currency,
}: {
  label: string;
  value?: number | string | null;
  amount?: number | null;
  currency?: unknown;
}) {
  return (
    <div className="finance-arrears-redesign__mini-metric">
      <span>{label}</span>
      <strong>
        {amount != null ? <FinanceMoney amount={amount} currency={currency} /> : <bdi dir="ltr">{value ?? '—'}</bdi>}
      </strong>
    </div>
  );
}

export function ArrearsListPanel({
  filters,
  onFiltersChange,
  onOpenFamily,
  onCloseFamily,
  returnTo = '/admin/finance/arrears',
}: ArrearsListPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const { activeSchoolId } = useAdminSession();
  const tabValid = resolveArrearsFollowupTab(filters.tab);
  const [contractMode, setContractMode] = useState<'probing' | 'actionable' | 'legacy'>('probing');
  const [filterV2, setFilterV2] = useState(false);
  const [drawerFamilyLabel, setDrawerFamilyLabel] = useState<string | undefined>();

  useEffect(() => {
    setContractMode('probing');
    setFilterV2(false);
  }, [activeSchoolId]);

  const probeTab =
    tabValid === 'pending_cheque' || tabValid === 'overdue_followup'
      ? 'all'
      : tabValid;
  const legacyQuery: ListParams = useMemo(() => {
    const tabParam = arrearsFollowupTabApiParam(probeTab);
    return {
      page: filters.page,
      page_size: ARREARS_PAGE_SIZE,
      search: filters.search || undefined,
      tab: tabParam,
      quick: tabParam,
      status: tabParam,
    };
  }, [filters.page, filters.search, probeTab]);

  const legacyState = useAdminResource<unknown>(
    contractMode === 'actionable' ? null : endpoints.admin.financeArrearsFollowups,
    legacyQuery,
  );
  const legacyParsed = useMemo(
    () => parseArrearsFollowupListResponse(legacyState.data, probeTab),
    [legacyState.data, probeTab],
  );

  useEffect(() => {
    if (contractMode !== 'probing' || legacyState.initialLoading || legacyState.error || legacyState.data == null) return;
    setContractMode(arrearsSupportsActionableContract(legacyParsed) ? 'actionable' : 'legacy');
  }, [contractMode, legacyParsed, legacyState.data, legacyState.error, legacyState.initialLoading]);

  const actionableQuery: ListParams = useMemo(() => {
    const safeTab =
      tabValid === 'overdue_followup' && !filterV2 ? 'all' : tabValid;
    const tabParam = arrearsFollowupTabApiParam(safeTab);
    return {
      page: filters.page,
      page_size: ARREARS_PAGE_SIZE,
      search: filters.search || undefined,
      tab: tabParam,
      quick: tabParam,
      status: tabParam,
      overdue_semantics: 'actionable',
      ...(filterV2 ? arrearsAdvancedQuery(filters) : {}),
    };
  }, [filterV2, filters, tabValid]);

  const actionableState = useAdminResource<unknown>(
    contractMode === 'actionable' ? endpoints.admin.financeArrearsFollowups : null,
    actionableQuery,
  );

  const followupState = contractMode === 'actionable' ? actionableState : legacyState;
  const effectiveTab =
    contractMode === 'actionable' && (tabValid !== 'overdue_followup' || filterV2)
      ? tabValid
      : probeTab;
  const followupParsed = useMemo(
    () => parseArrearsFollowupListResponse(followupState.data, effectiveTab),
    [followupState.data, effectiveTab],
  );

  useEffect(() => {
    if (followupParsed.filterOptions?.contract === 'arrears_filters_v2') {
      setFilterV2(true);
    }
  }, [followupParsed.filterOptions]);

  const rows = followupParsed.items;
  const summary = followupParsed.summary ?? {};
  const pg = followupState.meta?.pagination;
  const pageCurrency = rows.find((row) => row.currency)?.currency;
  const supportsActionable = contractMode === 'actionable';
  const visibleTabButtons = TAB_BUTTONS.filter(
    (tab) =>
      (tab !== 'pending_cheque' || supportsActionable) &&
      (tab !== 'overdue_followup' || filterV2),
  );
  const loading = (contractMode === 'probing' && !legacyState.error) || followupState.initialLoading;
  const error = followupState.error;
  const isRefetching = followupState.fetching && !followupState.initialLoading;
  const hasAdvancedQuery = ADVANCED_FILTER_KEYS.some((key) => Boolean(filters[key]));
  const hasActiveQuery =
    arrearsListHasActiveQuery({ tab: effectiveTab, search: filters.search }) ||
    hasAdvancedQuery;
  const emptyVariant = resolveArrearsListEmptyVariant({ hasActiveQuery });

  function reloadAll() {
    followupState.reload();
  }

  function openDrawer(row: ArrearsFollowupListItem) {
    setDrawerFamilyLabel(rowLabel(row));
    onOpenFamily(arrearsBillingPartnerId(row));
  }

  function setTab(next: ArrearsFollowupTab) {
    onFiltersChange({ tab: next === 'all' ? null : next, page: 1 });
  }

  function clearSearch() {
    onFiltersChange({ search: null, page: 1 });
  }

  function resetQuery() {
    onFiltersChange({
      tab: null,
      search: null,
      academicYearId: null,
      levelId: null,
      classId: null,
      workflowStatus: null,
      contactResult: null,
      assignedUserId: null,
      followupDue: null,
      pendingCheque: null,
      paymentPromise: null,
      contacted: null,
      actionableMin: null,
      actionableMax: null,
      oldestAge: null,
      dueMonth: null,
      feeTypeId: null,
      page: 1,
    });
  }

  const columns: Column<ArrearsFollowupListItem>[] = useMemo(
    () => [
      {
        key: 'family',
        header: t('admin.finance.arrears.columns.family'),
        render: (row) => (
          <button
            type="button"
            className="finance-arrears-redesign__identity"
            onClick={(e) => {
              e.stopPropagation();
              openDrawer(row);
            }}
            dir="auto"
          >
            <strong>{rowLabel(row)}</strong>
            <span>{t('admin.finance.arrears.columns.studentCount')}: {row.student_count ?? t('common.dash')}</span>
          </button>
        ),
      },
      {
        key: 'actionable_overdue',
        header: t('admin.finance.arrears.columns.actionableOverdue'),
        className: 'finance-table-money finance-table-money--danger',
        render: (row) => {
          const actionable = arrearsActionableAmount(row);
          const pending = arrearsPendingCoverageAmount(row);
          const gross = arrearsGrossAmount(row);
          return (
            <div className="finance-arrears-redesign__money-cell">
              <FinanceMoney amount={actionable} currency={row.currency} className="finance-arrears-redesign__money-primary" />
              {pending != null && pending > 0 ? (
                <span>{t('admin.finance.arrears.columns.pendingChequeCoverage')}: <FinanceMoney amount={pending} currency={row.currency} /></span>
              ) : null}
              {gross != null && gross !== actionable ? (
                <span>{t('admin.finance.arrears.columns.grossOverdue')}: <FinanceMoney amount={gross} currency={row.currency} /></span>
              ) : null}
            </div>
          );
        },
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
        render: (row) => (
          <div className="finance-arrears-redesign__followup-cell">
            <span className={resolveFollowupBadgeClass(row.followup_status)} dir="auto">
              {row.followup_status_label ?? row.followup_status ?? t('common.dash')}
            </span>
            {row.next_followup_date ? (
              <span className="finance-receivable-list__date" dir="ltr">
                {formatArrearsListDate(row.next_followup_date, formatDate, t('common.dash'))}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'payment_promise',
        header: t('admin.finance.arrears.columns.paymentPromise'),
        render: (row) => row.payment_promise_date || row.payment_promise_amount != null ? (
          <div className="finance-arrears-redesign__promise-cell">
            <span className="finance-receivable-list__date" dir="ltr">
              {formatArrearsListDate(row.payment_promise_date, formatDate, t('common.dash'))}
            </span>
            {row.payment_promise_amount != null ? <FinanceMoney amount={row.payment_promise_amount} currency={row.currency} /> : null}
          </div>
        ) : t('common.dash'),
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
          <div className="finance-arrears-redesign__row-actions">
            <Link
              href={buildArrearsCollectHref(row, returnTo)}
              className="btn btn--primary btn--sm"
              onClick={(e) => e.stopPropagation()}
            >
              {t('admin.finance.arrears.actions.receivePayment')}
            </Link>
            <Link
              href={buildBillingAccountHref(arrearsBillingPartnerId(row), returnTo)}
              className="btn btn--ghost btn--sm"
              onClick={(e) => e.stopPropagation()}
            >
              {t('admin.finance.arrears.actions.openAccount')}
            </Link>
          </div>
        ),
      },
    ],
    [formatDate, returnTo, t],
  );

  if (loading) return <LoadingState label={t('common.loading')} />;
  if (error) return <ApiErrorView error={error} onRetry={reloadAll} />;

  const showEmpty = rows.length === 0 && !isRefetching;
  const heroAmount = supportsActionable
    ? summary.total_actionable_overdue_amount
    : summary.total_overdue_amount;
  const heroCount = supportsActionable
    ? summary.actionable_overdue_accounts_count
    : summary.overdue_accounts_count ?? summary.overdue_families_count;

  return (
    <div className="finance-receivable-list finance-arrears-redesign">
      <section className="finance-arrears-redesign__summary" aria-label={t('admin.finance.arrears.kpiSection')}>
        <div className="finance-arrears-redesign__hero">
          <span>{t(supportsActionable ? 'admin.finance.arrears.kpis.actionableTotal' : 'admin.finance.arrears.kpis.totalOverdue')}</span>
          <strong><FinanceMoney amount={heroAmount} currency={pageCurrency} /></strong>
          <div>
            <span>{t(supportsActionable ? 'admin.finance.arrears.kpis.actionableAccounts' : 'admin.finance.arrears.kpis.overdueAccounts')}: <bdi dir="ltr">{heroCount ?? '—'}</bdi></span>
            {supportsActionable && summary.total_overdue_amount != null ? (
              <span>{t('admin.finance.arrears.kpis.grossOverdue')}: <FinanceMoney amount={summary.total_overdue_amount} currency={pageCurrency} /></span>
            ) : null}
          </div>
        </div>
        <div className="finance-arrears-redesign__mini-grid">
          {supportsActionable ? (
            <SummaryMetric
              label={t('admin.finance.arrears.kpis.pendingChequeCoverage')}
              amount={summary.total_pending_cheque_coverage_on_overdue ?? 0}
              currency={pageCurrency}
            />
          ) : null}
          <SummaryMetric label={t('admin.finance.arrears.kpis.paymentPromises')} value={summary.payment_promises_count} />
          <SummaryMetric label={t('admin.finance.arrears.kpis.todayFollowups')} value={summary.today_followups_count} />
          {filterV2 ? (
            <SummaryMetric label={t('admin.finance.arrears.kpis.overdueFollowups')} value={summary.overdue_followups_count} />
          ) : null}
        </div>
      </section>

      <section className="finance-arrears-redesign__controls">
        <div className="finance-arrears-redesign__tabs" role="group" aria-label={t('admin.finance.arrears.kpiSection')}>
          <button type="button" className={`btn btn--ghost btn--sm${effectiveTab === 'all' ? ' is-active' : ''}`} onClick={() => setTab('all')}>
            {t(arrearsFollowupTabLabelKey('all'))}
          </button>
          {visibleTabButtons.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn btn--ghost btn--sm${effectiveTab === tab ? ' is-active' : ''}`}
              onClick={() => setTab(effectiveTab === tab ? 'all' : tab)}
            >
              {t(arrearsFollowupTabLabelKey(tab))}
            </button>
          ))}
        </div>

        <form
          className="finance-arrears-redesign__search"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onFiltersChange({ search: String(fd.get('search') ?? '').trim() || null, page: 1 });
          }}
        >
          <div className="finance-arrears-redesign__search-field">
            <input className="input" name="search" placeholder={t('admin.finance.arrears.searchPlaceholder')} defaultValue={filters.search} dir="auto" />
            {filters.search ? (
              <button type="button" className="finance-receivable-list__search-clear" aria-label={t('common.clear')} onClick={clearSearch}>×</button>
            ) : null}
          </div>
          <button type="submit" className="btn btn--primary btn--sm">{t('common.search')}</button>
          {hasActiveQuery ? <button type="button" className="btn btn--ghost btn--sm" onClick={resetQuery}>{t('common.clear')}</button> : null}
        </form>
      </section>

      {filterV2 && followupParsed.filterOptions ? (
        <ArrearsAdvancedFilters
          filters={filters}
          options={followupParsed.filterOptions}
          onChange={onFiltersChange}
        />
      ) : null}

      {pg ? <p className="finance-receivable-list__result-count" dir="ltr">{t('admin.finance.arrears.resultCount', { total: pg.total })}</p> : null}
      {isRefetching ? <p className="finance-receivable-list__fetching" aria-live="polite">{t('admin.finance.arrears.refetching')}</p> : null}

      {showEmpty ? (
        <EmptyState
          title={emptyVariant === 'no-match' ? t('admin.finance.arrears.noMatch.title') : t('admin.finance.arrears.emptyTitle')}
          description={emptyVariant === 'no-match' ? t('admin.finance.arrears.noMatch.description') : t('admin.finance.arrears.emptyDesc')}
          action={hasActiveQuery ? <button type="button" className="btn btn--ghost btn--sm" onClick={resetQuery}>{t('common.clear')}</button> : undefined}
        />
      ) : (
        <div className={isRefetching ? 'finance-receivable-list__results finance-receivable-list__results--fetching' : 'finance-receivable-list__results'} aria-busy={isRefetching || undefined}>
          <div className="finance-arrears-desktop">
            <DataTable columns={columns} rows={rows} rowKey={(row) => String(arrearsBillingPartnerId(row))} onRowClick={openDrawer} stickyHeader />
          </div>

          <div className="finance-arrears-mobile">
            {rows.map((row) => {
              const actionable = arrearsActionableAmount(row);
              const pending = arrearsPendingCoverageAmount(row);
              const gross = arrearsGrossAmount(row);
              return (
                <article key={arrearsBillingPartnerId(row)} className="finance-arrears-card finance-arrears-redesign__mobile-card">
                  <div className="finance-arrears-card__head">
                    <button type="button" className="finance-arrears-family-link finance-arrears-card__title" onClick={() => openDrawer(row)} dir="auto">{rowLabel(row)}</button>
                    <span className={resolveFollowupBadgeClass(row.followup_status)} dir="auto">{row.followup_status_label ?? row.followup_status ?? t('common.dash')}</span>
                  </div>
                  <div className="finance-arrears-redesign__mobile-due">
                    <span>{t('admin.finance.arrears.columns.actionableOverdue')}</span>
                    <strong><FinanceMoney amount={actionable} currency={row.currency} /></strong>
                  </div>
                  <dl className="finance-arrears-redesign__mobile-meta">
                    {pending != null && pending > 0 ? <div><dt>{t('admin.finance.arrears.columns.pendingChequeCoverage')}</dt><dd><FinanceMoney amount={pending} currency={row.currency} /></dd></div> : null}
                    {gross != null && gross !== actionable ? <div><dt>{t('admin.finance.arrears.columns.grossOverdue')}</dt><dd><FinanceMoney amount={gross} currency={row.currency} /></dd></div> : null}
                    <div><dt>{t('admin.finance.arrears.columns.nextFollowup')}</dt><dd dir="ltr">{formatArrearsListDate(row.next_followup_date, formatDate, t('common.dash'))}</dd></div>
                  </dl>
                  <Link href={buildArrearsCollectHref(row, returnTo)} className="btn btn--primary btn--sm finance-arrears-card__collect">{t('admin.finance.arrears.actions.receivePayment')}</Link>
                </article>
              );
            })}
          </div>

          {pg ? <Pagination page={pg.page} pageSize={pg.page_size ?? ARREARS_PAGE_SIZE} totalPages={pg.total_pages} total={pg.total} onPage={(page) => onFiltersChange({ page })} /> : null}
        </div>
      )}

      <ArrearsFollowupDrawer
        open={filters.family != null}
        familyId={filters.family}
        familyLabel={drawerFamilyLabel}
        returnTo={returnTo}
        onClose={() => {
          setDrawerFamilyLabel(undefined);
          onCloseFamily();
        }}
        onSaved={reloadAll}
      />
    </div>
  );
}