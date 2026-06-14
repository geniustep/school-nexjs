'use client';

import { useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import type { FinanceServiceCatalogItem, FinanceServiceTariff } from '@/features/admin/student-finance/types';
import { resolveReferenceLabel } from '@/features/admin/student-finance/utils/reference-labels';
import { useT } from '@/features/i18n/locale-context';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { refName } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';

type Tab = 'services' | 'tariffs';

export function ServicesTariffsPanel() {
  const t = useT();
  const refState = useFinanceReferenceData();
  const [tab, setTab] = useState<Tab>('services');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const serviceParams = { page, page_size: 20, search: query || undefined };
  const servicesState = useAdminResource<FinanceServiceCatalogItem[]>(
    tab === 'services' ? endpoints.admin.financeServices : null,
    serviceParams,
  );
  const tariffsState = useAdminResource<FinanceServiceTariff[]>(
    tab === 'tariffs' ? endpoints.admin.financeServiceTariffs : null,
    serviceParams,
  );

  const activeState = tab === 'services' ? servicesState : tariffsState;
  const rows = parseFinanceList(activeState.data);
  const pg = activeState.meta?.pagination;

  const serviceColumns: Column<FinanceServiceCatalogItem>[] = useMemo(
    () => [
      {
        key: 'code',
        header: t('admin.finance.services.columns.code'),
        render: (row) => <span className="mono">{row.code ?? t('common.dash')}</span>,
      },
      {
        key: 'name',
        header: t('admin.finance.services.columns.name'),
        render: (row) => row.name,
      },
      {
        key: 'category',
        header: t('admin.finance.services.columns.category'),
        render: (row) =>
          resolveReferenceLabel(
            t,
            'service_category',
            row.category ?? '',
            refState.data?.service_categories,
          ),
      },
      {
        key: 'requires_subscription',
        header: t('admin.finance.services.columns.requiresSubscription'),
        render: (row) => (row.requires_subscription ? t('common.yes') : t('common.no')),
      },
      {
        key: 'requires_usage_tracking',
        header: t('admin.finance.services.columns.requiresUsageTracking'),
        render: (row) =>
          row.requires_usage_tracking ? t('common.yes') : t('common.no'),
      },
      {
        key: 'active',
        header: t('academic.status'),
        render: (row) => (
          <FinanceStatusBadge state={row.active === false ? 'inactive' : 'active'} />
        ),
      },
    ],
    [t, refState.data?.service_categories],
  );

  const tariffColumns: Column<FinanceServiceTariff>[] = useMemo(
    () => [
      {
        key: 'service',
        header: t('admin.finance.services.columns.service'),
        render: (row) => refName(row.service as { id: number; name: string }) ?? row.name ?? t('common.dash'),
      },
      {
        key: 'academic_year',
        header: t('admin.finance.services.columns.academicYear'),
        render: (row) =>
          refName((row as FinanceServiceTariff & { academic_year?: { id: number; name: string } }).academic_year) ??
          t('common.dash'),
      },
      {
        key: 'commitment_type',
        header: t('admin.finance.services.columns.commitmentType'),
        render: (row) =>
          resolveReferenceLabel(
            t,
            'commitment_type',
            row.commitment_type ?? '',
            refState.data?.commitment_types,
          ),
      },
      {
        key: 'pricing_unit',
        header: t('admin.finance.services.columns.pricingUnit'),
        render: (row) =>
          resolveReferenceLabel(t, 'pricing_unit', row.pricing_unit ?? '', refState.data?.pricing_units),
      },
      {
        key: 'unit_price',
        header: t('admin.finance.services.columns.unitPrice'),
        render: (row) => <FinanceMoney amount={row.unit_price} currency={row.currency?.name} />,
      },
      {
        key: 'active',
        header: t('academic.status'),
        render: (row) => (
          <FinanceStatusBadge state={row.active === false ? 'inactive' : 'active'} />
        ),
      },
    ],
    [t, refState.data?.commitment_types, refState.data?.pricing_units],
  );

  return (
    <div className="form-stack">
      <div className="finance-hub-tabs">
        <button
          type="button"
          className={`btn btn--ghost btn--sm${tab === 'services' ? ' is-active' : ''}`}
          onClick={() => {
            setTab('services');
            setPage(1);
          }}
        >
          {t('admin.finance.services.tabs.services')}
        </button>
        <button
          type="button"
          className={`btn btn--ghost btn--sm${tab === 'tariffs' ? ' is-active' : ''}`}
          onClick={() => {
            setTab('tariffs');
            setPage(1);
          }}
        >
          {t('admin.finance.services.tabs.tariffs')}
        </button>
      </div>

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
          placeholder={t('admin.finance.services.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
      </form>

      <ResourceView
        state={{ ...activeState, data: rows.length ? rows : activeState.data }}
        loadingLabel={t('common.loading')}
        empty={
          <EmptyState
            title={
              tab === 'services'
                ? t('admin.finance.services.emptyServicesTitle')
                : t('admin.finance.services.emptyTariffsTitle')
            }
            description={t('admin.finance.services.emptyDesc')}
          />
        }
      >
        {(list) => (
          <>
            {tab === 'services' ? (
              <DataTable
                columns={serviceColumns}
                rows={list as FinanceServiceCatalogItem[]}
                rowKey={(row) => row.id}
              />
            ) : (
              <DataTable
                columns={tariffColumns}
                rows={list as FinanceServiceTariff[]}
                rowKey={(row) => row.id}
              />
            )}
            {pg && (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            )}
          </>
        )}
      </ResourceView>
    </div>
  );
}
