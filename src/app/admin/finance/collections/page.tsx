'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { CollectionDetailDrawer } from '@/features/admin/finance/collection-detail-drawer';
import { CollectionStudentCell } from '@/features/admin/finance/collection-student-cell';
import { collectionAllocationSummary, truncateReference } from '@/features/admin/finance/collection-labels';
import { formatCollectionReference } from '@/features/admin/finance/collection-normalize';
import {
  buildPaymentCollectionsListQuery,
  filterCollectionsForStudent,
} from '@/features/admin/finance/collection-list-query';
import { resolveCollectionPayerLabel } from '@/features/admin/finance/collection-payer-label';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_PAYMENTS, canCollectPayments } from '@/lib/permissions/finance';
import { useFinanceJournalsAvailable } from '@/features/admin/finance/use-finance-lookups';
import { useSession } from '@/features/auth/session-context';
import { collectionState, paymentMethodLabel } from '@/lib/utils/finance';
import { isCollectionChequeReversed } from '@/lib/utils/cheque';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { PaymentCollection } from '@/types/finance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/finance-ui.css';

function countByState(rows: PaymentCollection[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const state = collectionState(row) || 'unknown';
    counts[state] = (counts[state] ?? 0) + 1;
  }
  return counts;
}

export default function AdminFinanceCollectionsPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdFilter = searchParams.get('student_id') ?? searchParams.get('studentId') ?? '';
  const billingPartnerIdFilter = searchParams.get('billing_partner_id') ?? '';
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/collections');
  const { formatDate } = useFormat();
  const { available: journalsAvailable } = useFinanceJournalsAvailable();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const hasFilters = !!(query || statusFilter || methodFilter || dateFrom || dateTo);

  const params: ListParams = buildPaymentCollectionsListQuery({
    page,
    page_size: 20,
    search: query || undefined,
    status: statusFilter || undefined,
    state: statusFilter || undefined,
    payment_method: methodFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    student_id: studentIdFilter || undefined,
    billing_partner_id: billingPartnerIdFilter || undefined,
  });
  const state = useAdminResource<PaymentCollection[]>(endpoints.admin.financePaymentCollections, params);
  const pg = state.meta?.pagination;

  const newCollectionHref = appendReturnTo(
    studentIdFilter
      ? `/admin/finance/collections/new?studentId=${studentIdFilter}`
      : '/admin/finance/collections/new',
    returnTo,
  );

  const columns: Column<PaymentCollection>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => (
          <CollectionStudentCell
            student={row.student}
            studentId={row.student_id}
            returnTo={returnTo}
            unavailableLabel={t('admin.finance.unavailable')}
          />
        ),
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) => formatDate(row.collection_date ?? row.date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.amount ?? row.total_amount} currency={row.currency} />,
      },
      {
        key: 'method',
        header: t('admin.finance.paymentMethod'),
        render: (row) => paymentMethodLabel(row.payment_method, t),
      },
      {
        key: 'payer',
        header: t('admin.finance.collections.columns.payer'),
        render: (row) => resolveCollectionPayerLabel(row, t('admin.finance.unavailable')),
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
        key: 'allocation',
        header: t('admin.finance.collections.columns.allocation'),
        render: (row) => collectionAllocationSummary(row, t),
      },
      {
        key: 'reference',
        header: t('admin.finance.collections.columns.reference'),
        render: (row) => {
          const ref = formatCollectionReference(row);
          return (
            <span className="mono collections-table__reference" dir="auto" title={ref}>
              {truncateReference(ref)}
            </span>
          );
        },
      },
      {
        key: 'open',
        header: '',
        render: () => <span className="collections-table__open" aria-hidden>›</span>,
      },
    ],
    [t, formatDate, returnTo],
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

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href={returnTo === '/admin/finance/collections' ? '/admin/finance' : returnTo} className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.collectionsTitle')}
        subtitle={t('admin.finance.collectionsDesc')}
        actions={
          canCollectPayments(user) && journalsAvailable ? (
            <Link href={newCollectionHref} className="btn btn--primary btn--sm">
              {t('admin.finance.recordCollection')}
            </Link>
          ) : undefined
        }
      />

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

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        empty={<EmptyState title={t('admin.finance.noCollections')} />}
      >
        {(rows) => {
          const scopedRows = filterCollectionsForStudent(rows, studentIdFilter);
          const counts = countByState(scopedRows);
          const total = studentIdFilter ? scopedRows.length : (pg?.total ?? rows.length);
          return (
            <>
              <p className="collections-summary muted">
                {t('admin.finance.collections.summaryLine', {
                  total,
                  confirmed: counts.confirmed ?? 0,
                  draft: counts.draft ?? 0,
                  cancelled: counts.cancelled ?? 0,
                  unknown: counts.unknown ?? 0,
                })}
              </p>

              <form
                className="toolbar finance-hub-filters collections-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                  setQuery(search.trim());
                }}
              >
                <input
                  className="input collections-filters__search"
                  placeholder={t('admin.finance.searchCollections')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">{t('common.allStatuses')}</option>
                  <option value="draft">{t('admin.finance.states.draft')}</option>
                  <option value="confirmed">{t('admin.finance.states.confirmed')}</option>
                  <option value="cancelled">{t('admin.finance.states.cancelled')}</option>
                </select>
                <select className="input" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                  <option value="">{t('admin.finance.collections.allMethods')}</option>
                  <option value="cash">{t('admin.finance.methodCash')}</option>
                  <option value="cheque">{t('admin.finance.methodCheque')}</option>
                  <option value="bank_transfer">{t('admin.finance.methodBankTransfer')}</option>
                  <option value="card_terminal">{t('admin.finance.methodCardTerminal')}</option>
                  <option value="other">{t('admin.finance.methodOther')}</option>
                </select>
                <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                <button type="submit" className="btn btn--ghost btn--sm">
                  {t('admin.search')}
                </button>
                {hasFilters ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
                    {t('admin.finance.collections.resetFilters')}
                  </button>
                ) : null}
              </form>

              <DataTable
                columns={columns}
                rows={scopedRows}
                rowKey={(row) => row.id}
                onRowClick={(row) => setSelectedCollectionId(row.id)}
              />
              {pg && (
                <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
              )}
            </>
          );
        }}
      </ResourceView>

      {selectedCollectionId ? (
        <CollectionDetailDrawer
          open={!!selectedCollectionId}
          collectionId={selectedCollectionId}
          onClose={() => setSelectedCollectionId(null)}
        />
      ) : null}
    </RequireAdminPermission>
  );
}
