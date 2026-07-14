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
import { InfoBanner } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { AdmissionListItem, AdmissionsDashboard } from '@/types/admission';
import type { ListParams } from '@/types/api';
import { useAdmissionOptions } from '../hooks/use-admission-options';
import { useAdmissionsKanbanBoard } from '../hooks/use-admissions-kanban-board';
import { useAdmissionsSelection } from '../hooks/use-admissions-selection';
import { AdmissionsDashboardSummary, AdmissionsDashboardSkeleton } from './admissions-dashboard-summary';
import { AdmissionsRawStateKanban } from './admissions-raw-state-kanban';
import { AdmissionsTable } from './admissions-table';
import {
  ADMISSION_WORKSPACES,
  FOLLOW_UP_WORKSPACE_STATES,
  applyOperationalCard,
  applyWorkspaceChange,
  buildAdmissionListServerQuery,
  buildAdmissionWorkspaceQuery,
  buildKanbanWorkspaceExtraQuery,
  hasManualContextOrAdvancedFilters,
  parseWorkspaceListStateFromSearchParams,
  readAppliedWorkspaceFilter,
  resetLevelIfIncompatibleWithCycle,
  resolveActiveOperationalCard,
  workspaceListStateToSearchParams,
  ADMISSION_WORKSPACE_COUNT_KEYS,
  type AdmissionWorkspace,
  type AdmissionWorkspaceListState,
  type ClosedSubfilter,
  type FollowUpWorkspaceState,
  type PostAcceptanceSubfilter,
  type AwaitingDecisionSubfilter,
} from '../utils/admission-workspace';
import {
  filterAdmissionCyclesByLevels,
  filterLevelsByCycle,
} from '../utils/admission-options';
import {
  buildAdmissionSourceFilterOptions,
  resolveSourceFilterSelectValue,
  sourceFilterChipLabel,
} from '../utils/admission-source-filter';
import { ADMISSION_KANBAN_PRESENTATION_COLUMNS } from '../utils/admission-kanban-presentation';
import {
  countHiddenConvertedAdmissionListItems,
  resolveEffectiveHideConverted,
} from '../utils/filter-admission-list-items';
import {
  ADMISSIONS_OPERATIONAL_CARDS,
  resolveTrustedActiveListTotal,
  type AdmissionsOperationalCardId,
} from '../utils/admissions-dashboard-cards';
import {
  ADMISSIONS_QUERIES_INVALIDATED_EVENT,
} from '../utils/admission-list-invalidate';
import {
  areAdmissionsFiltersReady,
  buildAdmissionsDashboardQuery,
} from '../utils/admission-list-ssot';
import { normalizeAdmissionListItems } from '../utils/normalize-admission-record';
import { useAdminSession } from '@/features/auth/admin-session-context';
import '../admissions.css';

const TABLE_PAGE_SIZE = 25;

