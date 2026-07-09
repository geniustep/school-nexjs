'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { Pagination } from '@/components/tables/data-table';
import { InfoBanner } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { AdmissionListItem, AdmissionsDashboard } from '@/types/admission';
import type { ListParams } from '@/types/api';
import { useAdmissionsKanbanBoard } from '../hooks/use-admissions-kanban-board';
import { useAdmissionsSelection } from '../hooks/use-admissions-selection';
import { useAdmissionsUiStageTableList } from '../hooks/use-admissions-ui-stage-table-list';
import { AdmissionsBulkActionBar } from './admissions-bulk-action-bar';
import { AdmissionsDashboardSummary } from './admissions-dashboard-summary';
import { AdmissionsKanban } from './admissions-kanban';
import { AdmissionsTable } from './admissions-table';
import {
  ACTIVE_UI_STAGES,
  ALL_UI_STAGES,
  CLOSED_UI_STAGE,
  groupKanbanColumnsByUiStage,
  pickRawStateForUiStageLoadMore,
  rawStatesForUiStageColumns,
  rawStatesForUiStageFetch,
  resolveAdmissionUiStage,
  resolveKanbanDisplayStages,
  type AdmissionUiStage,
} from '../utils/admission-ui-stage';
import {
  countHiddenConvertedAdmissionListItems,
  filterAdmissionListItems,
  hasActiveAdmissionListFilters,
} from '../utils/filter-admission-list-items';
import '../admissions.css';

type ViewMode = 'kanban' | 'table';

const TABLE_PAGE_SIZE = 25;

