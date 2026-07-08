'use client';

import { useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceServiceForm } from '@/features/admin/finance/finance-service-form';
import { FinanceServicePriorityBadge } from '@/features/admin/finance/finance-service-priority-badge';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import type { FinanceServiceCatalogItem } from '@/features/admin/student-finance/types';
import { resolveReferenceLabel } from '@/features/admin/student-finance/utils/reference-labels';
import { useT } from '@/features/i18n/locale-context';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { parseFinanceList } from '@/lib/utils/finance-normalize';

export function ServicesPanel({
  showForm,
  onShowFormChange,
  canManage,
}: {
  showForm: boolean;
  onShowFormChange: (show: boolean) => void;
  canManage: boolean;
}) {
  const t = useT();
  const refState = useFinanceReferenceData();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editingService, setEditingService] = useState<FinanceServiceCatalogItem | null>(null);

  const serviceParams = { page, page_size: 20, search: query || undefined };
  const servicesState = useAdminResource<FinanceServiceCatalogItem[]>(
    endpoints.admin.financeServices,
    serviceParams,
  );

  const rows = parseFinanceList(servicesState.data);
  const pg = servicesState.meta?.pagination;

  const serviceColumns: Column<FinanceServiceCatalogItem>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.finance.services.columns.name'),
        render: (row) => row.name,
      },
      {
        key: 'category',
        header: t('admin.finance.services.columns.serviceType'),
        render: (row) =>
          resolveReferenceLabel(
            t,
            'service_category',
            row.category ?? '',
            refState.data?.service_categories,
          ),
      },
      {
        key: 'allocation_priority_level',
        header: t('admin.finance.services.columns.collectionPriority'),
        render: (row) => (
          <FinanceServicePriorityBadge level={row.allocation_priority_level ?? 'normal'} />
        ),
      },
      {
        key: 'active',
        header: t('academic.status'),
        render: (row) => (
          <FinanceStatusBadge state={row.active === false ? 'inactive' : 'active'} />
        ),
      },
      ...(canManage
        ? [
            {
              key: 'actions',
              header: t('admin.finance.services.columns.actions'),
              render: (row: FinanceServiceCatalogItem) => (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setEditingService(row);
                    onShowFormChange(true);
                  }}
                >
                  {t('common.edit')}
                </button>
              ),
            } satisfies Column<FinanceServiceCatalogItem>,
          ]
        : []),
    ],
    [t, refState.data?.service_categories, canManage, onShowFormChange],
  );

  function closeForm() {
    setEditingService(null);
    onShowFormChange(false);
  }

  function onFormDone() {
    closeForm();
    servicesState.reload();
  }

  return (
    <div className="form-stack">
      {showForm && canManage ? (
        <FinanceServiceForm
          service={editingService}
          onDone={onFormDone}
          onCancel={closeForm}
        />
      ) : null}

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
        state={{ ...servicesState, data: rows.length ? rows : servicesState.data }}
        loadingLabel={t('common.loading')}
        empty={
          <EmptyState
            title={t('admin.finance.services.emptyServicesTitle')}
            description={t('admin.finance.services.emptyDesc')}
            action={
              canManage ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    setEditingService(null);
                    onShowFormChange(true);
                  }}
                >
                  {t('admin.finance.services.addService')}
                </button>
              ) : undefined
            }
          />
        }
      >
        {(list) => (
          <>
            <DataTable
              columns={serviceColumns}
              rows={list as FinanceServiceCatalogItem[]}
              rowKey={(row) => row.id}
            />
            {pg ? (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            ) : null}
          </>
        )}
      </ResourceView>
    </div>
  );
}

/** @deprecated Use ServicesPanel — kept for import compatibility during transition. */
export type ServicesTariffsTab = 'services';

/** @deprecated Use ServicesPanel — kept for import compatibility during transition. */
export function ServicesTariffsPanel({
  showForm,
  onShowFormChange,
  canManage,
}: {
  tab?: ServicesTariffsTab;
  onTabChange?: (tab: ServicesTariffsTab) => void;
  showForm: boolean;
  onShowFormChange: (show: boolean) => void;
  canManage: boolean;
}) {
  return (
    <ServicesPanel
      showForm={showForm}
      onShowFormChange={onShowFormChange}
      canManage={canManage}
    />
  );
}