export function AdmissionsListPage() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { options: admissionOptions } = useAdmissionOptions();
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
    setSelectedIds,
  } = useAdmissionsSelection();

  const urlSyncLock = useRef(false);

  // Browser back/forward → adopt URL
  useEffect(() => {
    const fromUrl = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams(searchParams?.toString() ?? ''),
    );
    const urlQs = workspaceListStateToSearchParams(fromUrl).toString();
    const localQs = workspaceListStateToSearchParams(listState).toString();
    if (urlQs === localQs) return;
    urlSyncLock.current = true;
    setListState(fromUrl);
    setSearchInput(fromUrl.search ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to URL changes
  }, [searchParams]);

  // Debounced search → state
  useEffect(() => {
    setListState((prev) => {
      const nextSearch = debouncedSearch.trim() || undefined;
      if ((prev.search ?? '') === (nextSearch ?? '')) return prev;
      return { ...prev, search: nextSearch, page: 1 };
    });
  }, [debouncedSearch]);

  // State → URL
  useEffect(() => {
    if (urlSyncLock.current) {
      urlSyncLock.current = false;
      return;
    }
    const params = workspaceListStateToSearchParams(listState);
    const qs = params.toString();
    const current = searchParams?.toString() ?? '';
    if (qs === current) return;
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
  }, [listState, pathname, router, searchParams]);

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

  // Invalid workspace → 422: recover to follow_up once (no loop).
  useEffect(() => {
    if (!tableEnabled || !tableState.error) return;
    if (tableState.error.code !== 'validation_error') return;
    if (listState.workspace === 'follow_up') return;
    setListState((prev) => applyWorkspaceChange(prev, 'follow_up'));
  }, [tableEnabled, tableState.error, listState.workspace]);

  const appliedWorkspace = readAppliedWorkspaceFilter(
    tableState.meta?.applied_filters as Record<string, unknown> | undefined,
  );

  useEffect(() => {
    clearSelection();
  }, [
    listState.workspace,
    listState.followStage,
    listState.awaitingSub,
    listState.postSub,
    listState.closedSub,
    listState.search,
    listState.academicYearId,
    listState.cycleCode,
    listState.levelId,
    listState.sourceId,
    clearSelection,
  ]);

  const dashboardData = dashboardState.data ?? null;
  const tablePagination = tableState.meta?.pagination;

  const effectiveHideConverted = resolveEffectiveHideConverted({
    hideConverted: listState.hideConverted,
    workspace: listState.workspace,
    postSub: listState.postSub,
    closedSub: listState.closedSub,
  });

  // Prefer server domains for hide-registered and application_status — no
  // client post-pagination shrinking of the page (SSOT: pagination.total wins).
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

  const sourceFilterOptions = useMemo(
    () =>
      buildAdmissionSourceFilterOptions(
        admissionOptions?.sources ?? [],
        t('admin.admissions.filters.directVisit'),
      ),
    [admissionOptions?.sources, t],
  );

  const sourceSelectValue = resolveSourceFilterSelectValue(
    sourceFilterOptions,
    listState.sourceId,
  );

  function patchListState(patch: Partial<AdmissionWorkspaceListState>) {
    setListState((prev) => ({ ...prev, ...patch }));
  }

  function setWorkspace(workspace: AdmissionWorkspace) {
    setListState((prev) => applyWorkspaceChange(prev, workspace));
  }

  function handleOperationalCard(card: AdmissionsOperationalCardId) {
    setListState((prev) => applyOperationalCard(prev, card));
  }

  function clearManualFilters() {
    setSearchInput('');
    setListState((prev) => ({
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
    }));
  }

  function handleTrackChange(nextCycleCode: string) {
    const cycleCode = nextCycleCode || undefined;
    const levels = admissionOptions?.levels ?? [];
    setListState((prev) => ({
      ...prev,
      cycleCode,
      levelId: resetLevelIfIncompatibleWithCycle(prev.levelId, cycleCode, levels),
      page: 1,
    }));
  }

  function reloadCurrentView() {
    if (view === 'kanban') {
      kanbanBoard.reload();
    } else {
      tableState.reload();
    }
    dashboardState.reload();
  }

  const reloadCurrentViewRef = useRef(reloadCurrentView);
  reloadCurrentViewRef.current = reloadCurrentView;

  // After family approval / status actions (list or detail), refresh list + counts.
  useEffect(() => {
    const onInvalidate = () => {
      reloadCurrentViewRef.current();
    };
    window.addEventListener(ADMISSIONS_QUERIES_INVALIDATED_EVENT, onInvalidate);
    return () => {
      window.removeEventListener(ADMISSIONS_QUERIES_INVALIDATED_EVENT, onInvalidate);
    };
  }, []);

  function retryDashboard() {
    setDashboardApiEnabled(true);
    dashboardState.reload();
  }

  const bootstrapping = !filtersReady;
  const dashboardBootLoading =
    bootstrapping ||
    (dashboardApiEnabled && dashboardState.initialLoading && !dashboardData);

  const emptyTitle = t(`admin.admissions.workspace.empty.${listState.workspace}.title`);
  const emptyDescription = hasManualFilters
    ? t('admin.admissions.workspace.empty.filteredDescription')
    : t(`admin.admissions.workspace.empty.${listState.workspace}.description`);

  const listEmptyState = (
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      action={
        hasManualFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearManualFilters}>
            {t('admin.admissions.workspace.clearAdvancedFilters')}
          </button>
        ) : (
          <Link href="/admin/admissions/new" className="btn btn--primary btn--sm">
            {t('admin.admissions.createButton')}
          </Link>
        )
      }
    />
  );

  const activeOperationalCard = resolveActiveOperationalCard(listState);
  const trustedActiveListTotal = resolveTrustedActiveListTotal({
    activeCard: activeOperationalCard,
    serverApplicationStatus:
      typeof serverQuery.application_status === 'string'
        ? serverQuery.application_status
        : null,
    paginationTotal: tablePagination?.total ?? null,
    listSettled: tableEnabled && !tableState.loading,
    view,
  });

  return (
    <div className="admissions-page admissions-list-page" data-testid="admissions-list-page">
      <header className="admissions-list-header">
        <div className="admissions-list-header__main">
          <h1 className="admissions-list-header__title">{t('admin.admissions.title')}</h1>
          <p className="admissions-list-header__subtitle">{t('admin.admissions.subtitle')}</p>
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

      <div className="admissions-filter-deck" data-testid="admissions-filter-deck">
        <nav
          className="admissions-workspace-tabs admissions-filter-deck__band admissions-filter-deck__band--workspaces"
          aria-label={t('admin.admissions.workspace.navLabel')}
          data-testid="admissions-workspace-tabs"
        >
          <div className="admissions-workspace-tabs__scroller" role="tablist">
            {ADMISSION_WORKSPACES.map((workspace) => {
              const selected = listState.workspace === workspace;
              const countKey = ADMISSION_WORKSPACE_COUNT_KEYS[workspace];
              const count =
                dashboardData != null
                  ? Number(
                      dashboardData[countKey as keyof AdmissionsDashboard] ?? 0,
                    )
                  : null;
              return (
                <button
                  key={workspace}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    'admissions-workspace-tabs__tab',
                    selected && 'admissions-workspace-tabs__tab--active',
                  )}
                  data-testid={`admissions-workspace-tab-${workspace}`}
                  data-count-key={countKey}
                  onClick={() => setWorkspace(workspace)}
                >
                  <span className="admissions-workspace-tabs__label">
                    {t(`admin.admissions.workspace.${workspace}`)}
                  </span>
                  {count != null ? (
                    <span className="admissions-workspace-tabs__count">{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>

        {dashboardData ? (
          <div className="admissions-filter-deck__band admissions-filter-deck__band--insights">
            <AdmissionsDashboardSummary
              data={dashboardData}
              activeOperationalCard={activeOperationalCard}
              activeListTotal={trustedActiveListTotal}
              onOperationalCardClick={handleOperationalCard}
            />
          </div>
        ) : dashboardBootLoading ? (
          <div className="admissions-filter-deck__band admissions-filter-deck__band--insights">
            <AdmissionsDashboardSkeleton />
          </div>
        ) : dashboardState.error ? (
          <div className="admissions-filter-deck__band admissions-dashboard-fallback">
            <InfoBanner
              tone="amber"
              title={t('admin.admissions.dashboard.fallbackTitle')}
              description={t('admin.admissions.dashboard.fallbackDescription')}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={retryDashboard}>
              {t('common.retry')}
            </button>
          </div>
        ) : null}

      {listState.workspace === 'post_acceptance' ? (
        <div
          className="admissions-subfilters admissions-filter-deck__band admissions-filter-deck__band--sub"
          role="group"
          aria-label={t('admin.admissions.workspace.postSubLabel')}
          data-testid="admissions-post-subfilters"
        >
          {(
            [
              ['awaiting', 'admin.admissions.registrationStatus.awaiting_registration'],
              ['ready', 'admin.admissions.applicationStatus.ready_for_registration'],
              ['registered', 'admin.admissions.applicationStatus.registered'],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              className={cn(
                'admissions-subfilters__btn',
                listState.postSub === value && 'admissions-subfilters__btn--active',
              )}
              aria-pressed={listState.postSub === value}
              data-testid={`admissions-post-sub-${value}`}
              onClick={() =>
                patchListState({
                  postSub: value as PostAcceptanceSubfilter,
                  // Registered queue must show linked admissions.
                  hideConverted: value === 'registered' ? false : true,
                  page: 1,
                })
              }
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      ) : null}

      {listState.workspace === 'closed' ? (
        <div
          className="admissions-subfilters admissions-filter-deck__band admissions-filter-deck__band--sub"
          role="group"
          aria-label={t('admin.admissions.workspace.closedSubLabel')}
          data-testid="admissions-closed-subfilters"
        >
          {(
            [
              ['rejected', 'admin.admissions.applicationStatus.rejected'],
              ['closed', 'admin.admissions.applicationStatus.closed'],
              ['registered', 'admin.admissions.applicationStatus.registered'],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              className={cn(
                'admissions-subfilters__btn',
                listState.closedSub === value && 'admissions-subfilters__btn--active',
              )}
              aria-pressed={listState.closedSub === value}
              data-testid={`admissions-closed-sub-${value}`}
              onClick={() =>
                patchListState({
                  closedSub: value as ClosedSubfilter,
                  hideConverted: value === 'registered' ? false : listState.hideConverted,
                  page: 1,
                })
              }
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      ) : null}

      {listState.workspace === 'follow_up' && view === 'table' ? (
        <div
          className="admissions-subfilters admissions-filter-deck__band admissions-filter-deck__band--sub"
          role="group"
          aria-label={t('admin.admissions.workspace.followStageLabel')}
          data-testid="admissions-follow-subfilters"
        >
          <button
            type="button"
            className={cn(
              'admissions-subfilters__btn',
              listState.followStage === '' && 'admissions-subfilters__btn--active',
            )}
            aria-pressed={listState.followStage === ''}
            data-testid="admissions-follow-sub-all"
            onClick={() => patchListState({ followStage: '', page: 1 })}
          >
            {t('admin.admissions.workspace.allInWorkspace')}
          </button>
          {FOLLOW_UP_WORKSPACE_STATES.map((stage) => (
            <button
              key={stage}
              type="button"
              className={cn(
                'admissions-subfilters__btn',
                listState.followStage === stage && 'admissions-subfilters__btn--active',
              )}
              aria-pressed={listState.followStage === stage}
              data-testid={`admissions-follow-sub-${stage}`}
              onClick={() =>
                patchListState({
                  followStage: stage as FollowUpWorkspaceState,
                  page: 1,
                })
              }
            >
              {t(`admin.admissions.applicationStatus.${stage}`)}
            </button>
          ))}
        </div>
      ) : null}

      {listState.workspace === 'awaiting_decision' ? (
        <div
          className="admissions-subfilters admissions-filter-deck__band admissions-filter-deck__band--sub"
          role="group"
          aria-label={t('admin.admissions.workspace.awaitingSubLabel')}
          data-testid="admissions-awaiting-subfilters"
        >
          {(
            [
              ['', 'admin.admissions.workspace.allInWorkspace'],
              ['decision_pending', 'admin.admissions.applicationStatus.decision_pending'],
              ['waitlisted', 'admin.admissions.applicationStatus.waitlisted'],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value || 'all'}
              type="button"
              className={cn(
                'admissions-subfilters__btn',
                listState.awaitingSub === value && 'admissions-subfilters__btn--active',
              )}
              aria-pressed={listState.awaitingSub === value}
              data-testid={`admissions-awaiting-sub-${value || 'all'}`}
              onClick={() =>
                patchListState({
                  awaitingSub: value as AwaitingDecisionSubfilter,
                  page: 1,
                })
              }
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="admissions-list-toolbar admissions-filter-deck__band admissions-filter-deck__band--tools">
        <div className="admissions-list-toolbar__filters">
          <select
            className="input admissions-list-toolbar__state"
            value={listState.academicYearId ?? ''}
            onChange={(e) =>
              patchListState({
                academicYearId: e.target.value || undefined,
                page: 1,
              })
            }
            aria-label={t('admin.admissions.filters.academicYear')}
            data-testid="admissions-filter-year"
          >
            <option value="">{t('admin.admissions.filters.allAcademicYears')}</option>
            {(admissionOptions?.academic_years ?? []).map((year) => (
              <option key={year.id} value={String(year.id)}>
                {year.name}
              </option>
            ))}
          </select>

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
            onChange={(e) =>
              patchListState({
                levelId: e.target.value || undefined,
                page: 1,
              })
            }
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

          <select
            className="input admissions-list-toolbar__state"
            value={sourceSelectValue}
            onChange={(e) =>
              patchListState({
                sourceId: e.target.value || undefined,
                page: 1,
              })
            }
            aria-label={t('admin.admissions.filters.source')}
            data-testid="admissions-filter-source"
          >
            <option value="">{t('admin.admissions.filters.allSources')}</option>
            {sourceFilterOptions.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>

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

          {listState.workspace === 'post_acceptance' &&
          listState.postSub === 'registered' ? null : (
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
                onChange={(e) =>
                  patchListState({
                    hideConverted: e.target.checked,
                    page: 1,
                  })
                }
              />
              <span>{t('admin.admissions.filters.hideConverted')}</span>
            </label>
          )}

          <div
            className="admissions-view-toggle"
            role="group"
            aria-label={t('admin.admissions.viewMode')}
          >
            <button
              type="button"
              aria-pressed={view === 'kanban'}
              disabled={!workspacePreset.kanbanAllowed}
              title={
                workspacePreset.kanbanAllowed
                  ? undefined
                  : t('admin.admissions.workspace.kanbanDisabled')
              }
              data-testid="admissions-view-kanban"
              onClick={() => {
                if (!workspacePreset.kanbanAllowed) return;
                patchListState({ view: 'kanban' });
              }}
            >
              {t('admin.admissions.viewKanban')}
            </button>
            <button
              type="button"
              aria-pressed={view === 'table'}
              data-testid="admissions-view-table"
              onClick={() => patchListState({ view: 'table' })}
            >
              {t('admin.admissions.viewTable')}
            </button>
          </div>
        </div>
      </div>

      {hasManualFilters || activeOperationalCard ? (
        <div
          className="admissions-list-active-filters admissions-filter-deck__band admissions-filter-deck__band--chips"
          aria-live="polite"
          data-testid="admissions-active-filters"
        >
          {activeOperationalCard ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip admissions-list-active-filters__chip--operational"
              data-testid="chip-operational"
              onClick={() => handleOperationalCard(activeOperationalCard)}
            >
              {t(
                ADMISSIONS_OPERATIONAL_CARDS.find((c) => c.id === activeOperationalCard)
                  ?.labelKey ?? 'admin.admissions.filters.chipOutcome',
              )}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {listState.search?.trim() ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              onClick={() => {
                setSearchInput('');
                patchListState({ search: undefined, page: 1 });
              }}
            >
              {t('admin.admissions.filters.chipSearch', {
                query: listState.search.trim(),
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {listState.academicYearId ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              data-testid="chip-year"
              onClick={() => patchListState({ academicYearId: undefined, page: 1 })}
            >
              {t('admin.admissions.filters.chipYear', {
                year:
                  admissionOptions?.academic_years.find(
                    (y) => String(y.id) === listState.academicYearId,
                  )?.name ?? listState.academicYearId,
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {listState.cycleCode ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              data-testid="chip-track"
              onClick={() => handleTrackChange('')}
            >
              {t('admin.admissions.filters.chipTrack', {
                track:
                  trackOptions.find((c) => c.code === listState.cycleCode)?.name ??
                  listState.cycleCode,
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {listState.levelId ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              data-testid="chip-level"
              onClick={() => patchListState({ levelId: undefined, page: 1 })}
            >
              {t('admin.admissions.filters.chipLevel', {
                level:
                  admissionOptions?.levels.find(
                    (l) => String(l.id) === listState.levelId,
                  )?.name ?? listState.levelId,
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {listState.sourceId ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              data-testid="chip-source"
              onClick={() => patchListState({ sourceId: undefined, page: 1 })}
            >
              {t('admin.admissions.filters.chipSource', {
                source: sourceFilterChipLabel(
                  sourceFilterOptions,
                  listState.sourceId,
                  listState.sourceId,
                ),
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {listState.decision ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              data-testid="chip-decision"
              onClick={() => patchListState({ decision: undefined, page: 1 })}
            >
              {t('admin.admissions.filters.chipDecision', {
                decision: t(`admin.admissions.decisions.${listState.decision}`),
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {listState.offerState ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              data-testid="chip-offer"
              onClick={() => patchListState({ offerState: undefined, page: 1 })}
            >
              {t('admin.admissions.filters.chipOffer', {
                offer: t(`admin.admissions.offerStates.${listState.offerState}`),
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {!listState.hideConverted &&
          !(
            listState.workspace === 'post_acceptance' &&
            listState.postSub === 'registered'
          ) ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              data-testid="chip-show-registered"
              onClick={() => patchListState({ hideConverted: true, page: 1 })}
            >
              {t('admin.admissions.filters.chipHideConvertedOff')}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
      </div>

      {view === 'table' && tableState.fetching && !tableState.initialLoading ? (
        <p className="admissions-list-refetching" aria-live="polite">
          {t('admin.admissions.refetching')}
        </p>
      ) : null}

      {selectedCount > 0 && listState.workspace === 'follow_up' ? (
        <div className="admissions-bulk-bar muted" data-testid="admissions-bulk-disabled">
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
            {t('admin.admissions.bulk.clearSelection')}
          </button>
          <span>{t('admin.admissions.bulk.manualStageDisabled')}</span>
        </div>
      ) : null}

      {view === 'kanban' && workspacePreset.kanbanAllowed ? (
        !filtersReady || kanbanBoard.initialLoading ? (
          <div
            className="admissions-kanban-skeleton"
            data-testid="admissions-kanban-skeleton"
            aria-busy="true"
            aria-label={t('common.loading')}
          >
            {(ADMISSION_KANBAN_PRESENTATION_COLUMNS.length
              ? ADMISSION_KANBAN_PRESENTATION_COLUMNS.map((col) => col.id)
              : ['new', 'follow_up', 'in_assessment']
            ).map((state) => (
              <div key={state} className="admissions-kanban-skeleton__column" />
            ))}
          </div>
        ) : kanbanBoard.error ? (
          <div className="alert alert--error">{kanbanBoard.error.message}</div>
        ) : (
          <AdmissionsRawStateKanban
            columns={kanbanColumns}
            allowDrag={false}
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
        data-applied-workspace={appliedWorkspace ?? ''}
        data-query={JSON.stringify(workspacePreset.query)}
      />
    </div>
  );
}
