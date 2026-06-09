'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canCollectPayments } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { collectionState, refName } from '@/lib/utils/finance';
import type { PaymentCollection } from '@/types/finance';
import type { ListParams } from '@/types/api';

export default function AdminFinanceCollectionsPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params: ListParams = {
    page,
    page_size: 20,
    search: query || undefined,
    status: statusFilter || undefined,
    student_id: studentId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };
  const state = useAdminResource<PaymentCollection[]>(endpoints.admin.financePaymentCollections, params);
  const pg = state.meta?.pagination;

  const columns: Column<PaymentCollection>[] = useMemo(
    () => [
      {
        key: 'reference',
        header: t('admin.finance.reference'),
        render: (row) => <span className="mono">{row.reference ?? row.name ?? `#${row.id}`}</span>,
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => refName(row.student) ?? row.payer_name ?? t('common.dash'),
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) => formatDate(row.collection_date ?? row.date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.amount ?? row.total_amount} />,
      },
      {
        key: 'method',
        header: t('admin.finance.paymentMethod'),
        render: (row) => row.payment_method ?? t('common.dash'),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={collectionState(row)} />,
      },
      {
        key: 'user',
        header: t('admin.finance.recordedBy'),
        render: (row) => refName(row.created_by) ?? refName(row.user) ?? t('common.dash'),
      },
    ],
    [t, formatDate],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.collectionsTitle')}
        subtitle={t('admin.finance.collectionsDesc')}
        actions={
          canCollectPayments(user) ? (
            <Link href="/admin/finance/collections/new" className="btn btn--primary btn--sm">
              {t('admin.finance.recordCollection')}
            </Link>
          ) : undefined
        }
      />

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input className="input" placeholder={t('admin.finance.searchCollections')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <input className="input" placeholder={t('admin.finance.studentIdFilter')} value={studentId} onChange={(e) => setStudentId(e.target.value)} />
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

      <ResourceView state={state} loadingLabel={t('common.loading')} empty={<EmptyState title={t('admin.finance.noCollections')} />}>
        {(rows) => (
          <>
            <DataTable columns={columns} rows={rows} onRowClick={(row) => router.push(`/admin/finance/collections/${row.id}`)} />
            {pg && <Pagination page={pg.page} totalPages={pg.total_pages} onPageChange={setPage} />}
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
