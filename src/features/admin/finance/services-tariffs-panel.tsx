'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Services catalog list/workspace chrome.
 * Deprecated ServicesTariffsPanel below remains a compatibility shim only.
 */

import { useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
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
import {
  SERVICES_PAGE_SIZE,
  resolveServiceListDefaultAmount,
  resolveServicesListEmptyVariant,
  servicesListHasActiveQuery,
} from '@/features/admin/finance/utils/services-list-present';
import '@/features/admin/finance/services-list.css';

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

  const serviceParams = { page, page_size: SERVICES_PAGE_SIZE, search: query || undefined };
  const servicesState = useAdminResource<FinanceServiceCatalogItem[]>(
    endpoints.admin.financeServices,
    serviceParams,
  );

  const rows = parseFinanceList<FinanceServiceCatalogItem>(servicesState.data);
  const pg = servicesState.meta?.pagination;
  const isRefetching = servicesState.fetching && !servicesState.initialLoading;
  const hasActiveQuery = servicesListHasActiveQuery({ search: query });
  const emptyVariant = resolveServicesListEmptyVariant({ hasActiveQuery });

  const serviceColumns: Column<FinanceServiceCatalogItem>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.finance.services.columns.name'),
        render: (row) => (
          <div className="finance-services-list__name">
            <span dir="auto">{row.name}</span>
            {row.code ? (
              <span className="finance-services-list__code mono" dir="ltr">
                {row.code}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'category',
        header: t('admin.finance.services.columns.serviceType'),
        render: (row) => (
          <span dir="auto">
            {resolveReferenceLabel(
              t,
              'service_category',
              row.category ?? '',
              refState.data?.service_categories,
            )}
          </span>
        ),
      },
      {
        key: 'default_amount',
        header: t('admin.finance.services.columns.unitPrice'),
        render: (row) => {
          const amount = resolveServiceListDefaultAmount(row.default_amount);
          if (amount == null) return t('common.dash');
          return <FinanceMoney amount={amount} currency={row.currency} />;
        },
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

  function clearSearch() {
    setSearch('');
    setQuery('');
    setPage(1);
  }

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        title={t('admin.finance.services.noMatch.title')}
        description={t('admin.finance.services.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearSearch}>
            {t('common.clear')}
          </button>
        }
      />
    ) : (
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
    );

  return (
    <div className="finance-services-list form-stack">
      {showForm && canManage ? (
        <FinanceServiceForm
          service={editingService}
          onDone={onFormDone}
          onCancel={closeForm}
        />
      ) : null}

      <form
        className="toolbar finance-services-list__toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <div className="finance-services-list__search">
          <input
            className="input"
            placeholder={t('admin.finance.services.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="auto"
            aria-label={t('admin.search')}
          />
          {search ? (
            <button
              type="button"
              className="finance-services-list__search-clear"
              aria-label={t('common.clear')}
              onClick={clearSearch}
            >
              ×
            </button>
          ) : null}
        </div>
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearSearch}>
            {t('common.clear')}
          </button>
        ) : null}
      </form>

      {pg?.total != null ? (
        <p className="finance-services-list__result-count" dir="ltr">
          {t('admin.finance.services.resultCount', { total: pg.total })}
        </p>
      ) : null}

      {isRefetching ? (
        <p className="finance-services-list__fetching" aria-live="polite">
          {t('admin.finance.services.refetching')}
        </p>
      ) : null}

      <div
        className={
          isRefetching
            ? 'finance-services-list__results finance-services-list__results--fetching'
            : 'finance-services-list__results'
        }
        aria-busy={isRefetching || undefined}
      >
        <ResourceView
          state={{ ...servicesState, data: rows }}
          loadingLabel={t('common.loading')}
          isEmpty={(list) => {
            if (isRefetching) return false;
            return list.length === 0;
          }}
          empty={listEmptyState}
        >
          {(list) => (
            <>
              <div className="finance-services-list__table-wrap">
                <DataTable
                  columns={serviceColumns}
                  rows={list}
                  rowKey={(row) => row.id}
                />
              </div>
              {pg ? (
                <Pagination
                  page={pg.page}
                  pageSize={pg.page_size ?? SERVICES_PAGE_SIZE}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  onPage={setPage}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      </div>
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
