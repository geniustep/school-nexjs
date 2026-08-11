'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Fee Plans list/workspace chrome only.
 * Assign wizard and detail lifecycle workflows remain outside adopted scope.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
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
import {
  feePlansListUsesClientFilter,
  filterFeePlansWorkspaceRows,
  paginateFeePlansClient,
} from './fee-plans-list-filters';
import {
  FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE,
  FEE_PLANS_LIST_PAGE_SIZE,
  feePlansListHasActiveQuery,
  resolveFeePlansListEmptyVariant,
  resolveFeePlansResultContext,
} from './fee-plans-list-present';
import '@/features/admin/finance/finance-ui.css';
import './fee-plans-workspace.css';

const EMPTY_FILTERS: FeePlanFiltersState = {
  search: '',
  // Academic Year is global header context; this legacy field stays empty so
  // existing client-filter utilities keep their stable shape without exposing
  // a second year selector in the page.
  yearId: '',
  cycleId: '',
  levelId: '',
  stateFilter: '',
};

const STATE_LABEL_KEYS: Record<string, string> = {
  draft: 'admin.finance.states.draft',
  confirmed: 'admin.finance.states.confirmed',
  archived: 'admin.finance.states.archived',
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

  const clientFilterActive = feePlansListUsesClientFilter(query);

  const params: ListParams = useMemo(
    () => ({
      page: clientFilterActive ? 1 : page,
      page_size: clientFilterActive ? FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE : FEE_PLANS_LIST_PAGE_SIZE,
      state: query.stateFilter || undefined,
      level_id: query.levelId || undefined,
    }),
    [clientFilterActive, page, query.stateFilter, query.levelId],
  );

  const state = useGlobalAcademicYearResource<FeePlan[]>(endpoints.admin.financeFeePlans, params);
  const pg = state.meta?.pagination;
  const isRefetching = state.fetching && !state.initialLoading;

  const hasActiveQuery = feePlansListHasActiveQuery(query);
  const emptyVariant = resolveFeePlansListEmptyVariant({ hasActiveQuery });
  const draftHasFilters = feePlansListHasActiveQuery(filters);

  const levelLabel = useMemo(() => {
    if (!query.levelId) return null;
    for (const group of scopeGroups) {
      const level = group.levels.find((item) => String(item.schoolLevelId) === query.levelId);
      if (level) return level.name;
    }
    return query.levelId;
  }, [query.levelId, scopeGroups]);

  const cycleLabel = useMemo(() => {
    if (!query.cycleId) return null;
    return (
      scopeGroups.find((group) => String(group.cycle.id) === query.cycleId)?.cycle.name ??
      query.cycleId
    );
  }, [query.cycleId, scopeGroups]);

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

  function applyStateFilter(stateFilter: string) {
    const next = { ...filters, stateFilter };
    setFilters(next);
    setPage(1);
    setQuery(next);
  }

  function clearQueryField(field: keyof FeePlanFiltersState) {
    const next = { ...query, [field]: '' };
    setFilters(next);
    setQuery(next);
    setPage(1);
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="fee-plans-workspace">
        <Link href="/admin/finance" className="back-link fee-plans-workspace__back">
          ‹ {t('admin.finance.backToFinance')}
        </Link>

        <FeePlansHeader
          canManage={canManage}
          canManageCatalog={canViewCatalog}
          onAdd={openCreateDrawer}
          onManageCatalog={() => setCatalogOpen(true)}
        />
        <FeePlansMetrics
          activeStateFilter={query.stateFilter}
          onStateFilterChange={applyStateFilter}
        />

        <FeePlansFilters
          filters={filters}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onSearch={() => {
            setPage(1);
            setFilters((current) => {
              setQuery(current);
              return current;
            });
          }}
          onSearchSubmit={(next) => {
            setFilters(next);
            setPage(1);
            setQuery(next);
          }}
          onClear={clearFilters}
          hasActiveFilters={draftHasFilters}
        />

        {hasActiveQuery ? (
          <div
            className="fee-plans-workspace__chips"
            aria-label={t('admin.finance.feePlansWorkspace.activeFilters')}
          >
            {query.search.trim() ? (
              <span className="fee-plans-workspace__chip">
                <span dir="auto">{query.search.trim()}</span>
                <button
                  type="button"
                  className="fee-plans-workspace__chip-clear"
                  aria-label={t('common.clear')}
                  onClick={() => clearQueryField('search')}
                >
                  ×
                </button>
              </span>
            ) : null}
            {cycleLabel ? (
              <span className="fee-plans-workspace__chip">
                <span dir="auto">{cycleLabel}</span>
                <button
                  type="button"
                  className="fee-plans-workspace__chip-clear"
                  aria-label={t('common.clear')}
                  onClick={() => clearQueryField('cycleId')}
                >
                  ×
                </button>
              </span>
            ) : null}
            {levelLabel ? (
              <span className="fee-plans-workspace__chip">
                <span dir="auto">{levelLabel}</span>
                <button
                  type="button"
                  className="fee-plans-workspace__chip-clear"
                  aria-label={t('common.clear')}
                  onClick={() => clearQueryField('levelId')}
                >
                  ×
                </button>
              </span>
            ) : null}
            {query.stateFilter ? (
              <span className="fee-plans-workspace__chip">
                {t(STATE_LABEL_KEYS[query.stateFilter] ?? 'academic.status')}
                <button
                  type="button"
                  className="fee-plans-workspace__chip-clear"
                  aria-label={t('common.clear')}
                  onClick={() => clearQueryField('stateFilter')}
                >
                  ×
                </button>
              </span>
            ) : null}
          </div>
        ) : null}

        {isRefetching ? (
          <p className="fee-plans-workspace__fetching" aria-live="polite">
            {t('admin.finance.feePlansWorkspace.refetching')}
          </p>
        ) : null}

        <div
          className={
            isRefetching
              ? 'card fee-plans-workspace__panel fee-plans-workspace__panel--fetching'
              : 'card fee-plans-workspace__panel'
          }
          aria-busy={isRefetching || undefined}
        >
          <ResourceView
            state={state}
            loadingLabel={t('common.loading')}
            isEmpty={(rows) => {
              if (isRefetching) return false;
              if (!rows.length) return true;
              const filtered = filterFeePlansWorkspaceRows(
                normalizeFeePlans(rows),
                query,
                scopeGroups,
              );
              return filtered.length === 0;
            }}
            empty={
              emptyVariant === 'no-match' ? (
                <FeePlanEmptyState variant="no-match" onClearFilters={clearFilters} />
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
              const filteredRows = filterFeePlansWorkspaceRows(normalized, query, scopeGroups);
              const { rows: visibleRows, pagination: clientPagination } = clientFilterActive
                ? paginateFeePlansClient(filteredRows, page)
                : { rows: filteredRows, pagination: undefined };
              const pagination = clientPagination
                ?? (pg
                  ? { page: pg.page, total_pages: pg.total_pages, total: pg.total }
                  : undefined);
              const resultContext = resolveFeePlansResultContext({
                filters: query,
                filteredTotal: filteredRows.length,
                serverTotal: pg?.total ?? null,
              });
              return (
                <>
                  <div className="fee-plans-workspace__result-context">
                    <p className="fee-plans-workspace__result-count" dir="ltr">
                      {t('admin.finance.feePlansWorkspace.resultCount', {
                        total: resultContext.total,
                      })}
                    </p>
                    {resultContext.clientWindowActive ? (
                      <p className="fee-plans-workspace__result-hint muted">
                        {t('admin.finance.feePlansWorkspace.clientWindowHint', {
                          limit: resultContext.clientWindowLimit,
                        })}
                      </p>
                    ) : null}
                  </div>
                  <FeePlansList
                    rows={visibleRows}
                    pagination={pagination}
                    canManage={canManage}
                    scopeGroups={scopeGroups}
                    onPage={setPage}
                    onView={(plan) => router.push(`/admin/finance/fee-plans/${plan.id}`)}
                    onEdit={openEditDrawer}
                    onReload={() => state.reload()}
                  />
                </>
              );
            }}
          </ResourceView>
        </div>

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
      </div>
    </RequireAdminPermission>
  );
}
