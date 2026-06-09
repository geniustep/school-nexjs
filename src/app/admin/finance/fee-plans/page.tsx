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
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canManageFeePlans } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { feePlanState, refName } from '@/lib/utils/finance';
import { academicYearFromSource } from '@/lib/utils/academic-years';
import type { FeePlan } from '@/types/finance';
import type { ListParams } from '@/types/api';
import { FinanceFeePlanForm } from '@/features/admin/finance/fee-plan-form';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';

export default function AdminFinanceFeePlansPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState('');
  const [yearId, setYearId] = useState('');
  const [showForm, setShowForm] = useState(false);

  const params: ListParams = {
    page,
    page_size: 20,
    state: stateFilter || undefined,
    academic_year_id: yearId || undefined,
  };
  const state = useAdminResource<FeePlan[]>(endpoints.admin.financeFeePlans, params);
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(null);
  const pg = state.meta?.pagination;
  const canManage = canManageFeePlans(user);

  const columns: Column<FeePlan>[] = useMemo(
    () => [
      { key: 'name', header: t('admin.finance.planName'), render: (row) => <strong>{row.name}</strong> },
      { key: 'code', header: t('admin.finance.feeTypeCode'), render: (row) => <span className="mono">{row.code}</span> },
      {
        key: 'academic_year',
        header: t('admin.finance.academicYear'),
        render: (row) =>
          academicYearFromSource(row)?.name ??
          refName(typeof row.academic_year === 'object' ? row.academic_year : null) ??
          (typeof row.academic_year === 'string' ? row.academic_year : t('common.dash')),
      },
      {
        key: 'total',
        header: t('admin.finance.totalAmount'),
        render: (row) => <FinanceMoney amount={row.total_amount} currency={row.currency} />,
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={feePlanState(row)} />,
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
        title={t('admin.finance.feePlansTitle')}
        subtitle={t('admin.finance.feePlansDesc')}
        actions={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t('common.cancel') : t('admin.finance.addFeePlan')}
            </button>
          ) : undefined
        }
      />

      {showForm && canManage && (
        <FinanceFeePlanForm
          onDone={(id) => {
            setShowForm(false);
            state.reload();
            router.push(`/admin/finance/fee-plans/${id}`);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="toolbar">
        <select
          className="input"
          value={yearId}
          onChange={(e) => {
            setYearId(e.target.value);
            setPage(1);
          }}
          disabled={yearsLoading}
        >
          <option value="">{t('admin.finance.allAcademicYears')}</option>
          {yearOptions.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="draft">{t('admin.finance.states.draft')}</option>
          <option value="confirmed">{t('admin.finance.states.confirmed')}</option>
        </select>
      </div>

      <ResourceView state={state} loadingLabel={t('common.loading')} empty={<EmptyState title={t('admin.finance.noFeePlans')} />}>
        {(rows) => (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(`/admin/finance/fee-plans/${row.id}`)}
            />
            {pg && <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />}
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
