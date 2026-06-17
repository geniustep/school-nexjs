'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  FINANCE_VIEW,
  canManageFeeCatalog,
  canManageFeePlans,
} from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import type { FeePlan } from '@/types/finance';
import type { ListParams } from '@/types/api';
import { FeeTypesCatalogDrawer } from '@/features/admin/finance/fee-types/fee-types-catalog-drawer';
import { FeePlanDrawer } from './fee-plan-drawer';
import { FeePlanEmptyState } from './fee-plan-empty-state';
import { FeePlansFilters, type FeePlanFiltersState } from './fee-plans-filters';
import { FeePlansHeader } from './fee-plans-header';
import { FeePlansList } from './fee-plans-list';
import { FeePlansMetrics } from './fee-plans-metrics';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { buildFeePlanScopeGroups } from './fee-plan-level-scope';
import type { FeePlanDrawerMode } from './fee-plan-types';
import { normalizeFeePlans } from './normalize-fee-plan';
import { feePlanState } from '@/lib/utils/finance';
import '@/features/admin/finance/finance-ui.css';

const EMPTY_FILTERS: FeePlanFiltersState = {
  search: '',
  yearId: '',
  levelId: '',
  stateFilter: '',
};

export function FeePlansPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canManage = canManageFeePlans(user);
  const canManageCatalog = canManageFeeCatalog(user);
  const canViewCatalog = canManageCatalog || canManage;

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FeePlanFiltersState>(EMPTY_FILTERS);
  const [query, setQuery] = useState<FeePlanFiltersState>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<FeePlanDrawerMode>('create');
  const [editPlanId, setEditPlanId] = useState<number | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const scopeGroups = useMemo(
    () => buildFeePlanScopeGroups(levelOptionsState.options),
    [levelOptionsState.options],
  );

  useEffect(() => {
    if (searchParams.get('catalog') === 'open') {
      setCatalogOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('catalog');
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/fee-plans?${qs}` : '/admin/finance/fee-plans', {
        scroll: false,
      });
    }
  }, [searchParams, router]);

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: 20,
      search: query.search || undefined,
      state: query.stateFilter || undefined,
      academic_year_id: query.yearId || undefined,
      level_id: query.levelId || undefined,
    }),
    [page, query],
  );

  const state = useAdminResource<FeePlan[]>(endpoints.admin.financeFeePlans, params);
  const pg = state.meta?.pagination;

  const hasActiveFilters = Boolean(
    query.search || query.yearId || query.levelId || query.stateFilter,
  );

  function openCreateDrawer() {
    setDrawerMode('create');
    setEditPlanId(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(plan: FeePlan) {
    setDrawerMode('edit');
    setEditPlanId(plan.id);
    setDrawerOpen(true);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setQuery(EMPTY_FILTERS);
    setPage(1);
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>

      <FeePlansHeader
        canManage={canManage}
        canManageCatalog={canViewCatalog}
        onAdd={openCreateDrawer}
        onManageCatalog={() => setCatalogOpen(true)}
      />
      <FeePlansMetrics />

      <FeePlansFilters
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onSearch={() => {
          setPage(1);
          setQuery({ ...filters });
        }}
        onSearchSubmit={(next) => {
          setFilters(next);
          setPage(1);
          setQuery(next);
        }}
        onClear={clearFilters}
        hasActiveFilters={
          Boolean(filters.search || filters.yearId || filters.levelId || filters.stateFilter)
        }
      />

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(rows) => rows.length === 0}
        empty={
          hasActiveFilters ? (
            <FeePlanEmptyState variant="filtered" onClearFilters={clearFilters} />
          ) : (
            <FeePlanEmptyState
              variant="no-data"
              onAdd={canManage ? openCreateDrawer : undefined}
            />
          )
        }
      >
        {(rows) => {
          const normalized = normalizeFeePlans(rows);
          const visibleRows = query.stateFilter
            ? normalized
            : normalized.filter((plan) => feePlanState(plan) !== 'archived');
          return (
          <FeePlansList
            rows={visibleRows}
            pagination={pg ? { page: pg.page, total_pages: pg.total_pages, total: pg.total } : undefined}
            canManage={canManage}
            scopeGroups={scopeGroups}
            onPage={setPage}
            onView={(plan) => router.push(`/admin/finance/fee-plans/${plan.id}`)}
            onEdit={openEditDrawer}
            onReload={() => state.reload()}
          />
          );
        }}
      </ResourceView>

      {canManage && (
        <FeePlanDrawer
          open={drawerOpen}
          mode={drawerMode}
          planId={editPlanId}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => state.reload()}
          onOpenCatalog={() => setCatalogOpen(true)}
        />
      )}

      {canViewCatalog ? (
        <FeeTypesCatalogDrawer
          open={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          onChanged={() => state.reload()}
        />
      ) : null}
    </RequireAdminPermission>
  );
}
