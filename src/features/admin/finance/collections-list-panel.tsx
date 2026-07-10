'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { CollectionDetailDrawer } from '@/features/admin/finance/collection-detail-drawer';
import { CollectionStudentCell } from '@/features/admin/finance/collection-student-cell';
import { collectionAllocationSummary } from '@/features/admin/finance/collection-labels';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import {
  COLLECTIONS_PAGE_SIZE,
  collectionsListHasActiveQuery,
  countCollectionsByState,
  formatCollectionListDate,
  formatCollectionListPayerLabel,
  formatCollectionListReference,
  resolveCollectionBillingAccountLabel,
  resolveCollectionsListEmptyVariant,
} from '@/features/admin/finance/utils/collections-list-present';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { collectionState, paymentMethodLabel } from '@/lib/utils/finance';
import { isCollectionChequeReversed } from '@/lib/utils/cheque';
import type { PaymentCollection } from '@/types/finance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/collections-list.css';

type CollectionsListPanelProps = {
  studentIdFilter?: string;
  billingPartnerIdFilter?: string;
  returnTo?: string;
};

export function CollectionsListPanel({
  studentIdFilter = '',
  billingPartnerIdFilter = '',
  returnTo = '/admin/finance/collections',
}: CollectionsListPanelProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const hasActiveQuery = collectionsListHasActiveQuery({
    search: query,
    statusFilter,
    methodFilter,
    dateFrom,
    dateTo,
    studentId: studentIdFilter,
    billingPartnerId: billingPartnerIdFilter,
  });
  const emptyVariant = resolveCollectionsListEmptyVariant({ hasActiveQuery });

  const params: ListParams = {
    page,
    page_size: COLLECTIONS_PAGE_SIZE,
    search: query || undefined,
    status: statusFilter || undefined,
    state: statusFilter || undefined,
    payment_method: methodFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    student_id: studentIdFilter || undefined,
    billing_partner_id: billingPartnerIdFilter || undefined,
  };
  const state = useAdminResource<PaymentCollection[]>(endpoints.admin.financePaymentCollections, params);
  const pg = state.meta?.pagination;
  const isRefetching = state.fetching && !state.initialLoading;

  const columns: Column<PaymentCollection>[] = useMemo(
    () => [
      {
        key: 'payer',
        header: t('admin.finance.collections.columns.payer'),
        render: (row) => {
          const payer = formatCollectionListPayerLabel(row, t('admin.finance.unavailable'));
          const billingAccount = resolveCollectionBillingAccountLabel(row, '');
          return (
            <div className="finance-collections-list__payer">
              <span className="finance-collections-list__payer-name" dir="auto" title={payer}>
                {payer}
              </span>
              {billingAccount ? (
                <span
                  className="finance-collections-list__billing-account muted"
                  dir="auto"
                  title={billingAccount}
                >
                  {billingAccount}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => (
          <CollectionStudentCell
            student={row.student}
            studentId={row.student_id}
            studentName={row.student_name}
            code={row.student_code}
            returnTo={returnTo}
            unavailableLabel={t('admin.finance.unavailable')}
          />
        ),
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.amount ?? row.total_amount} currency={row.currency} />,
      },
      {
        key: 'method',
        header: t('admin.finance.paymentMethod'),
        render: (row) => <span dir="auto">{paymentMethodLabel(row.payment_method, t)}</span>,
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) =>
          isCollectionChequeReversed(row) ? (
            <ChequePaymentMarker collection={row} />
          ) : (
            <FinanceStatusBadge state={collectionState(row) || 'unknown'} />
          ),
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) => (
          <span className="finance-collections-list__date" dir="ltr">
            {formatCollectionListDate(row, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'reference',
        header: t('admin.finance.collections.columns.reference'),
        render: (row) => {
          const ref = formatCollectionListReference(row);
          const display = formatCollectionListReference(row, { truncate: true });
          return (
            <span className="finance-collections-list__reference mono" dir="ltr" title={ref}>
              {display}
            </span>
          );
        },
      },
      {
        key: 'allocation',
        header: t('admin.finance.collections.columns.allocation'),
        render: (row) => <span dir="auto">{collectionAllocationSummary(row, t)}</span>,
      },
      {
        key: 'open',
        header: '',
        width: '40px',
        render: () => <span className="finance-collections-list__open" aria-hidden>›</span>,
      },
    ],
    [formatDate, returnTo, t],
  );

  function resetFilters() {
    setSearch('');
    setQuery('');
    setStatusFilter('');
    setMethodFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function clearSearch() {
    setSearch('');
    setQuery('');
    setPage(1);
  }

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        title={t('admin.finance.collections.noMatch.title')}
        description={t('admin.finance.collections.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.finance.collections.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState title={t('admin.finance.noCollections')} />
    );

  const summaryCounts = state.data ? countCollectionsByState(state.data) : null;
  const total = pg?.total ?? state.data?.length ?? 0;

  return (
    <div className="finance-receivable-list finance-collections-list">
      {billingPartnerIdFilter ? (
        <BillingPartnerScopeChip
          billingPartnerId={billingPartnerIdFilter}
          onClear={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('billing_partner_id');
            const qs = params.toString();
            router.replace(qs ? `/admin/finance/collections?${qs}` : '/admin/finance/collections');
          }}
        />
      ) : null}

      {studentIdFilter ? (
        <p className="muted">
          {t('admin.finance.collections.filteredByStudent', { id: studentIdFilter })}{' '}
          <Link href="/admin/finance/collections">{t('admin.finance.collections.clearStudentFilter')}</Link>
        </p>
      ) : null}

      <div className="finance-receivable-list__context">
        {pg?.total != null && summaryCounts ? (
          <p className="finance-collections-list__summary" dir="ltr">
            {t('admin.finance.collections.summaryLine', {
              total,
              confirmed: summaryCounts.confirmed ?? 0,
              draft: summaryCounts.draft ?? 0,
              cancelled: summaryCounts.cancelled ?? 0,
              unknown: summaryCounts.unknown ?? 0,
            })}
          </p>
        ) : pg?.total != null ? (
          <p className="finance-receivable-list__result-count" dir="ltr">
            {t('admin.finance.collections.resultCount', { total: pg.total })}
          </p>
        ) : null}
      </div>

      <form
        className="toolbar finance-hub-filters finance-collections-list__toolbar finance-receivable-list__toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <div className="finance-receivable-list__search">
          <input
            className="input"
            placeholder={t('admin.finance.searchCollections')}
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t('academic.status')}
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="draft">{t('admin.finance.states.draft')}</option>
          <option value="confirmed">{t('admin.finance.states.confirmed')}</option>
          <option value="cancelled">{t('admin.finance.states.cancelled')}</option>
        </select>
        <select
          className="input"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          aria-label={t('admin.finance.paymentMethod')}
        >
          <option value="">{t('admin.finance.collections.allMethods')}</option>
          <option value="cash">{t('admin.finance.methodCash')}</option>
          <option value="cheque">{t('admin.finance.methodCheque')}</option>
          <option value="bank_transfer">{t('admin.finance.methodBankTransfer')}</option>
          <option value="card_terminal">{t('admin.finance.methodCardTerminal')}</option>
          <option value="other">{t('admin.finance.methodOther')}</option>
        </select>
        <input
          className="input"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          dir="ltr"
        />
        <input
          className="input"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          dir="ltr"
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.finance.collections.resetFilters')}
          </button>
        ) : null}
      </form>

      {hasActiveQuery ? (
        <div
          className="finance-receivable-list__chips"
          aria-label={t('admin.finance.collections.activeFilters')}
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
          {statusFilter ? (
            <span className="finance-receivable-list__chip">
              {t(`admin.finance.states.${statusFilter}`)}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => {
                  setStatusFilter('');
                  setPage(1);
                }}
              >
                ×
              </button>
            </span>
          ) : null}
          {methodFilter ? (
            <span className="finance-receivable-list__chip">
              {paymentMethodLabel(methodFilter, t)}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => {
                  setMethodFilter('');
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
          {t('admin.finance.collections.refetching')}
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
          state={state}
          loadingLabel={t('common.loading')}
          isEmpty={(rows) => rows.length === 0}
          empty={listEmptyState}
        >
          {(rows) => (
            <>
              <div className="finance-collections-list__table-wrap">
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => setSelectedCollectionId(row.id)}
                />
              </div>
              {pg ? (
                <Pagination
                  page={pg.page}
                  pageSize={pg.page_size ?? COLLECTIONS_PAGE_SIZE}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  onPage={setPage}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      </div>

      {selectedCollectionId ? (
        <CollectionDetailDrawer
          open={!!selectedCollectionId}
          collectionId={selectedCollectionId}
          onClose={() => setSelectedCollectionId(null)}
        />
      ) : null}
    </div>
  );
}
