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
import { AdmissionsBulkActionBar } from './admissions-bulk-action-bar';
import { AdmissionsDashboardSummary } from './admissions-dashboard-summary';
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
  getWorkspaceAdvancedFilterAvailability,
  hasManualContextOrAdvancedFilters,
  parseWorkspaceListStateFromSearchParams,
  readAppliedWorkspaceFilter,
  workspaceListStateToSearchParams,
  ADMISSION_WORKSPACE_COUNT_KEYS,
  type AdmissionWorkspace,
  type AdmissionWorkspaceListState,
  type ClosedSubfilter,
  type FollowUpWorkspaceState,
  type PostAcceptanceSubfilter,
  type AwaitingDecisionSubfilter,
} from '../utils/admission-workspace';
import { getAdmissionManualStageOptions } from '../utils/admission-stage-options';
import { getAdmissionDecisionOptions } from '../utils/admission-decision-options';
import type { AdmissionsOperationalCardId } from '../utils/admissions-dashboard-cards';
import { normalizeAdmissionListItems } from '../utils/normalize-admission-record';
import '../admissions.css';

const TABLE_PAGE_SIZE = 25;

const OFFER_STATE_OPTIONS = [
  '',
  'draft',
  'sent',
  'accepted',
  'declined',
  'expired',
  'cancelled',
] as const;

function resolveActiveOperationalCard(
  state: AdmissionWorkspaceListState,
): AdmissionsOperationalCardId | null {
  if (state.workspace === 'post_acceptance' && state.postSub === 'awaiting') {
    return 'awaiting_registration';
  }
  if (state.workspace === 'post_acceptance' && state.postSub === 'ready') {
    return 'ready_for_registration';
  }
  if (state.workspace === 'closed' && state.closedSub === 'rejected') {
    return 'school_rejected';
  }
  return null;
}

