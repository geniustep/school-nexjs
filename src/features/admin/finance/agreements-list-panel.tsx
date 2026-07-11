'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Agreements list shell only (student-scoped).
 * Detail, amendments, billing party transition, and schedule regeneration remain outside adopted scope.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  AGREEMENTS_PAGE_SIZE,
  agreementsListHasActiveQuery,
  formatAgreementListDate,
  formatAgreementListNumber,
  resolveAgreementsListEmptyVariant,
} from '@/features/admin/finance/utils/agreements-list-present';
import { AgreementStateBadge } from '@/features/admin/student-finance/components/agreement-state-badge';
import { useStudentFinancialAgreements } from '@/features/admin/student-finance/hooks/use-financial-agreement';
import type { FinancialAgreement } from '@/features/admin/student-finance/types';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { refName } from '@/lib/utils/finance';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/agreements-list.css';

export function AgreementsListPanel({
  studentId,
  returnTo,
  initialState,
}: {
  studentId: number;
  returnTo?: string | null;
  initialState?: string;
}) {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const { options: yearOptions } = useAcademicYearOptions(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState(initialState ?? '');
  const [yearId, setYearId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const dash = t('common.dash');

  const hasActiveQuery = agreementsListHasActiveQuery({
    search: query,
    stateFilter,
    yearId,
    dateFrom,
    dateTo,
  });
  const emptyVariant = resolveAgreementsListEmptyVariant({ hasActiveQuery });

  const params = useMemo(
    () => ({
      page,
      page_size: AGREEMENTS_PAGE_SIZE,
      search: query || undefined,
      state: stateFilter || undefined,
      academic_year_id: yearId ? Number(yearId) : undefined,
      agreement_date_from: dateFrom || undefined,
      agreement_date_to: dateTo || undefined,
    }),
    [page, query, stateFilter, yearId, dateFrom, dateTo],
  );

  const state = useStudentFinancialAgreements(studentId, params);
  const pg = state.meta?.pagination;
  const isRefetching = state.fetching && !state.initialLoading;
  const safeReturn = sanitizeReturnTo(returnTo, '/admin/finance/agreements');

  const clearSearch = () => {
    setSearch('');
    setQuery('');
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setQuery('');
    setStateFilter('');
    setYearId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const columns: Column<FinancialAgreement>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.agreements.columns.number'),
        render: (row) => (
          <span className="mono finance-agreements-list__number">{formatAgreementListNumber(row)}</span>
        ),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => (
          <Link
            href={buildStudentFinanceLink(row.student_id, 'financial-agreement', safeReturn)}
            onClick={(e) => e.stopPropagation()}
          >
            {refName(row.student) ?? `#${row.student_id}`}
          </Link>
        ),
      },
      {
        key: 'year',
        header: t('admin.finance.agreements.columns.academicYear'),
        render: (row) => refName(row.academic_year) ?? dash,
      },
      {
        key: 'billing',
        header: t('admin.finance.agreements.columns.billingParty'),
        render: (row) => (
          <span dir="auto">{refName(row.billing_partner) ?? dash}</span>
        ),
      },
      {
        key: 'date',
        header: t('admin.finance.agreements.columns.agreementDate'),
        render: (row) => (
          <span className="finance-agreements-list__date" dir="ltr">
            {formatAgreementListDate(row.agreement_date, formatDate, dash)}
          </span>
        ),
      },
      {
        key: 'period',
        header: t('admin.finance.agreements.columns.period'),
        render: (row) => formatPeriodRange(formatDate, row.valid_from, row.valid_until),
      },
      {
        key: 'net',
        header: t('admin.finance.agreements.columns.netAmount'),
        render: (row) => (
          <span className="finance-agreements-list__amount">
            <FinanceMoney amount={row.net_amount} currency={row.currency?.name} />
          </span>
        ),
      },
      {
        key: 'installments',
        header: t('admin.finance.agreements.columns.installmentCount'),
        render: (row) => row.schedule_summary?.installment_count ?? dash,
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <AgreementStateBadge state={row.state} />,
      },
    ],
    [t, formatDate, safeReturn, dash],
  );

  const emptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        title={t('admin.finance.agreements.noMatch.title')}
        description={t('admin.finance.agreements.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.finance.agreements.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        title={t('admin.finance.agreements.emptyTitle')}
        description={t('admin.finance.agreements.emptyDesc')}
        action={
          <Link
            href={buildStudentFinanceLink(studentId, 'financial-agreement', safeReturn)}
            className="btn btn--primary btn--sm"
          >
            {t('admin.finance.agreements.openStudent360')}
          </Link>
        }
      />
    );

  return (
    <div className="finance-agreements-list finance-receivable-list">
      {pg?.total != null ? (
        <p className="finance-receivable-list__result-count" dir="ltr">
          {t('admin.finance.agreements.resultCount', { total: pg.total })}
        </p>
      ) : null}

      <form
        className="toolbar finance-hub-filters finance-receivable-list__toolbar finance-agreements-list__toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <div className="finance-receivable-list__search">
          <input
            className="input"
            placeholder={t('admin.finance.agreements.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="auto"
          />
          {search || query ? (
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
        <select
          className="input"
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t('academic.status')}
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="draft">{t('admin.finance.agreements.states.draft')}</option>
          <option value="pending_approval">{t('admin.finance.agreements.states.pendingApproval')}</option>
          <option value="approved">{t('admin.finance.agreements.states.approved')}</option>
          <option value="active">{t('admin.finance.agreements.states.active')}</option>
          <option value="cancelled">{t('admin.finance.agreements.states.cancelled')}</option>
        </select>
        <select
          className="input"
          value={yearId}
          onChange={(e) => {
            setYearId(e.target.value);
            setPage(1);
          }}
          aria-label={t('admin.finance.agreements.columns.academicYear')}
        >
          <option value="">{t('admin.finance.allAcademicYears')}</option>
          {yearOptions.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          dir="ltr"
          aria-label={t('admin.finance.agreements.columns.agreementDate')}
        />
        <input
          className="input"
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          dir="ltr"
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.finance.agreements.resetFilters')}
          </button>
        ) : null}
      </form>

      {hasActiveQuery ? (
        <div
          className="finance-receivable-list__chips"
          aria-label={t('admin.finance.agreements.activeFilters')}
        >
          {query ? (
            <span className="finance-receivable-list__chip">
              <span dir="auto">{query}</span>
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={clearSearch}
              >
                ×
              </button>
            </span>
          ) : null}
          {stateFilter ? (
            <span className="finance-receivable-list__chip">
              {stateFilter === 'pending_approval'
                ? t('admin.finance.agreements.states.pendingApproval')
                : t(`admin.finance.agreements.states.${stateFilter}`)}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => {
                  setStateFilter('');
                  setPage(1);
                }}
              >
                ×
              </button>
            </span>
          ) : null}
          {yearId ? (
            <span className="finance-receivable-list__chip">
              {yearOptions.find((y) => String(y.id) === yearId)?.name ?? yearId}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => {
                  setYearId('');
                  setPage(1);
                }}
              >
                ×
              </button>
            </span>
          ) : null}
          {dateFrom || dateTo ? (
            <span className="finance-receivable-list__chip">
              <span dir="ltr">
                {dateFrom || '…'} → {dateTo || '…'}
              </span>
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                ×
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.agreements.refetching')}
        </p>
      ) : null}

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        empty={emptyState}
      >
        {(rows) => (
          <div
            className={
              isRefetching
                ? 'finance-agreements-list__table-wrap finance-receivable-list__results finance-receivable-list__results--fetching'
                : 'finance-agreements-list__table-wrap finance-receivable-list__results'
            }
          >
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                router.push(`/admin/finance/agreements/${row.id}?returnTo=${encodeURIComponent(safeReturn)}`)
              }
            />
            {pg && (
              <Pagination
                page={pg.page}
                totalPages={pg.total_pages}
                total={pg.total}
                pageSize={pg.page_size}
                onPage={setPage}
              />
            )}
          </div>
        )}
      </ResourceView>
    </div>
  );
}
