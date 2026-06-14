'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { CollectionDetailDrawer } from '@/features/admin/finance/collection-detail-drawer';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, FINANCE_VIEW_PAYMENTS, canCollectPayments } from '@/lib/permissions/finance';
import { useFinanceJournalsAvailable } from '@/features/admin/finance/use-finance-lookups';
import { useSession } from '@/features/auth/session-context';
import { collectionState, paymentMethodLabel, refName } from '@/lib/utils/finance';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { isCollectionChequeReversed } from '@/lib/utils/cheque';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { PaymentCollection } from '@/types/finance';
import type { ListParams } from '@/types/api';

export default function AdminFinanceCollectionsPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const studentIdFilter = searchParams.get('student_id') ?? searchParams.get('studentId') ?? '';
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/collections');
  const { formatDate } = useFormat();
  const { available: journalsAvailable } = useFinanceJournalsAvailable();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const params: ListParams = {
    page,
    page_size: 20,
    search: query || undefined,
    status: statusFilter || undefined,
    state: statusFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    student_id: studentIdFilter || undefined,
  };
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
        key: 'reference',
        header: t('admin.finance.collections.columns.reference'),
        render: (row) => <span className="mono">{row.reference ?? row.name ?? `#${row.id}`}</span>,
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) => formatDate(row.collection_date ?? row.date) || t('common.dash'),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => {
          const sid = row.student_id ?? row.student?.id;
          const label = refName(row.student) ?? row.payer_name ?? t('common.dash');
          if (!sid) return label;
          return (
            <Link
              href={buildStudentFinanceLink(sid, 'finance', returnTo)}
              onClick={(e) => e.stopPropagation()}
            >
              {label}
            </Link>
          );
        },
      },
      {
        key: 'payer',
        header: t('admin.finance.collections.columns.payer'),
        render: (row) => row.payer_name ?? refName(row.billing_partner) ?? t('common.dash'),
      },
      {
        key: 'method',
        header: t('admin.finance.paymentMethod'),
        render: (row) => paymentMethodLabel(row.payment_method, t),
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.amount ?? row.total_amount} />,
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) =>
          isCollectionChequeReversed(row) ? (
            <ChequePaymentMarker collection={row} />
          ) : (
            <FinanceStatusBadge state={collectionState(row)} />
          ),
      },
      {
        key: 'allocations',
        header: t('admin.finance.collections.columns.allocations'),
        render: (row) => row.allocations?.length ?? t('common.dash'),
      },
    ],
    [t, formatDate, returnTo],
  );

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

      {studentIdFilter ? (
        <p className="muted">
          {t('admin.finance.collections.filteredByStudent', { id: studentIdFilter })}{' '}
          <Link href="/admin/finance/collections">{t('admin.finance.collections.clearStudentFilter')}</Link>
        </p>
      ) : null}

      <form
        className="toolbar finance-hub-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          className="input"
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
        <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
      </form>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        empty={<EmptyState title={t('admin.finance.noCollections')} />}
      >
        {(rows) => (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedCollectionId(row.id)}
            />
            {pg && (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            )}
          </>
        )}
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