export function AdmissionsListPage() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { options: admissionOptions } = useAdmissionOptions();

  const [listState, setListState] = useState<AdmissionWorkspaceListState>(() =>
    parseWorkspaceListStateFromSearchParams(
      new URLSearchParams(searchParams?.toString() ?? ''),
    ),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
  const tableEnabled = view === 'table';
  const kanbanEnabled = view === 'kanban' && workspacePreset.kanbanAllowed;

  const tableState = useAdminResource<AdmissionListItem[]>(
    tableEnabled ? endpoints.admin.admissions : null,
    tableParams,
  );

  const kanbanBoard = useAdmissionsKanbanBoard({
    columns: workspacePreset.kanbanColumns,
    search: listState.search?.trim() || undefined,
    extraQuery: buildKanbanWorkspaceExtraQuery(listState),
    enabled: kanbanEnabled,
  });

  const [dashboardApiEnabled, setDashboardApiEnabled] = useState(true);
  const dashboardState = useAdminResource<AdmissionsDashboard>(
    dashboardApiEnabled ? endpoints.admin.admissionsDashboard : null,
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
    listState.levelId,
    listState.sourceId,
    clearSelection,
  ]);

  const dashboardData = dashboardState.data ?? null;
  const tablePagination = tableState.meta?.pagination;

  const tableRows = useMemo(() => {
    if (!tableState.data) return [];
    return normalizeAdmissionListItems(tableState.data);
  }, [tableState.data]);

  const selectedItems = useMemo(() => {
    const source =
      view === 'table'
        ? tableRows
        : kanbanBoard.grouped.flatMap((col) => col.items);
    return source.filter((item) => selectedIds.has(item.id));
  }, [view, tableRows, kanbanBoard.grouped, selectedIds]);

  const hasManualFilters = hasManualContextOrAdvancedFilters(listState);

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
      levelId: undefined,
      sourceId: undefined,
      stage: undefined,
      decision: undefined,
      offerState: undefined,
      registrationStatus: undefined,
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

  function retryDashboard() {
    setDashboardApiEnabled(true);
    dashboardState.reload();
  }

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
  const filterAvailability = useMemo(
    () => getWorkspaceAdvancedFilterAvailability(listState.workspace),
    [listState.workspace],
  );

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

      <nav
        className="admissions-workspace-tabs"
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
                <span>{t(`admin.admissions.workspace.${workspace}`)}</span>
                {count != null ? (
                  <span className="admissions-workspace-tabs__count">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {dashboardData ? (
        <AdmissionsDashboardSummary
          data={dashboardData}
          activeOperationalCard={activeOperationalCard}
          onOperationalCardClick={handleOperationalCard}
        />
      ) : dashboardState.loading && dashboardApiEnabled ? (
        <div className="muted">{t('common.loading')}</div>
      ) : dashboardState.error ? (
        <div className="admissions-dashboard-fallback">
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
          className="admissions-subfilters"
          role="group"
          aria-label={t('admin.admissions.workspace.postSubLabel')}
          data-testid="admissions-post-subfilters"
        >
          {(
            [
              ['awaiting', 'admin.admissions.registrationStatus.awaiting_registration'],
              ['ready', 'admin.admissions.registrationStatus.ready_for_registration'],
              ['registered', 'admin.admissions.registrationStatus.registered'],
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
          className="admissions-subfilters"
          role="group"
          aria-label={t('admin.admissions.workspace.closedSubLabel')}
          data-testid="admissions-closed-subfilters"
        >
          <button
            type="button"
            className={cn(
              'admissions-subfilters__btn',
              listState.closedSub === 'rejected' && 'admissions-subfilters__btn--active',
            )}
            aria-pressed={listState.closedSub === 'rejected'}
            data-testid="admissions-closed-sub-rejected"
            onClick={() => patchListState({ closedSub: 'rejected', page: 1 })}
          >
            {t('admin.admissions.schoolDecision.rejected')}
          </button>
          <span className="admissions-subfilters__divider muted tiny">
            {t('admin.admissions.workspace.closedOther')}
          </span>
          {(
            [
              ['lost', 'admin.admissions.states.lost'],
              ['cancelled', 'admin.admissions.states.cancelled'],
              ['duplicate', 'admin.admissions.states.duplicate'],
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
          className="admissions-subfilters"
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
              {t(`admin.admissions.states.${stage}`)}
            </button>
          ))}
        </div>
      ) : null}

      {listState.workspace === 'awaiting_decision' ? (
        <div
          className="admissions-subfilters"
          role="group"
          aria-label={t('admin.admissions.workspace.awaitingSubLabel')}
          data-testid="admissions-awaiting-subfilters"
        >
          {(
            [
              ['', 'admin.admissions.workspace.allInWorkspace'],
              ['under_review', 'admin.admissions.states.under_review'],
              ['needs_reassessment', 'admin.admissions.decisions.needs_reassessment'],
              ['waitlisted', 'admin.admissions.decisions.waitlisted'],
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

      <div className="admissions-list-toolbar">
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
          {(admissionOptions?.levels ?? []).map((level) => (
            <option key={level.id} value={String(level.id)}>
              {level.name}
            </option>
          ))}
        </select>

        <select
          className="input admissions-list-toolbar__state"
          value={listState.sourceId ?? ''}
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
          {(admissionOptions?.sources ?? []).map((source) => (
            <option key={source.id} value={String(source.id)}>
              {source.label}
            </option>
          ))}
        </select>

        <div className="admissions-list-toolbar__advanced-wrap">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-expanded={advancedOpen}
            data-testid="admissions-advanced-filters-toggle"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {t('admin.admissions.workspace.advancedFilters')}
          </button>
          {advancedOpen ? (
            <div
              className="admissions-advanced-filters"
              data-testid="admissions-advanced-filters"
              role="dialog"
              aria-label={t('admin.admissions.workspace.advancedFilters')}
            >
              {filterAvailability.disabledReasonKey ? (
                <p className="tiny muted admissions-advanced-filters__note">
                  {t(filterAvailability.disabledReasonKey)}
                </p>
              ) : null}

              {filterAvailability.stage ? (
                <label className="admissions-advanced-filters__field">
                  <span>{t('admin.admissions.workspace.followUpStage')}</span>
                  <select
                    className="input"
                    value={
                      listState.workspace === 'follow_up'
                        ? listState.followStage
                        : listState.stage ?? ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (listState.workspace === 'follow_up') {
                        patchListState({
                          followStage: value as FollowUpWorkspaceState,
                          page: 1,
                        });
                      } else {
                        patchListState({
                          stage: value || undefined,
                          page: 1,
                        });
                      }
                    }}
                    data-testid="admissions-advanced-stage"
                  >
                    {getAdmissionManualStageOptions()
                      .filter((s) =>
                        listState.workspace === 'follow_up'
                          ? (FOLLOW_UP_WORKSPACE_STATES as readonly string[]).includes(s)
                          : s === 'under_review',
                      )
                      .map((stage) => (
                        <option key={stage} value={stage}>
                          {t(`admin.admissions.states.${stage}`)}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <p className="tiny muted">{t('admin.admissions.workspace.stageFilterUnavailable')}</p>
              )}

              {filterAvailability.decision ? (
                <label className="admissions-advanced-filters__field">
                  <span>{t('admin.admissions.workspace.schoolDecision')}</span>
                  <select
                    className="input"
                    value={listState.decision ?? ''}
                    onChange={(e) =>
                      patchListState({
                        decision: e.target.value || undefined,
                        page: 1,
                      })
                    }
                    data-testid="admissions-advanced-decision"
                  >
                    <option value="">{t('admin.admissions.filters.allDecisions')}</option>
                    {getAdmissionDecisionOptions().map((decision) => (
                      <option key={decision} value={decision}>
                        {t(`admin.admissions.decisions.${decision}`)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {filterAvailability.offerState ? (
                <label className="admissions-advanced-filters__field">
                  <span>{t('admin.admissions.workspace.offerState')}</span>
                  <select
                    className="input"
                    value={listState.offerState ?? ''}
                    onChange={(e) =>
                      patchListState({
                        offerState: e.target.value || undefined,
                        page: 1,
                      })
                    }
                    data-testid="admissions-advanced-offer"
                  >
                    <option value="">{t('admin.admissions.filters.allOfferStates')}</option>
                    {OFFER_STATE_OPTIONS.filter(Boolean).map((value) => (
                      <option key={value} value={value}>
                        {t(`admin.admissions.offerStates.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {!filterAvailability.registrationStatus ? (
                <p className="tiny muted">
                  {t('admin.admissions.workspace.registrationFilterViaSub')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

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

        {hasManualFilters ? (
          <button
            type="button"
            className="admissions-list-toolbar__reset"
            onClick={clearManualFilters}
          >
            {t('admin.admissions.filters.reset')}
          </button>
        ) : null}
      </div>

      {hasManualFilters ? (
        <div
          className="admissions-list-active-filters"
          aria-live="polite"
          data-testid="admissions-active-filters"
        >
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
                source:
                  admissionOptions?.sources.find(
                    (s) => String(s.id) === listState.sourceId,
                  )?.label ?? listState.sourceId,
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
        </div>
      ) : null}

      {view === 'table' && tableState.fetching && !tableState.initialLoading ? (
        <p className="admissions-list-refetching" aria-live="polite">
          {t('admin.admissions.refetching')}
        </p>
      ) : null}

      {selectedCount > 0 && listState.workspace === 'follow_up' ? (
        <AdmissionsBulkActionBar
          selectedItems={selectedItems}
          onClearSelection={clearSelection}
          onUpdated={reloadCurrentView}
          onPartialFailure={(failedIds) => setSelectedIds(new Set(failedIds))}
        />
      ) : null}

      {view === 'kanban' && kanbanEnabled ? (
        kanbanBoard.initialLoading ? (
          <div
            className="admissions-kanban-skeleton"
            data-testid="admissions-kanban-skeleton"
            aria-busy="true"
            aria-label={t('common.loading')}
          >
            {(workspacePreset.kanbanColumns.length
              ? workspacePreset.kanbanColumns
              : ['new', 'contacted', 'qualified', 'visit_pending']
            ).map((state) => (
              <div key={state} className="admissions-kanban-skeleton__column" />
            ))}
          </div>
        ) : kanbanBoard.error ? (
          <div className="alert alert--error">{kanbanBoard.error.message}</div>
        ) : (
          <AdmissionsRawStateKanban
            columns={kanbanBoard.grouped}
            allowDrag={listState.workspace === 'follow_up'}
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
            tableState.initialLoading && 'admissions-table-wrap--loading',
          )}
        >
          <ResourceView
            state={tableState}
            empty={listEmptyState}
            isEmpty={(data) => !data || (Array.isArray(data) && data.length === 0)}
          >
            {(data) => (
              <>
                <AdmissionsTable
                  items={data}
                  onUpdated={reloadCurrentView}
                  selectionMode={selectionMode}
                  isSelected={isSelected}
                  onToggleSelect={toggle}
                  onToggleVisible={() => toggleVisible(data.map((r) => r.id))}
                  visibleSelectionState={visibleSelectionState(
                    data.map((r) => r.id),
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
              </>
            )}
          </ResourceView>
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
