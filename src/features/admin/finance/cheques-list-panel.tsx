'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiErrorView } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { ChequeDueIndicator } from '@/features/admin/finance/cheque-due-indicator';
import { ChequeDualBadges } from '@/features/admin/student-finance/components/cheque-dual-badges';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import {
  CHEQUE_QUICK_FILTERS,
  chequeQuickFilterDescKey,
  chequeQuickFilterLabelKey,
  chequeQuickFilterTitleKey,
  type ChequeQuickFilter,
} from '@/features/admin/finance/finance-filter-contracts';
import {
  CHEQUES_PAGE_SIZE,
  chequeQuickFilterChipLabelKey,
  chequesListHasActiveQuery,
  formatChequeListDate,
  resolveChequeListLifecycleState,
  resolveChequeListMaturityStatus,
  resolveChequeQuickFilter,
  resolveChequesListEmptyVariant,
} from '@/features/admin/finance/utils/cheques-list-present';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import type { FinanceCheque } from '@/types/finance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/payment-documents-lists.css';

export type ChequesListFilters = {
  quick: string;
  search: string;
  dueFrom: string;
  dueTo: string;
  studentId: string;
  billingPartnerId: string;
  page: number;
};

type ChequesListPanelProps = {
  filters: ChequesListFilters;
  onFiltersChange: (updates: Partial<Record<keyof ChequesListFilters, string | number | null>>) => void;
  returnTo?: string;
};

const TAB_QUICKS: ChequeQuickFilter[] = CHEQUE_QUICK_FILTERS.filter((q) => q !== 'all');

