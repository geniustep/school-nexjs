'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  accountKindFilterToApiParam,
  billingAccountKindBadgeClass,
  billingAccountKindLabelKey,
  resolveBillingAccountKindFromRow,
  type BillingAccountKindFilter,
} from '@/features/admin/finance/billing-account-kind';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  billingAccountErrorMessageKey,
  parseBillingAccountListResponse,
} from '@/lib/utils/normalize-billing-account';
import type { BillingAccountListItem } from '@/types/finance-billing-account';
import type { ListParams } from '@/types/api';

export type BillingAccountsListFilters = {
  search: string;
  academicYearId: string;
  classId: string;
  levelId: string;
  hasBalance: boolean;
  hasOverdue: boolean;
  accountKind: BillingAccountKindFilter;
  page: number;
};

type BillingAccountsListPanelProps = {
  filters: BillingAccountsListFilters;
  onFiltersChange: (
    updates: Partial<Record<keyof BillingAccountsListFilters, string | number | boolean | null>>,
  ) => void;
  returnTo?: string;
};

function accountLabel(row: BillingAccountListItem): string {
  const partner = row.billing_partner;
  const partnerName =
    partner && typeof partner === 'object' && 'display_name' in partner
      ? (partner as { display_name?: string; name?: string }).display_name ??
        (partner as { name?: string }).name
      : partner && typeof partner === 'object'
        ? (partner as { name?: string }).name
        : undefined;
  return row.display_name ?? partnerName ?? `#${row.billing_partner_id}`;
}

