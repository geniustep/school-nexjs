'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Pagination } from '@/components/tables/data-table';
import { cn } from '@/lib/utils/cn';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import {
  applyApplicationStatusFilter,
  applyHasRequestedServicesFilter,
  applyRequestedServiceIdsFilter,
  buildAdmissionListServerQuery,
  buildAdmissionWorkspaceQuery,
  buildKanbanWorkspaceExtraQuery,
  clearRequestedServicesFilters,
  hasManualContextOrAdvancedFilters,
  parseWorkspaceListStateFromSearchParams,
  readAppliedWorkspaceFilter,
  resetLevelIfIncompatibleWithCycle,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from '../utils/admission-workspace';
import {
  filterAdmissionCyclesByLevels,
  filterLevelsByCycle,
} from '../utils/admission-options';
import { ADMISSION_KANBAN_PRESENTATION_COLUMNS } from '../utils/admission-kanban-presentation';
import {
  countHiddenConvertedAdmissionListItems,
  resolveEffectiveHideConverted,
} from '../utils/filter-admission-list-items';
import {
  ADMISSIONS_QUERIES_INVALIDATED_EVENT,
} from '../utils/admission-list-invalidate';
import {
  areAdmissionsFiltersReady,
  buildAdmissionsDashboardQuery,
} from '../utils/admission-list-ssot';
import { normalizeAdmissionListItems } from '../utils/normalize-admission-record';
import {
  normalizeAdmissionRequestedServices,
} from '../utils/admission-requested-services';
import {
  resolveAdmissionsListUrlNavigationMode,
  type AdmissionsListUrlNavTrigger,
} from '../utils/admission-url-navigation';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { AdmissionsStatusNav } from './admissions-status-nav';
import { AdmissionsServicesFilterPopover } from './admissions-services-filter-popover';
import { AdmissionsRawStateKanban } from './admissions-raw-state-kanban';
import { AdmissionsBulkActionBar } from './admissions-bulk-action-bar';
import { AdmissionsTable } from './admissions-table';
import type { AdmissionListItem, AdmissionRequestedService, AdmissionsDashboard } from '@/types/admission';
import type { ListParams } from '@/types/api';
import { useAdmissionOptions } from '../hooks/use-admission-options';
import { useAdmissionsKanbanBoard } from '../hooks/use-admissions-kanban-board';
import { useAdmissionsSelection } from '../hooks/use-admissions-selection';
import '../admissions.css';

const TABLE_PAGE_SIZE = 25;

export function AdmissionsListPage() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Defer options/services until Kanban paints first column — reduces HTTP contention
  // with the 6 parallel column list calls (measured bottleneck on school).
  const [kanbanShellReady, setKanbanShellReady] = useState(false);
  const {
    activeSchoolId,
    requiresActiveSchool,
    schools,
    switching,
  } = useAdminSession();
  const allowedSchoolIds = useMemo(() => schools.map((s) => s.id), [schools]);
  const filtersReady = areAdmissionsFiltersReady({
    switching,
    requiresActiveSchool,
    activeSchoolId,
    allowedSchoolIds,
  });

  // URL is the single source of filter truth — parse once on init (no default→fetch→hydrate).
  const [listState, setListState] = useState<AdmissionWorkspaceListState>(() =>
    parseWorkspaceListStateFromSearchParams(
      new URLSearchParams(searchParams?.toString() ?? ''),
    ),
  );
  const [searchInput, setSearchInput] = useState(listState.search ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const {
    selectedIds,
    selectedCount,
    selectionMode,
    isSelected,
    toggle,
    clear: clearSelection,
    toggleVisible,
    visibleSelectionState,
  } = useAdmissionsSelection();

  const urlSyncLock = useRef(false);
  /** Consumed by state→URL effect; defaults to replace for silent updates. */
  const urlNavTriggerRef = useRef<AdmissionsListUrlNavTrigger>('other');
  /** Last qs we wrote — skip echo hydration when Next mirrors our own navigation. */
  const lastWrittenQsRef = useRef<string | null>(null);
  /** Stable string dep — avoid hydration churn from searchParams identity. */
  const searchParamsString = searchParams?.toString() ?? '';

  // Browser back/forward → adopt URL
  useEffect(() => {
    if (lastWrittenQsRef.current === searchParamsString) {
      lastWrittenQsRef.current = null;
      return;
    }
    const fromUrl = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams(searchParamsString),
    );
    const urlQs = workspaceListStateToSearchParams(fromUrl).toString();
    setListState((prev) => {
      const localQs = workspaceListStateToSearchParams(prev).toString();
      if (urlQs === localQs) return prev;
      urlSyncLock.current = true;
      urlNavTriggerRef.current = 'url_hydration';
      return fromUrl;
    });
    setSearchInput((prev) => {
      const next = fromUrl.search ?? '';
      return prev === next ? prev : next;
    });
  }, [searchParamsString]);

  // Debounced search → state (silent replace — not a discrete History step)
  useEffect(() => {
    setListState((prev) => {
      const nextSearch = debouncedSearch.trim() || undefined;
      if ((prev.search ?? '') === (nextSearch ?? '')) return prev;
      urlNavTriggerRef.current = 'search_debounce';
      return { ...prev, search: nextSearch, page: 1 };
    });
  }, [debouncedSearch]);

  // State → URL (deps: listState only — do not re-run on searchParams identity/encoding)
  useEffect(() => {
    if (urlSyncLock.current) {
      urlSyncLock.current = false;
      urlNavTriggerRef.current = 'other';
      return;
    }
    const params = workspaceListStateToSearchParams(listState);
    const qs = params.toString();
    const current = searchParamsString;
    const trigger = urlNavTriggerRef.current;
    urlNavTriggerRef.current = 'other';
    const mode = resolveAdmissionsListUrlNavigationMode({
      trigger,
      nextQs: qs,
      currentQs: current,
    });
    if (mode === 'skip') return;
    lastWrittenQsRef.current = qs;
    const href = qs ? `${pathname}?${qs}` : pathname;
    if (mode === 'push') {
      router.push(href, { scroll: false });
      return;
    }
    router.replace(href, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParamsString read live; URL writes must not feedback-loop
  }, [listState, pathname, router]);

  const workspacePreset = useMemo(
    () => buildAdmissionWorkspaceQuery(listState),
    [listState],
  );

  const serverQuery = useMemo(
    () => buildAdmissionListServerQuery(listState),
    [listState],
  );

  const tableParams: ListParams = useMemo(
    () => ({
      ...serverQuery,
      page_size: TABLE_PAGE_SIZE,
    }),
    [serverQuery],
  );

  const view = listState.view;
  const tableEnabled = filtersReady && view === 'table';
  const kanbanEnabled =
    filtersReady && view === 'kanban' && workspacePreset.kanbanAllowed;

  // Single source of truth: never keep prior filter rows/totals while the next
  // list request is in flight (avoids KPI/list flash of wrong counts).
  const tableState = useAdminResource<AdmissionListItem[]>(
    tableEnabled ? endpoints.admin.admissions : null,
    tableParams,
    { keepPreviousData: false },
  );

  const kanbanBoard = useAdmissionsKanbanBoard({
    columns: workspacePreset.kanbanColumns,
    search: listState.search?.trim() || undefined,
    // Context only — each column sends its own application_status (Backend honors it).
    extraQuery: buildKanbanWorkspaceExtraQuery(listState),
    partitionByApplicationStatus: false,
    enabled: kanbanEnabled,
  });

  useEffect(() => {
    if (view !== 'kanban' || !kanbanEnabled) {
      setKanbanShellReady(true);
      return;
    }
    // Wait for first column paint; stay ready across soft refreshes that keep cards.
    setKanbanShellReady(!kanbanBoard.initialLoading);
  }, [view, kanbanEnabled, kanbanBoard.initialLoading]);

  const secondaryFiltersEnabled =
    filtersReady && (view !== 'kanban' || !kanbanEnabled || kanbanShellReady);

  const { options: admissionOptions } = useAdmissionOptions({
    enabled: secondaryFiltersEnabled,
  });

  const dashboardQuery = useMemo(
    () => buildAdmissionsDashboardQuery(listState),
    [listState],
  );

  const [dashboardApiEnabled, setDashboardApiEnabled] = useState(true);
  const dashboardState = useAdminResource<AdmissionsDashboard>(
    filtersReady && dashboardApiEnabled ? endpoints.admin.admissionsDashboard : null,
    dashboardQuery,
    { keepPreviousData: false },
  );

  useEffect(() => {
    if (dashboardState.error && dashboardApiEnabled) {
      setDashboardApiEnabled(false);
    }
  }, [dashboardState.error, dashboardApiEnabled]);

  const appliedWorkspace = readAppliedWorkspaceFilter(
    tableState.meta?.applied_filters as Record<string, unknown> | undefined,
  );

  useEffect(() => {
    clearSelection();
  }, [
    listState.statusFilter,
    listState.search,
    listState.cycleCode,
    listState.levelId,
    listState.requestedServiceIds,
    listState.requestedServiceId,
    listState.hasRequestedServices,
    clearSelection,
  ]);

  const servicesCatalogState = useAdminResource<{ items?: AdmissionRequestedService[] } | AdmissionRequestedService[]>(
    secondaryFiltersEnabled ? endpoints.admin.admissionsRequestedServices : null,
    {},
    { keepPreviousData: false },
  );

  const requestedServicesCatalog = useMemo(() => {
    const raw = servicesCatalogState.data;
    if (!raw) return [] as AdmissionRequestedService[];
    const items = Array.isArray(raw) ? raw : raw.items;
    return normalizeAdmissionRequestedServices(items);
  }, [servicesCatalogState.data]);

  const dashboardData = dashboardState.data ?? null;
  const tablePagination = tableState.meta?.pagination;

  const effectiveHideConverted = resolveEffectiveHideConverted({
    hideConverted: listState.hideConverted,
    workspace: listState.workspace,
    postSub: listState.postSub,
    closedSub: listState.closedSub,
    statusFilter: listState.statusFilter,
  });

  const tableRows = useMemo(() => {
    if (!tableState.data) return [];
    return normalizeAdmissionListItems(tableState.data);
  }, [tableState.data]);

  const kanbanColumns = useMemo(() => {
    return kanbanBoard.grouped;
  }, [kanbanBoard.grouped]);

  const hiddenConvertedOnPage = useMemo(() => {
    const source =
      view === 'kanban'
        ? kanbanBoard.allItems
        : normalizeAdmissionListItems(tableState.data ?? []);
    return countHiddenConvertedAdmissionListItems(source, effectiveHideConverted);
  }, [view, kanbanBoard.allItems, tableState.data, effectiveHideConverted]);

  const hasManualFilters = hasManualContextOrAdvancedFilters(listState);

  const trackOptions = useMemo(
    () =>
      filterAdmissionCyclesByLevels(
        admissionOptions?.cycles ?? [],
        admissionOptions?.levels ?? [],
      ),
    [admissionOptions?.cycles, admissionOptions?.levels],
  );

  const levelOptions = useMemo(() => {
    const allLevels = admissionOptions?.levels ?? [];
    if (!listState.cycleCode?.trim()) return allLevels;
    return filterLevelsByCycle(allLevels, listState.cycleCode);
  }, [admissionOptions?.levels, listState.cycleCode]);

  function patchListState(patch: Partial<AdmissionWorkspaceListState>) {
    setListState((prev) => ({ ...prev, ...patch }));
  }

  /** User-initiated service filter navigation — pushes a History entry. */
  function commitServiceFilterState(
    updater: (prev: AdmissionWorkspaceListState) => AdmissionWorkspaceListState,
    trigger: AdmissionsListUrlNavTrigger = 'user_service_filter',
  ) {
    urlNavTriggerRef.current = trigger;
    setListState(updater);
  }

  function clearManualFilters() {
    setSearchInput('');
    commitServiceFilterState(
      (prev) =>
        clearRequestedServicesFilters({
          ...prev,
          search: undefined,
          academicYearId: undefined,
          cycleCode: undefined,
          levelId: undefined,
          sourceId: undefined,
          stage: undefined,
          decision: undefined,
          offerState: undefined,
          registrationStatus: undefined,
          hideConverted: true,
          page: 1,
        }),
      'user_clear_filters',
    );
  }

  function handleTrackChange(nextCycleCode: string) {
    const cycleCode = nextCycleCode || undefined;
    const levels = admissionOptions?.levels ?? [];
    urlNavTriggerRef.current = 'user_academic_filter';
    setListState((prev) => ({
      ...prev,
      cycleCode,
      levelId: resetLevelIfIncompatibleWithCycle(prev.levelId, cycleCode, levels),
      page: 1,
    }));
  }

  function handleStatusSelect(status: string) {
    urlNavTriggerRef.current = 'user_status_filter';
    setListState((prev) => applyApplicationStatusFilter(prev, status));
  }

  function reloadCurrentView(options?: { reloadServicesCatalog?: boolean }) {
    if (view === 'kanban') {
      kanbanBoard.reload();
    } else {
      tableState.reload();
    }
    dashboardState.reload();
    // Status mutations do not change the services catalog — skip that round-trip.
    if (options?.reloadServicesCatalog) {
      servicesCatalogState.reload();
    }
  }

  const reloadCurrentViewRef = useRef(reloadCurrentView);
  reloadCurrentViewRef.current = reloadCurrentView;

  // After family approval / status actions, refresh list + dashboard.
  // Reload services catalog only when requested-services payloads change.
  useEffect(() => {
    const onInvalidate = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: string }>).detail;
      const reason = String(detail?.reason ?? '');
      const reloadServicesCatalog =
        reason === 'requested_services' || reason.includes('requested_service');
      reloadCurrentViewRef.current({ reloadServicesCatalog });
    };
    window.addEventListener(ADMISSIONS_QUERIES_INVALIDATED_EVENT, onInvalidate);
    return () => {
      window.removeEventListener(ADMISSIONS_QUERIES_INVALIDATED_EVENT, onInvalidate);
    };
  }, []);

  const bootstrapping = !filtersReady;

  const emptyTitle = t('admin.admissions.empty.title');
  const emptyDescription = hasManualFilters
    ? t('admin.admissions.noMatch.description')
    : t('admin.admissions.empty.description');

  const listEmptyState = (
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      action={
        hasManualFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearManualFilters}>
            {t('admin.admissions.filters.reset')}
          </button>
        ) : (
          <Link href="/admin/admissions/new" className="btn btn--primary btn--sm">
            {t('admin.admissions.createButton')}
          </Link>
        )
      }
    />
  );

  const listSettled = tableEnabled && !tableState.loading;
  const kanbanTotalSettled = kanbanEnabled && !kanbanBoard.initialLoading;
  const statusFilter = listState.statusFilter ?? '';
  const kanbanColumnsTotal = kanbanBoard.grouped.reduce(
    (sum, col) => sum + (col.total ?? 0),
    0,
  );
  // "All applications" header must use Backend dashboard total_open (same hide scope)
  // — Kanban primary columns omit registered even when shown.
  const headerTotal =
    view === 'table' && listSettled && typeof tablePagination?.total === 'number'
      ? tablePagination.total
      : view === 'kanban' && kanbanTotalSettled
        ? !statusFilter &&
            !dashboardState.loading &&
            typeof dashboardData?.total_open === 'number'
          ? dashboardData.total_open
          : statusFilter
            ? kanbanColumnsTotal
            : null
        : null;
  const hasNarrowingFilters = Boolean(
    statusFilter ||
      listState.search?.trim() ||
      listState.cycleCode ||
      listState.levelId ||
      (listState.requestedServiceIds && listState.requestedServiceIds.length > 0) ||
      listState.hasRequestedServices === 'true' ||
      listState.hasRequestedServices === 'false',
  );
  const headerTotalLabel =
    headerTotal == null
      ? null
      : headerTotal === 0
        ? t('admin.admissions.filters.resultsCountNone')
        : hasNarrowingFilters
          ? t('admin.admissions.filters.resultsCountMatching', { count: headerTotal })
          : t('admin.admissions.filters.resultsCount', { count: headerTotal });

  return (
    <div className="admissions-page admissions-list-page" data-testid="admissions-list-page">
      <header className="admissions-list-header admissions-list-header--compact">
        <div className="admissions-list-header__main">
          <h1 className="admissions-list-header__title">{t('admin.admissions.title')}</h1>
          {headerTotalLabel != null ? (
            <p
              className="admissions-list-header__count"
              data-testid="admissions-list-total"
            >
              {headerTotalLabel}
            </p>
          ) : null}
        </div>
        <div className="admissions-list-header__actions">
          <div
            className="admissions-mode-chooser"
            role="group"
            aria-label={t('admin.admissions.modeChooser.label')}
          >
            <Link
              href="/admin/admissions/new"
              className="btn btn--primary admissions-list-header__cta"
            >
              {t('admin.admissions.modeChooser.individual')}
            </Link>
            <Link
              href="/admin/admissions/family/new"
              className="btn btn--ghost admissions-list-header__cta-secondary"
            >
              {t('admin.admissions.modeChooser.family')}
            </Link>
          </div>
        </div>
      </header>

      <div className="admissions-filter-shell" data-testid="admissions-filter-shell">
        <AdmissionsStatusNav
          statusFilter={statusFilter}
          dashboard={dashboardData}
          onSelect={handleStatusSelect}
        />

        <div
          className="admissions-list-toolbar admissions-list-toolbar--compact"
          data-testid="admissions-list-toolbar"
        >
          <div className="admissions-list-toolbar__filters">
            <div className="admissions-list-toolbar__search-wrap">
              <input
                className="input admissions-list-toolbar__search"
                type="search"
                placeholder={t('admin.admissions.filters.search')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label={t('admin.admissions.filters.search')}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                dir="auto"
                data-testid="admissions-filter-search"
              />
              {searchInput ? (
                <button
                  type="button"
                  className="admissions-list-toolbar__search-clear"
                  onClick={() => {
                    setSearchInput('');
                    patchListState({ search: undefined, page: 1 });
                  }}
                  aria-label={t('admin.admissions.filters.clearSearch')}
                >
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>

            <select
              className="input admissions-list-toolbar__state"
              value={listState.cycleCode ?? ''}
              onChange={(e) => handleTrackChange(e.target.value)}
              aria-label={t('admin.admissions.filters.track')}
              data-testid="admissions-filter-track"
            >
              <option value="">{t('admin.admissions.filters.allTracks')}</option>
              {trackOptions.map((cycle) => (
                <option key={cycle.code} value={cycle.code}>
                  {cycle.name}
                </option>
              ))}
            </select>

            <select
              className="input admissions-list-toolbar__state"
              value={listState.levelId ?? ''}
              onChange={(e) => {
                urlNavTriggerRef.current = 'user_academic_filter';
                patchListState({
                  levelId: e.target.value || undefined,
                  page: 1,
                });
              }}
              aria-label={t('admin.admissions.filters.level')}
              data-testid="admissions-filter-level"
            >
              <option value="">{t('admin.admissions.filters.allLevels')}</option>
              {levelOptions.map((level) => (
                <option key={level.id} value={String(level.id)}>
                  {level.name}
                </option>
              ))}
            </select>

            <AdmissionsServicesFilterPopover
              catalog={requestedServicesCatalog}
              loading={servicesCatalogState.initialLoading}
              error={Boolean(servicesCatalogState.error)}
              value={{
                requestedServiceIds: listState.requestedServiceIds ?? [],
                withoutServices: listState.hasRequestedServices === 'false',
              }}
              onRetry={() => servicesCatalogState.reload()}
              onApply={(next) => {
                if (next.withoutServices) {
                  commitServiceFilterState(
                    (prev) => applyHasRequestedServicesFilter(prev, 'false'),
                    'user_service_filter',
                  );
                  return;
                }
                if (next.requestedServiceIds.length > 0) {
                  commitServiceFilterState(
                    (prev) => applyRequestedServiceIdsFilter(prev, next.requestedServiceIds),
                    'user_service_filter',
                  );
                  return;
                }
                commitServiceFilterState(
                  (prev) => clearRequestedServicesFilters(prev),
                  'user_service_filter',
                );
              }}
            />
          </div>

          <div className="admissions-list-toolbar__actions">
            {hasManualFilters ? (
              <button
                type="button"
                className="admissions-list-toolbar__reset"
                onClick={clearManualFilters}
              >
                {t('admin.admissions.filters.reset')}
              </button>
            ) : null}

            {statusFilter === '' ? (
              <label
                className={cn(
                  'admissions-toolbar-option admissions-list-toolbar__option',
                  listState.hideConverted && 'admissions-toolbar-option--on',
                )}
                data-testid="admissions-filter-hide-converted"
              >
                <input
                  type="checkbox"
                  className="admissions-toolbar-option__input"
                  checked={listState.hideConverted}
                  aria-checked={listState.hideConverted}
                  onChange={(e) => {
                    urlNavTriggerRef.current = 'user_hide_registered_toggle';
                    patchListState({
                      hideConverted: e.target.checked,
                      page: 1,
                    });
                  }}
                />
                <span>{t('admin.admissions.filters.hideConverted')}</span>
              </label>
            ) : null}

            <div
              className="admissions-view-toggle"
              role="group"
              aria-label={t('admin.admissions.viewMode')}
            >
              <button
                type="button"
                aria-pressed={view === 'kanban'}
                disabled={!workspacePreset.kanbanAllowed}
                data-testid="admissions-view-kanban"
                onClick={() => {
                  if (!workspacePreset.kanbanAllowed) return;
                  urlNavTriggerRef.current = 'user_view_switch';
                  patchListState({ view: 'kanban' });
                }}
              >
                {t('admin.admissions.viewKanban')}
              </button>
              <button
                type="button"
                aria-pressed={view === 'table'}
                data-testid="admissions-view-table"
                onClick={() => {
                  urlNavTriggerRef.current = 'user_view_switch';
                  patchListState({ view: 'table' });
                }}
              >
                {t('admin.admissions.viewTable')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {view === 'table' && tableState.fetching && !tableState.initialLoading ? (
        <p className="admissions-list-refetching" aria-live="polite">
          {t('admin.admissions.refetching')}
        </p>
      ) : null}

      {selectedCount > 0 ? (
        <AdmissionsBulkActionBar
          selectedItems={
            view === 'kanban'
              ? kanbanColumns.flatMap((col) => col.items).filter((item) => isSelected(item.id))
              : tableRows.filter((item) => isSelected(item.id))
          }
          onClearSelection={clearSelection}
          onUpdated={reloadCurrentView}
          visibleCount={view === 'kanban' ? undefined : tableRows.length}
          onSelectVisible={
            view === 'table'
              ? () => toggleVisible(tableRows.map((r) => r.id))
              : () =>
                  toggleVisible(
                    kanbanColumns.flatMap((col) => col.items).map((item) => item.id),
                  )
          }
        />
      ) : null}

      {view === 'kanban' && workspacePreset.kanbanAllowed ? (
        !filtersReady || kanbanBoard.initialLoading ? (
          <div
            className="admissions-kanban-skeleton"
            data-testid="admissions-kanban-skeleton"
            aria-busy="true"
            aria-label={t('common.loading')}
          >
            {(workspacePreset.kanbanColumns.length
              ? workspacePreset.kanbanColumns
              : ADMISSION_KANBAN_PRESENTATION_COLUMNS.map((col) => col.id)
            ).map((state) => (
              <div key={state} className="admissions-kanban-skeleton__column" />
            ))}
          </div>
        ) : kanbanBoard.error ? (
          <div className="alert alert--error">{kanbanBoard.error.message}</div>
        ) : (
          <AdmissionsRawStateKanban
            columns={kanbanColumns}
            allowDrag
            onUpdated={reloadCurrentView}
            onLoadMore={(state) => kanbanBoard.loadMore(state)}
            selectionMode={selectionMode}
            isSelected={isSelected}
            onToggleSelect={toggle}
          />
        )
      ) : (
        <div
          className={cn(
            'admissions-table-wrap',
            'admissions-list-results',
            (bootstrapping || tableState.initialLoading) && 'admissions-table-wrap--loading',
            tableState.fetching && 'admissions-list-results--fetching',
          )}
          aria-busy={bootstrapping || tableState.loading || undefined}
          data-testid="admissions-table-results"
        >
          {bootstrapping ? (
            <div
              className="admissions-list-boot-skeleton"
              data-testid="admissions-list-boot-skeleton"
              aria-busy="true"
            />
          ) : (
            <ResourceView
              state={tableState}
              empty={listEmptyState}
              isEmpty={() => tableRows.length === 0}
            >
              {() => (
                <>
                  <AdmissionsTable
                    items={tableRows}
                    onUpdated={reloadCurrentView}
                    selectionMode={selectionMode}
                    isSelected={isSelected}
                    onToggleSelect={toggle}
                    onToggleVisible={() => toggleVisible(tableRows.map((r) => r.id))}
                    visibleSelectionState={visibleSelectionState(
                      tableRows.map((r) => r.id),
                    )}
                  />
                  {tablePagination && tablePagination.total_pages > 1 ? (
                    <Pagination
                      page={tablePagination.page}
                      totalPages={tablePagination.total_pages}
                      pageSize={tablePagination.page_size}
                      total={tablePagination.total}
                      onPage={(page) => patchListState({ page })}
                    />
                  ) : null}
                  {effectiveHideConverted && hiddenConvertedOnPage > 0 ? (
                    <p
                      className="admissions-list-footer__stat admissions-list-footer__stat--muted"
                      data-testid="admissions-hidden-converted-count"
                    >
                      {t('admin.admissions.filters.hiddenConvertedCount', {
                        count: hiddenConvertedOnPage,
                      })}
                    </p>
                  ) : null}
                </>
              )}
            </ResourceView>
          )}
        </div>
      )}

      {/* Contract marker for tests — no client post-pagination filter */}
      <span
        hidden
        data-testid="admissions-query-contract"
        data-server-expressible={String(workspacePreset.serverExpressible)}
        data-workspace={listState.workspace}
        data-status-filter={statusFilter}
        data-applied-workspace={appliedWorkspace ?? ''}
        data-query={JSON.stringify(serverQuery)}
      />
    </div>
  );
}