export function ChequesListPanel({
  filters,
  onFiltersChange,
  returnTo = '/admin/finance/cheques',
}: ChequesListPanelProps) {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();

  const quickValid = resolveChequeQuickFilter(filters.quick);
  const invalidQuick = filters.quick && !quickValid;

  const query: ListParams = useMemo(() => {
    const p: ListParams = {
      page: filters.page,
      page_size: CHEQUES_PAGE_SIZE,
      search: filters.search || undefined,
      student_id: filters.studentId || undefined,
      billing_partner_id: filters.billingPartnerId || undefined,
      include_summary: quickValid ? 1 : undefined,
    };
    if (filters.dueFrom) p.maturity_date_from = filters.dueFrom;
    if (filters.dueTo) p.maturity_date_to = filters.dueTo;
    if (quickValid && quickValid !== 'all') p.quick = quickValid;
    return p;
  }, [filters, quickValid]);

  const state = useAdminResource<FinanceCheque[] | Record<string, unknown>>(
    endpoints.admin.financeCheques,
    query,
  );
  const parsed = useMemo(
    () => parseFinanceQuickListResponse<FinanceCheque>(state.data),
    [state.data],
  );
  const rows = parsed.items;
  const summary = parsed.summary;
  const applied = parsed.appliedFilters;
  const pg = state.meta?.pagination;

  const hasActiveQuery = chequesListHasActiveQuery(filters);
  const emptyVariant = resolveChequesListEmptyVariant({ hasActiveQuery });
  const isRefetching = state.fetching && !state.initialLoading;
  const quickChipKey = chequeQuickFilterChipLabelKey(quickValid);

  const listReturnTo = useMemo(() => {
    const params = new URLSearchParams();
    if (quickValid) params.set('quick', quickValid);
    const qs = params.toString();
    return `/admin/finance/cheques${qs ? `?${qs}` : ''}`;
  }, [quickValid]);

  const columns: Column<FinanceCheque>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.cheques.chequeNumber'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {row.cheque_number ?? t('common.dash')}
          </span>
        ),
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
            row.student_name ??
            financeStudentDisplayName(row.student ?? {}) ??
            t('admin.finance.unavailable');
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
        render: (row) => (
          <span className="finance-receivable-list__date" dir="ltr">
            {formatChequeListDate(row.received_date, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'due',
        header: t('admin.finance.cheques.dueDate'),
        render: (row) => (
          <span className="finance-receivable-list__date" dir="ltr">
            {formatChequeListDate(row.due_date, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => {
          const extended = row as FinanceCheque & {
            lifecycle_state?: string;
            maturity_status?: string;
          };
          return (
            <ChequeDualBadges
              lifecycleState={resolveChequeListLifecycleState(
                extended.lifecycle_state,
                row.state,
              )}
              maturityStatus={resolveChequeListMaturityStatus(extended.maturity_status)}
            />
          );
        },
      },
      {
        key: 'dueFlag',
        header: t('admin.finance.cheques.dueStatus'),
        render: (row) => <ChequeDueIndicator cheque={row} />,
      },
    ],
    [t, formatDate, returnTo],
  );

  function setQuick(next: ChequeQuickFilter | '') {
    onFiltersChange({ quick: next || null, page: 1 });
  }

  function resetAll() {
    onFiltersChange({
      quick: null,
      search: null,
      dueFrom: null,
      dueTo: null,
      studentId: null,
      page: 1,
    });
  }

  function emptyTitle(): string {
    if (emptyVariant === 'no-match') {
      if (quickValid === 'due_next_7_days') {
        return t('admin.finance.cheques.emptyDueNextSevenDays');
      }
      if (quickValid) {
        return t('admin.finance.cheques.emptyFilteredTitle', {
          filter: t(chequeQuickFilterLabelKey(quickValid)),
        });
      }
      return t('admin.finance.cheques.noMatch.title');
    }
    return t('admin.finance.cheques.empty');
  }

  function emptyDescription(): string {
    if (emptyVariant === 'no-match') {
      return t('admin.finance.cheques.noMatch.description');
    }
    return t('admin.finance.cheques.emptyFilteredDesc');
  }

  const listEmptyState = (
    <EmptyState
      title={emptyTitle()}
      description={emptyDescription()}
      action={
        hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            {t('admin.finance.cheques.showAllCheques')}
          </button>
        ) : undefined
      }
    />
  );

  return (
    <div className="finance-receivable-list finance-payment-docs-list finance-cheques-list">
      {filters.billingPartnerId ? (
        <BillingPartnerScopeChip
          billingPartnerId={filters.billingPartnerId}
          onClear={() => onFiltersChange({ billingPartnerId: null, page: 1 })}
        />
      ) : null}

      {invalidQuick ? (
        <ApiErrorView
          error={{
            code: 'invalid_quick_filter',
            message: t('admin.finance.errors.invalidQuickFilter'),
          }}
        />
      ) : null}

      {summary ? (
        <div className="finance-metrics-grid finance-cheque-summary-grid finance-cheque-summary-grid--balanced finance-receivable-list__context">
          <div className="card finance-metric-card">
            <span className="muted">{t('admin.finance.cheques.summaryTotalCount')}</span>
            <strong className="mono" dir="ltr">
              {summary.total_count ?? pg?.total ?? 0}
            </strong>
          </div>
          {summary.total_amount != null ? (
            <div className="card finance-metric-card">
              <span className="muted">{t('admin.finance.cheques.summaryTotalAmount')}</span>
              <strong>
                <FinanceMoney amount={summary.total_amount} />
              </strong>
            </div>
          ) : null}
          {applied?.date_from && applied?.date_to ? (
            <div className="card finance-metric-card">
              <span className="muted">{t('admin.finance.cheques.summaryDateRange')}</span>
              <strong className="finance-receivable-list__date tiny" dir="ltr">
                {formatChequeListDate(String(applied.date_from), formatDate, t('common.dash'))} –{' '}
                {formatChequeListDate(String(applied.date_to), formatDate, t('common.dash'))}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {pg ? (
        <p className="finance-receivable-list__result-count" dir="ltr">
          {t('admin.finance.cheques.resultCount', { total: pg.total })}
        </p>
      ) : null}

      <div className="finance-cheque-quick-filters finance-cheque-quick-filters--compact finance-receivable-list__tabs">
        <button
          type="button"
          className={`btn btn--ghost btn--sm${!quickValid ? ' is-active' : ''}`}
          onClick={() => setQuick('')}
        >
          {t('admin.finance.cheques.filters.all')}
        </button>
        {TAB_QUICKS.map((key) => (
          <button
            key={key}
            type="button"
            className={`btn btn--ghost btn--sm${quickValid === key ? ' is-active' : ''}`}
            onClick={() => setQuick(quickValid === key ? '' : key)}
          >
            {t(chequeQuickFilterLabelKey(key))}
          </button>
        ))}
      </div>

      {quickChipKey ? (
        <div className="finance-receivable-list__chips">
          <span className="finance-receivable-list__chip">
            {t('admin.finance.cheques.activeFilterChip', {
              filter: t(quickChipKey),
            })}
            <button
              type="button"
              className="finance-receivable-list__chip-clear"
              aria-label={t('admin.finance.cheques.clearFilter')}
              onClick={() => setQuick('')}
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
            dueFrom: String(fd.get('due_date_from') ?? '') || null,
            dueTo: String(fd.get('due_date_to') ?? '') || null,
            studentId: String(fd.get('student_id') ?? '').trim() || null,
            quick: null,
            page: 1,
          });
        }}
      >
        <div className="finance-receivable-list__search">
          <input
            className="input"
            name="search"
            placeholder={t('admin.finance.cheques.searchPlaceholder')}
            defaultValue={filters.search}
            dir="auto"
          />
          {filters.search ? (
            <button
              type="button"
              className="finance-receivable-list__search-clear"
              aria-label={t('common.clear')}
              onClick={() => onFiltersChange({ search: null, page: 1 })}
            >
              ×
            </button>
          ) : null}
        </div>
        <input
          className="input"
          type="date"
          name="due_date_from"
          defaultValue={filters.dueFrom}
          aria-label={t('admin.finance.cheques.dueFrom')}
          dir="ltr"
        />
        <input
          className="input"
          type="date"
          name="due_date_to"
          defaultValue={filters.dueTo}
          aria-label={t('admin.finance.cheques.dueTo')}
          dir="ltr"
        />
        <input
          className="input"
          name="student_id"
          placeholder={t('admin.finance.cheques.studentIdFilter')}
          defaultValue={filters.studentId}
          dir="ltr"
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            {t('admin.finance.collections.resetFilters')}
          </button>
        ) : null}
      </form>

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.cheques.refetching')}
        </p>
      ) : null}

      <div
        className={
          isRefetching
            ? 'finance-receivable-list__results finance-receivable-list__results--fetching'
            : 'finance-receivable-list__results'
        }
        aria-busy={isRefetching || undefined}
      >
        <ResourceView
          state={{ ...state, data: rows as FinanceCheque[] | null }}
          loadingLabel={t('common.loading')}
          isEmpty={(list) => list.length === 0}
          empty={listEmptyState}
        >
          {(list) => (
            <>
              <div className="finance-payment-docs-list__table-wrap">
                <DataTable
                  columns={columns}
                  rows={list}
                  rowKey={(row) => row.id}
                  onRowClick={(row) =>
                    router.push(appendReturnTo(`/admin/finance/cheques/${row.id}`, listReturnTo))
                  }
                />
              </div>
              {pg ? (
                <Pagination
                  page={pg.page}
                  pageSize={pg.page_size ?? CHEQUES_PAGE_SIZE}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  onPage={(p) => onFiltersChange({ page: p })}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      </div>
    </div>
  );
}

export function chequesListPageTitle(
  quick: string,
  t: (key: string) => string,
): string {
  const quickValid = resolveChequeQuickFilter(quick);
  if (quickValid && chequeQuickFilterTitleKey(quickValid)) {
    return t(chequeQuickFilterTitleKey(quickValid)!);
  }
  return t('admin.finance.cheques.title');
}

export function chequesListPageSubtitle(
  quick: string,
  t: (key: string) => string,
): string {
  const quickValid = resolveChequeQuickFilter(quick);
  if (quickValid && chequeQuickFilterDescKey(quickValid)) {
    return t(chequeQuickFilterDescKey(quickValid)!);
  }
  return t('admin.finance.cheques.subtitle');
}