export function BillingAccountsListPanel({
  filters,
  onFiltersChange,
  returnTo,
}: BillingAccountsListPanelProps) {
  const t = useT();
  const { schools, activeSchoolId } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const { options: yearOptions } = useAcademicYearOptions(null);

  const query: ListParams = useMemo(() => {
    const accountKind = accountKindFilterToApiParam(filters.accountKind);
    return {
      page: filters.page,
      page_size: 20,
      search: filters.search || undefined,
      academic_year_id: filters.academicYearId || undefined,
      class_id: filters.classId || undefined,
      level_id: filters.levelId || undefined,
      has_balance: filters.hasBalance ? 1 : undefined,
      has_overdue: filters.hasOverdue ? 1 : undefined,
      account_kind: accountKind,
    };
  }, [filters]);

  const state = useAdminResource<unknown>(endpoints.admin.financeBillingAccounts, query);
  const parsed = useMemo(
    () => parseBillingAccountListResponse(state.data, state.meta),
    [state.data, state.meta],
  );
  const rows = parsed.items;
  const pg = parsed.pagination ?? state.meta?.pagination;
  const totalCount = pg?.total ?? 0;

  const pageTotals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.totalDue += row.total_due ?? 0;
          acc.remaining += row.total_remaining ?? 0;
          acc.overdue += row.total_overdue ?? 0;
          return acc;
        },
        { totalDue: 0, remaining: 0, overdue: 0 },
      ),
    [rows],
  );
  const pageCurrency = rows.find((row) => row.currency)?.currency;

  const columns: Column<BillingAccountListItem>[] = useMemo(
    () => [
      {
        key: 'payer',
        header: t('admin.finance.billingAccounts.columns.payer'),
        render: (row) => {
          const kind = resolveBillingAccountKindFromRow(row);
          return (
            <span className="finance-billing-account-name-cell">
              <span dir="auto" className="finance-billing-account-name">
                {accountLabel(row)}
              </span>
              <span className={billingAccountKindBadgeClass(kind)}>
                {t(billingAccountKindLabelKey(kind))}
              </span>
            </span>
          );
        },
      },
      {
        key: 'reference',
        header: t('admin.finance.billingAccounts.columns.reference'),
        render: (row) => <span className="mono">{row.reference ?? t('common.dash')}</span>,
      },
      {
        key: 'students',
        header: t('admin.finance.billingAccounts.columns.studentCount'),
        render: (row) => (
          <span className="mono">{row.student_count ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'total_due',
        header: t('admin.finance.billingAccounts.columns.totalDue'),
        render: (row) => <FinanceMoney amount={row.total_due} currency={row.currency} />,
      },
      {
        key: 'confirmed_paid',
        header: t('admin.finance.billingAccounts.columns.confirmedPaid'),
        render: (row) => <FinanceMoney amount={row.confirmed_paid} currency={row.currency} />,
      },
      {
        key: 'remaining',
        header: t('admin.finance.billingAccounts.columns.remaining'),
        render: (row) => <FinanceMoney amount={row.total_remaining} currency={row.currency} />,
      },
      {
        key: 'overdue',
        header: t('admin.finance.billingAccounts.columns.overdue'),
        render: (row) => <FinanceMoney amount={row.total_overdue} currency={row.currency} />,
      },
      {
        key: 'pending_cheque',
        header: t('admin.finance.billingAccounts.columns.pendingCheque'),
        render: (row) => (
          <FinanceMoney amount={row.pending_cheque_amount} currency={row.currency} />
        ),
      },
      {
        key: 'unallocated',
        header: t('admin.finance.billingAccounts.columns.unallocated'),
        render: (row) => (
          <FinanceMoney amount={row.unallocated_collection_amount} currency={row.currency} />
        ),
      },
      {
        key: 'status',
        header: t('admin.finance.billingAccounts.columns.status'),
        render: (row) => (
          <span dir="auto">{row.status_label ?? row.status ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'actions',
        header: t('admin.finance.billingAccounts.columns.actions'),
        render: (row) => {
          const kind = resolveBillingAccountKindFromRow(row);
          const detailHref = `/admin/finance/billing-accounts/${row.billing_partner_id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
          const familyCollectHref = `${detailHref}${detailHref.includes('?') ? '&' : '?'}family_collect=1`;
          return (
            <div className="finance-billing-account-row-actions">
              <Link href={detailHref} className="btn btn--ghost btn--sm" onClick={(e) => e.stopPropagation()}>
                {t('admin.finance.billingAccounts.openAccount')}
              </Link>
              {kind === 'family' ? (
                <Link
                  href={familyCollectHref}
                  className="btn btn--primary btn--sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('admin.finance.billingAccounts.receiveFamilyPayment')}
                </Link>
              ) : kind === 'individual' ? (
                <Link
                  href={`/admin/finance/collections/new?billing_partner_id=${row.billing_partner_id}&returnTo=${encodeURIComponent(detailHref)}`}
                  className="btn btn--secondary btn--sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('admin.finance.billingAccounts.receivePayment')}
                </Link>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t, returnTo],
  );

  const hasFilters = !!(
    filters.search ||
    filters.academicYearId ||
    filters.classId ||
    filters.levelId ||
    filters.hasBalance ||
    filters.hasOverdue ||
    filters.accountKind !== 'all'
  );

  function resetAll() {
    onFiltersChange({
      search: null,
      academicYearId: null,
      classId: null,
      levelId: null,
      hasBalance: null,
      hasOverdue: null,
      accountKind: 'all',
      page: 1,
    });
  }

  function emptyListTitle(): string {
    switch (filters.accountKind) {
      case 'family':
        return t('admin.finance.billingAccounts.familyFilterEmptyTitle');
      case 'individual':
        return t('admin.finance.billingAccounts.individualFilterEmptyTitle');
      case 'empty':
        return t('admin.finance.billingAccounts.emptyKindFilterEmptyTitle');
      default:
        return t('admin.finance.billingAccounts.emptyListTitle');
    }
  }

  function emptyListDescription(): string {
    switch (filters.accountKind) {
      case 'family':
        return t('admin.finance.billingAccounts.familyFilterEmptyDesc');
      case 'individual':
        return t('admin.finance.billingAccounts.individualFilterEmptyDesc');
      case 'empty':
        return t('admin.finance.billingAccounts.emptyKindFilterEmptyDesc');
      default:
        return t('admin.finance.billingAccounts.emptyListDesc');
    }
  }

  const errorMessage =
    state.error?.code != null ? t(billingAccountErrorMessageKey(state.error.code)) : undefined;

  return (
    <>
      <header className="finance-billing-accounts-header">
        {activeSchool ? (
          <p className="muted finance-billing-accounts-school">
            {t('admin.finance.activeSchool')}: <strong dir="auto">{activeSchool.name}</strong>
          </p>
        ) : null}
        <div className="finance-metrics-grid finance-billing-accounts-metrics">
          <div className="card finance-metric-card">
            <span className="muted">{t('admin.finance.billingAccounts.accountCountLabel')}</span>
            {state.loading && !rows.length ? (
              <span className="finance-skeleton finance-skeleton--metric" aria-hidden />
            ) : (
              <strong className="mono">{totalCount}</strong>
            )}
          </div>
          <div className="card finance-metric-card">
            <span className="muted">{t('admin.finance.billingAccounts.metrics.totalDue')}</span>
            <strong>
              <FinanceMoney amount={pageTotals.totalDue} currency={pageCurrency} />
            </strong>
          </div>
          <div className="card finance-metric-card finance-metric-card--remaining">
            <span className="muted">{t('admin.finance.billingAccounts.metrics.remaining')}</span>
            <strong>
              <FinanceMoney amount={pageTotals.remaining} currency={pageCurrency} />
            </strong>
          </div>
          <div className="card finance-metric-card finance-metric-card--overdue">
            <span className="muted">{t('admin.finance.billingAccounts.metrics.overdue')}</span>
            <strong>
              <FinanceMoney amount={pageTotals.overdue} currency={pageCurrency} />
            </strong>
          </div>
        </div>
        {rows.length > 0 ? (
          <p className="tiny muted finance-billing-accounts-hint">
            {t('admin.finance.billingAccounts.pageTotalsHint')}
          </p>
        ) : null}
      </header>

      <form
        className="toolbar finance-hub-filters finance-billing-accounts-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onFiltersChange({
            search: String(fd.get('search') ?? '').trim() || null,
            academicYearId: String(fd.get('academic_year_id') ?? '') || null,
            classId: String(fd.get('class_id') ?? '').trim() || null,
            levelId: String(fd.get('level_id') ?? '').trim() || null,
            accountKind: (String(fd.get('account_kind') ?? 'all') as BillingAccountKindFilter) || 'all',
            hasBalance: fd.get('has_balance') === 'on',
            hasOverdue: fd.get('has_overdue') === 'on',
            page: 1,
          });
        }}
      >
        <label className="finance-filter-field">
          <span className="tiny muted">{t('common.search')}</span>
          <input
            className="input"
            name="search"
            defaultValue={filters.search}
            placeholder={t('admin.finance.billingAccounts.searchPlaceholder')}
          />
        </label>
        <label className="finance-filter-field">
          <span className="tiny muted">{t('admin.finance.hub.filterAcademicYear')}</span>
          <select className="input" name="academic_year_id" defaultValue={filters.academicYearId}>
            <option value="">{t('admin.finance.hub.allAcademicYears')}</option>
            {yearOptions.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
        <label className="finance-filter-field">
          <span className="tiny muted">{t('admin.finance.billingAccounts.filters.class')}</span>
          <input className="input" name="class_id" defaultValue={filters.classId} inputMode="numeric" />
        </label>
        <label className="finance-filter-field">
          <span className="tiny muted">{t('admin.finance.billingAccounts.filters.level')}</span>
          <input className="input" name="level_id" defaultValue={filters.levelId} inputMode="numeric" />
        </label>
        <label className="finance-filter-field">
          <span className="tiny muted">{t('admin.finance.billingAccounts.filters.accountKind')}</span>
          <select className="input" name="account_kind" defaultValue={filters.accountKind}>
            <option value="all">{t('admin.finance.billingAccounts.filters.accountKindAll')}</option>
            <option value="family">{t('admin.finance.billingAccounts.filters.accountKindFamily')}</option>
            <option value="individual">{t('admin.finance.billingAccounts.filters.accountKindIndividual')}</option>
            <option value="empty">{t('admin.finance.billingAccounts.filters.accountKindNoStudents')}</option>
          </select>
        </label>
        <label className="finance-filter-checkbox">
          <input type="checkbox" name="has_balance" defaultChecked={filters.hasBalance} />
          <span>{t('admin.finance.billingAccounts.filters.hasBalance')}</span>
        </label>
        <label className="finance-filter-checkbox">
          <input type="checkbox" name="has_overdue" defaultChecked={filters.hasOverdue} />
          <span>{t('admin.finance.billingAccounts.filters.hasOverdue')}</span>
        </label>
        <div className="finance-filter-actions">
          <button type="submit" className="btn btn--primary btn--sm">
            {t('admin.studentsList.applyFilters')}
          </button>
          {hasFilters ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
              {t('admin.studentsList.resetFilters')}
            </button>
          ) : null}
        </div>
      </form>

      {state.error ? (
        <ApiErrorView
          error={{ ...state.error, message: errorMessage ?? state.error.message }}
          onRetry={state.reload}
        />
      ) : null}

      {state.initialLoading ? <LoadingState label={t('common.loading')} /> : null}

      {!state.initialLoading && !state.error && rows.length === 0 ? (
        <EmptyState title={emptyListTitle()} description={emptyListDescription()} />
      ) : null}

      {!state.initialLoading && rows.length > 0 ? (
        <>
          <div className="finance-billing-accounts-table-wrap finance-billing-accounts-desktop">
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.billing_partner_id}
              onRowClick={(row) => {
                window.location.href = `/admin/finance/billing-accounts/${row.billing_partner_id}`;
              }}
            />
          </div>
          <div className="finance-billing-accounts-mobile">
            {rows.map((row) => {
              const kind = resolveBillingAccountKindFromRow(row);
              return (
              <article key={row.billing_partner_id} className="card finance-billing-account-card">
                <div className="finance-billing-account-card__head">
                  <div className="finance-billing-account-card__identity">
                    <strong dir="auto" className="finance-billing-account-name">
                      {accountLabel(row)}
                    </strong>
                    <span className={billingAccountKindBadgeClass(kind)}>
                      {t(billingAccountKindLabelKey(kind))}
                    </span>
                    {row.reference ? (
                      <span className="mono tiny muted">{row.reference}</span>
                    ) : null}
                  </div>
                  {row.status_label ?? row.status ? (
                    <span className="finance-billing-account-card__status" dir="auto">
                      {row.status_label ?? row.status}
                    </span>
                  ) : null}
                </div>
                <dl className="finance-billing-account-card__metrics">
                  <div>
                    <dt>{t('admin.finance.billingAccounts.columns.totalDue')}</dt>
                    <dd>
                      <FinanceMoney amount={row.total_due} currency={row.currency} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.billingAccounts.columns.remaining')}</dt>
                    <dd>
                      <FinanceMoney amount={row.total_remaining} currency={row.currency} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.billingAccounts.columns.overdue')}</dt>
                    <dd>
                      <FinanceMoney amount={row.total_overdue} currency={row.currency} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.billingAccounts.columns.studentCount')}</dt>
                    <dd className="mono">{row.student_count ?? t('common.dash')}</dd>
                  </div>
                </dl>
                <div className="finance-billing-account-card__actions row">
                  <Link
                    href={`/admin/finance/billing-accounts/${row.billing_partner_id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                    className="btn btn--ghost btn--sm"
                  >
                    {t('admin.finance.billingAccounts.openAccount')}
                  </Link>
                  {kind === 'family' ? (
                    <Link
                      href={`/admin/finance/billing-accounts/${row.billing_partner_id}?family_collect=1${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                      className="btn btn--primary btn--sm"
                    >
                      {t('admin.finance.billingAccounts.receiveFamilyPayment')}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
            })}
          </div>
          {pg ? (
            <Pagination
              page={pg.page}
              pageSize={pg.page_size}
              total={pg.total}
              totalPages={pg.total_pages}
              onPage={(page) => onFiltersChange({ page })}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