export function AdmissionsListPage() {
  const t = useT();
  const [view, setView] = useState<ViewMode>('kanban');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<AdmissionUiStage | ''>('');
  const [showClosed, setShowClosed] = useState(false);
  const [hideConverted, setHideConverted] = useState(true);
  const debouncedSearch = useDebouncedValue(search, 400);
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

  const showClosedColumn = showClosed || stateFilter === CLOSED_UI_STAGE;

  const kanbanDisplayStages = useMemo(
    () =>
      resolveKanbanDisplayStages({
        showClosed,
        hideConverted,
        stateFilter,
      }),
    [showClosed, hideConverted, stateFilter],
  );

  const fetchRawStates = useMemo(() => {
    if (stateFilter) {
      const raw = rawStatesForUiStageFetch(stateFilter);
      return raw.length > 0 ? raw : rawStatesForUiStageColumns(ACTIVE_UI_STAGES);
    }
    return rawStatesForUiStageColumns(kanbanDisplayStages);
  }, [stateFilter, kanbanDisplayStages]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, view, showClosed, hideConverted]);

  useEffect(() => {
    clearSelection();
  }, [debouncedSearch, stateFilter, showClosed, hideConverted, clearSelection]);

  useEffect(() => {
    if (stateFilter === CLOSED_UI_STAGE) setShowClosed(true);
  }, [stateFilter]);

  const tableParams: ListParams = useMemo(
    () => ({
      page,
      page_size: TABLE_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
    }),
    [page, debouncedSearch],
  );

  const tableStateDefault = useAdminResource<AdmissionListItem[]>(
    view === 'table' && !stateFilter ? endpoints.admin.admissions : null,
    tableParams,
  );

  const tableStateFiltered = useAdmissionsUiStageTableList({
    page,
    pageSize: TABLE_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    uiStageFilter: stateFilter || 'new',
    enabled: view === 'table' && !!stateFilter,
  });

  const tableState = stateFilter ? tableStateFiltered : tableStateDefault;

  const kanbanBoard = useAdmissionsKanbanBoard({
    columns: fetchRawStates,
    search: debouncedSearch.trim() || undefined,
    enabled: view === 'kanban',
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

  const dashboardData = dashboardState.data ?? null;
  const tablePagination = tableState.meta?.pagination;

  const filteredTableRows = useMemo(() => {
    const rows = filterAdmissionListItems(tableState.data ?? [], hideConverted);
    if (!showClosed) {
      return rows.filter((item) => resolveAdmissionUiStage(item) !== CLOSED_UI_STAGE);
    }
    return rows;
  }, [tableState.data, hideConverted, showClosed]);

  const filteredKanbanGrouped = useMemo(() => {
    const uiColumns = groupKanbanColumnsByUiStage(kanbanBoard.grouped, kanbanDisplayStages);
    return uiColumns.map((column) => {
      const items = filterAdmissionListItems(column.items, hideConverted);
      return {
        ...column,
        items,
        total: items.length,
      };
    });
  }, [kanbanBoard.grouped, kanbanDisplayStages, hideConverted]);

  const loadedListItems = useMemo(() => {
    if (view === 'kanban') {
      return filterAdmissionListItems(kanbanBoard.allItems, hideConverted);
    }
    return filteredTableRows;
  }, [view, kanbanBoard.allItems, filteredTableRows, hideConverted]);

  const selectedItems = useMemo(
    () => loadedListItems.filter((item) => selectedIds.has(item.id)),
    [loadedListItems, selectedIds],
  );

  const tableVisibleIds = useMemo(
    () => filteredTableRows.map((item) => item.id),
    [filteredTableRows],
  );

  const tableVisibleSelection = visibleSelectionState(tableVisibleIds);

  const handleKanbanLoadMore = useCallback(
    (stage: AdmissionUiStage) => {
      const rawState = pickRawStateForUiStageLoadMore(stage, kanbanBoard.grouped);
      if (rawState) kanbanBoard.loadMore(rawState);
    },
    [kanbanBoard],
  );

  const visibleSummary = useMemo(() => {
    if (view === 'kanban') {
      return filteredKanbanGrouped.reduce((sum, column) => sum + column.items.length, 0);
    }
    return filteredTableRows.length;
  }, [view, filteredKanbanGrouped, filteredTableRows]);

  const hiddenConvertedOnPage = useMemo(() => {
    const source = view === 'kanban' ? kanbanBoard.allItems : (tableState.data ?? []);
    return countHiddenConvertedAdmissionListItems(source, hideConverted);
  }, [view, kanbanBoard.allItems, tableState.data, hideConverted]);

  const isListLoading = view === 'kanban' ? kanbanBoard.initialLoading : tableState.initialLoading;

  const hasActiveFilters = hasActiveAdmissionListFilters({
    search: debouncedSearch,
    stateFilter,
    showClosed,
    hideConverted,
  });

  function resetFilters() {
    setSearch('');
    setStateFilter('');
    setShowClosed(false);
    setHideConverted(true);
    setPage(1);
  }

  function retryDashboard() {
    setDashboardApiEnabled(true);
    dashboardState.reload();
  }

  function handleKpiClick(key: keyof AdmissionsDashboard) {
    if (key === 'total_open') {
      setStateFilter('');
      setShowClosed(false);
    }
  }

  function reloadCurrentView() {
    if (view === 'kanban') {
      kanbanBoard.reload();
      return;
    }
    tableState.reload();
  }

  return (
    <div className="admissions-page admissions-list-page">
      <header className="admissions-list-header">
        <div className="admissions-list-header__main">
          <h1 className="admissions-list-header__title">{t('admin.admissions.title')}</h1>
          <p className="admissions-list-header__subtitle">{t('admin.admissions.subtitle')}</p>
        </div>
        <div className="admissions-list-header__actions">
          <Link
            href="/admin/admissions/family/new"
            className="btn btn--ghost admissions-list-header__cta-secondary"
          >
            {t('admin.admissions.family.createButton')}
          </Link>
          <Link href="/admin/admissions/new" className="btn btn--primary admissions-list-header__cta">
            {t('admin.admissions.createButton')}
          </Link>
        </div>
      </header>

      {dashboardData ? (
        <AdmissionsDashboardSummary data={dashboardData} onKpiClick={handleKpiClick} />
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

      <div className="admissions-list-toolbar">
        <div className="admissions-list-toolbar__search-wrap">
          <input
            className="input admissions-list-toolbar__search"
            type="search"
            placeholder={t('admin.admissions.filters.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('admin.admissions.filters.search')}
          />
        </div>

        <div
          className="admissions-list-toolbar__controls"
          role="group"
          aria-label={t('admin.admissions.filters.state')}
        >
          <select
            className="input admissions-list-toolbar__state"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as AdmissionUiStage | '')}
            aria-label={t('admin.admissions.filters.state')}
          >
            <option value="">{t('admin.admissions.filters.allStates')}</option>
            {ALL_UI_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {t(`admin.admissions.uiStages.${stage}`)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={cn(
              'admissions-quick-filter',
              stateFilter === 'in_evaluation' && 'admissions-quick-filter--active',
            )}
            aria-pressed={stateFilter === 'in_evaluation'}
            onClick={() =>
              setStateFilter((current) => (current === 'in_evaluation' ? '' : 'in_evaluation'))
            }
          >
            {t('admin.admissions.uiStages.in_evaluation')}
          </button>
        </div>

        <div
          className="admissions-view-toggle"
          role="group"
          aria-label={t('admin.admissions.viewMode')}
        >
          <button
            type="button"
            aria-pressed={view === 'kanban'}
            onClick={() => setView('kanban')}
          >
            {t('admin.admissions.viewKanban')}
          </button>
          <button
            type="button"
            aria-pressed={view === 'table'}
            onClick={() => setView('table')}
          >
            {t('admin.admissions.viewTable')}
          </button>
        </div>

        <label
          className={cn(
            'admissions-toolbar-option admissions-list-toolbar__option',
            hideConverted && 'admissions-toolbar-option--on',
          )}
        >
          <input
            type="checkbox"
            className="admissions-toolbar-option__input"
            checked={hideConverted}
            onChange={(e) => setHideConverted(e.target.checked)}
          />
          <span>{t('admin.admissions.filters.hideConverted')}</span>
        </label>

        {hasActiveFilters ? (
          <button
            type="button"
            className="admissions-list-toolbar__reset"
            onClick={resetFilters}
          >
            {t('admin.admissions.filters.reset')}
          </button>
        ) : null}
      </div>

      {selectedCount > 0 ? (
        <AdmissionsBulkActionBar
          selectedItems={selectedItems}
          onClearSelection={clearSelection}
          onUpdated={reloadCurrentView}
          onPartialFailure={(failedIds) => setSelectedIds(new Set(failedIds))}
        />
      ) : null}

      {view === 'kanban' ? (
        kanbanBoard.initialLoading ? (
          <div className="muted">{t('common.loading')}</div>
        ) : kanbanBoard.error ? (
          <div className="alert alert--error">{kanbanBoard.error.message}</div>
        ) : (
          <AdmissionsKanban
            columns={filteredKanbanGrouped}
            displayStages={kanbanDisplayStages}
            showClosed={showClosedColumn}
            onUpdated={reloadCurrentView}
            onLoadMore={handleKanbanLoadMore}
            selectionMode={selectionMode}
            isSelected={isSelected}
            onToggleSelect={toggle}
          />
        )
      ) : (
        <ResourceView
          state={tableState}
          isEmpty={() => filteredTableRows.length === 0}
        >
          {() => (
            <AdmissionsTable
              items={filteredTableRows}
              selectionMode={selectionMode}
              isSelected={isSelected}
              onToggleSelect={toggle}
              onToggleVisible={() => toggleVisible(tableVisibleIds)}
              visibleSelectionState={tableVisibleSelection}
            />
          )}
        </ResourceView>
      )}

      {!isListLoading ? (
        <footer
          className={cn(
            'admissions-list-footer',
            view === 'kanban' && 'admissions-list-footer--kanban',
          )}
        >
          <div className="admissions-list-footer__stats">
            <span className="admissions-list-footer__stat">
              {t('admin.admissions.filters.resultsCount', { count: visibleSummary })}
            </span>
            {hideConverted && hiddenConvertedOnPage > 0 ? (
              <span className="admissions-list-footer__stat admissions-list-footer__stat--muted">
                {t('admin.admissions.filters.hiddenConvertedCount', {
                  count: hiddenConvertedOnPage,
                })}
              </span>
            ) : null}
          </div>
          {view === 'table' && tablePagination ? (
            <div className="admissions-list-footer__pagination">
              <Pagination
                page={tablePagination.page}
                pageSize={tablePagination.page_size}
                totalPages={tablePagination.total_pages}
                total={tablePagination.total}
                onPage={setPage}
              />
            </div>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
