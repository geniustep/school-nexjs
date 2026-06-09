'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canManageFeeCatalog } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import type { FeeType } from '@/types/finance';
import type { ListParams } from '@/types/api';
import { FinanceFeeTypeForm } from '@/features/admin/finance/fee-type-form';

export default function AdminFinanceFeeTypesPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);

  const params: ListParams = {
    page,
    page_size: 20,
    search: query || undefined,
  };
  const state = useAdminResource<FeeType[]>(endpoints.admin.financeFeeTypes, params);
  const pg = state.meta?.pagination;
  const canManage = canManageFeeCatalog(user);

  const columns: Column<FeeType>[] = useMemo(
    () => [
      { key: 'name', header: t('admin.finance.feeTypeName'), render: (row) => <strong>{row.name}</strong> },
      { key: 'code', header: t('admin.finance.feeTypeCode'), render: (row) => <span className="mono">{row.code}</span> },
      {
        key: 'category',
        header: t('admin.finance.category'),
        render: (row) => row.category ?? t('common.dash'),
      },
      {
        key: 'default_amount',
        header: t('admin.finance.defaultAmount'),
        render: (row) => <FinanceMoney amount={row.default_amount} currency={row.currency} />,
      },
      {
        key: 'active',
        header: t('academic.status'),
        render: (row) => (
          <Badge tone={row.active ? 'green' : 'slate'}>
            {row.active ? t('states.active') : t('states.archived')}
          </Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.feeTypesTitle')}
        subtitle={t('admin.finance.feeTypesDesc')}
        actions={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t('common.cancel') : t('admin.finance.addFeeType')}
            </button>
          ) : undefined
        }
      />

      {showForm && canManage && (
        <FinanceFeeTypeForm
          onDone={() => {
            setShowForm(false);
            state.reload();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          className="input"
          placeholder={t('admin.finance.searchFeeTypes')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
      </form>

      <ResourceView state={state} loadingLabel={t('common.loading')} empty={<EmptyState title={t('admin.finance.noFeeTypes')} />}>
        {(rows) => (
          <>
            <DataTable columns={columns} rows={rows} onRowClick={(row) => router.push(`/admin/finance/fee-types#${row.id}`)} />
            {pg && <Pagination page={pg.page} totalPages={pg.total_pages} onPageChange={setPage} />}
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
