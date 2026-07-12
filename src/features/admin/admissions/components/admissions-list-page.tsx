'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAdmissionsKanbanBoard } from '../hooks/use-admissions-kanban-board';
import { useAdmissionsListView } from '../hooks/use-admissions-list-view';
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
  resolveKanbanDisplayStages,
  type AdmissionUiStage,
} from '../utils/admission-ui-stage';
import {
  admissionOutcomeFilterLabelKey,
  buildAdmissionOutcomeFilterQuery,
  outcomeFilterNeedsClosed,
  rawStatesForOutcomeFilter,
  type AdmissionOutcomeFilter,
} from '../utils/admission-status-display';
import {
  applyOutcomeQuickFilter,
  applyStageQuickFilter,
} from '../utils/admissions-quick-filter-apply';
import { normalizeAdmissionListItems } from '../utils/normalize-admission-record';
import {
  filterClosedAdmissionListItems,
  hasActiveAdmissionListFilters,
  shouldIncludeClosedAdmissions,
} from '../utils/filter-admission-list-items';
import { resolveAdmissionsListEmptyVariant } from '../utils/admissions-list-empty';
import { ACTIVE_KANBAN_STATES } from '../utils/admission-labels';
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

type OfferStateFilter = (typeof OFFER_STATE_OPTIONS)[number];

/** Registration outcome dropdown — registered stays here, not as a main card. */
const REGISTRATION_OUTCOME_OPTIONS: AdmissionOutcomeFilter[] = [
  '',
  'awaiting_registration',
  'registered',
  'school_rejected',
];

export function AdmissionsListPage() {
  const t = useT();
  const [view, setView] = useAdmissionsListView();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<AdmissionUiStage | ''>('');
  const [outcomeFilter, setOutcomeFilter] = useState<AdmissionOutcomeFilter>('');
  const [offerStateFilter, setOfferStateFilter] = useState<OfferStateFilter>('');
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

  const includeClosed = shouldIncludeClosedAdmissions({
    outcomeFilter,
    stateFilter,
  });

  const kanbanDisplayStages = useMemo(
    () =>
      resolveKanbanDisplayStages({
        includeClosed,
        stateFilter,
      }),
    [includeClosed, stateFilter],
  );

  const fetchRawStates = useMemo(() => {
    if (outcomeFilter) {
      const fallback = stateFilter
        ? rawStatesForUiStageFetch(stateFilter)
        : rawStatesForUiStageColumns(kanbanDisplayStages);
      const base =
        fallback.length > 0 ? fallback : [...ACTIVE_KANBAN_STATES];
      return rawStatesForOutcomeFilter(outcomeFilter, base);
    }
    if (stateFilter) {
      const raw = rawStatesForUiStageFetch(stateFilter);
      return raw.length > 0 ? raw : rawStatesForUiStageColumns(ACTIVE_UI_STAGES);
    }
    return rawStatesForUiStageColumns(kanbanDisplayStages);
  }, [stateFilter, outcomeFilter, kanbanDisplayStages]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, outcomeFilter, offerStateFilter, view]);

  useEffect(() => {
    clearSelection();
  }, [debouncedSearch, stateFilter, outcomeFilter, offerStateFilter, clearSelection]);

  const outcomeQuery = useMemo(() => {
    const fromOutcome = buildAdmissionOutcomeFilterQuery(outcomeFilter);
    if (offerStateFilter && !('offer_state' in fromOutcome)) {
      return { ...fromOutcome, offer_state: offerStateFilter };
    }
    return fromOutcome;
  }, [outcomeFilter, offerStateFilter]);

  const tableParams: ListParams = useMemo(
    () => ({
      page,
      page_size: TABLE_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      ...outcomeQuery,
    }),
    [page, debouncedSearch, outcomeQuery],
  );

  const tableUsesStageFilter = Boolean(stateFilter) && !outcomeFilter;

  const tableStateDefault = useAdminResource<AdmissionListItem[]>(
    view === 'table' && !tableUsesStageFilter ? endpoints.admin.admissions : null,
    tableParams,
  );

  const tableStateFiltered = useAdmissionsUiStageTableList({
    page,
    pageSize: TABLE_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    uiStageFilter: stateFilter || 'new',
    extraQuery: outcomeQuery,
    enabled: view === 'table' && tableUsesStageFilter,
  });

  const tableState = tableUsesStageFilter ? tableStateFiltered : tableStateDefault;

  const kanbanBoard = useAdmissionsKanbanBoard({
    columns: fetchRawStates,
    search: debouncedSearch.trim() || undefined,
    extraQuery: outcomeQuery,
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
    const source = tableUsesStageFilter
      ? (tableState.data ?? [])
      : normalizeAdmissionListItems(tableState.data ?? []);
    return filterClosedAdmissionListItems(source, includeClosed);
  }, [tableState.data, includeClosed, tableUsesStageFilter]);

  const filteredKanbanGrouped = useMemo(() => {
    const uiColumns = groupKanbanColumnsByUiStage(kanbanBoard.grouped, kanbanDisplayStages);
    return uiColumns.map((column) => {
      const items = filterClosedAdmissionListItems(column.items, includeClosed);
      return {
        ...column,
        items,
        total: items.length,
      };
    });
  }, [kanbanBoard.grouped, kanbanDisplayStages, includeClosed]);

  const loadedListItems = useMemo(() => {
    if (view === 'kanban') {
      return filterClosedAdmissionListItems(kanbanBoard.allItems, includeClosed);
    }
    return filteredTableRows;
  }, [view, kanbanBoard.allItems, filteredTableRows, includeClosed]);

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

  const isListLoading = view === 'kanban' ? kanbanBoard.initialLoading : tableState.initialLoading;

  const hasActiveFilters = hasActiveAdmissionListFilters({
    search: debouncedSearch,
    stateFilter,
    outcomeFilter,
    offerStateFilter,
  });

  const resetFilters = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setOutcomeFilter('');
    setOfferStateFilter('');
    setPage(1);
  }, []);

  /** Main card / outcome dropdown — clears conflicting stage. */
  const applyOutcomeFilter = useCallback((filter: AdmissionOutcomeFilter) => {
    const next = applyOutcomeQuickFilter(
      {
        stateFilter,
        outcomeFilter,
        offerStateFilter,
        page,
      },
      filter,
    );
    setOutcomeFilter(next.outcomeFilter);
    setStateFilter(next.stateFilter);
    setOfferStateFilter(next.offerStateFilter as typeof offerStateFilter);
    setPage(next.page);
  }, [stateFilter, outcomeFilter, offerStateFilter, page]);

  /** Stage filter — clears registration/outcome quick filter. */
  const applyStateFilter = useCallback((stage: AdmissionUiStage | '') => {
    const next = applyStageQuickFilter(
      {
        stateFilter,
        outcomeFilter,
        offerStateFilter,
        page,
      },
      stage,
    );
    setStateFilter(next.stateFilter);
    setOutcomeFilter(next.outcomeFilter);
    setPage(next.page);
  }, [stateFilter, outcomeFilter, offerStateFilter, page]);

  const applyOfferStateFilter = useCallback((value: OfferStateFilter) => {
    setOfferStateFilter(value);
    if (value === 'declined') {
      setOutcomeFilter('family_declined');
      setStateFilter('');
    } else if (value === 'expired') {
      setOutcomeFilter('expired_offer');
      setStateFilter('');
    } else if (
      value &&
      (outcomeFilter === 'family_declined' || outcomeFilter === 'expired_offer')
    ) {
      setOutcomeFilter('');
    }
    setPage(1);
  }, [outcomeFilter]);

  const applyNewStageFilter = useCallback(() => {
    setStateFilter('new');
    setOutcomeFilter('');
    setOfferStateFilter('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const listEmptyVariant = useMemo(
    () =>
      resolveAdmissionsListEmptyVariant({
        hasActiveFilters,
        visibleCount: visibleSummary,
        hiddenConvertedOnPage: 0,
      }),
    [hasActiveFilters, visibleSummary],
  );

  const listEmptyState = useMemo(() => {
    if (listEmptyVariant === 'no-match') {
      return (
        <EmptyState
          icon="🔍"
          title={t('admin.admissions.noMatch.title')}
          description={t('admin.admissions.noMatch.description')}
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              {t('admin.admissions.filters.reset')}
            </button>
          }
        />
      );
    }

    return (
      <EmptyState
        icon="📋"
        title={t('admin.admissions.noData.title')}
        description={t('admin.admissions.noData.description')}
        action={
          <Link href="/admin/admissions/new" className="btn btn--primary btn--sm">
            {t('admin.admissions.createButton')}
          </Link>
        }
      />
    );
  }, [listEmptyVariant, resetFilters, t]);

  function retryDashboard() {
    setDashboardApiEnabled(true);
    dashboardState.reload();
  }

  function reloadCurrentView() {
    if (view === 'kanban') {
      kanbanBoard.reload();
    } else {
      tableState.reload();
    }
    dashboardState.reload();
  }

  const registrationSelectValue: AdmissionOutcomeFilter =
    outcomeFilter === 'awaiting_registration' ||
    outcomeFilter === 'registered' ||
    outcomeFilter === 'school_rejected'
      ? outcomeFilter
      : '';

  const offerSelectValue: OfferStateFilter =
    outcomeFilter === 'family_declined'
      ? 'declined'
      : outcomeFilter === 'expired_offer'
        ? 'expired'
        : offerStateFilter;

  return (
    <div className="admissions-page admissions-list-page">
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

      {dashboardData ? (
        <AdmissionsDashboardSummary
          data={dashboardData}
          activeOutcomeFilter={outcomeFilter}
          onOutcomeFilterClick={applyOutcomeFilter}
          onNewFilterClick={applyNewStageFilter}
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

      <div className="admissions-list-toolbar">
        <div className="admissions-list-toolbar__search-wrap">
          <input
            className="input admissions-list-toolbar__search"
            type="search"
            placeholder={t('admin.admissions.filters.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('admin.admissions.filters.search')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {search ? (
            <button
              type="button"
              className="admissions-list-toolbar__search-clear"
              onClick={clearSearch}
              aria-label={t('admin.admissions.filters.clearSearch')}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>

        <div
          className="admissions-list-toolbar__controls"
          role="group"
          aria-label={t('admin.admissions.filters.groups')}
        >
          <select
            className="input admissions-list-toolbar__state"
            value={stateFilter}
            onChange={(e) => applyStateFilter(e.target.value as AdmissionUiStage | '')}
            aria-label={t('admin.admissions.filters.stage')}
            data-testid="admissions-filter-stage"
          >
            <option value="">{t('admin.admissions.filters.allStages')}</option>
            {ALL_UI_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {t(`admin.admissions.uiStages.${stage}`)}
              </option>
            ))}
          </select>

          <select
            className="input admissions-list-toolbar__state"
            value={registrationSelectValue}
            onChange={(e) =>
              applyOutcomeFilter(e.target.value as AdmissionOutcomeFilter)
            }
            aria-label={t('admin.admissions.filters.registrationOutcome')}
            data-testid="admissions-filter-registration"
          >
            <option value="">{t('admin.admissions.filters.allRegistrationOutcomes')}</option>
            {REGISTRATION_OUTCOME_OPTIONS.filter(Boolean).map((value) => (
              <option key={value} value={value}>
                {t(admissionOutcomeFilterLabelKey(value) ?? '')}
              </option>
            ))}
          </select>

          <select
            className="input admissions-list-toolbar__state"
            value={offerSelectValue}
            onChange={(e) =>
              applyOfferStateFilter(e.target.value as OfferStateFilter)
            }
            aria-label={t('admin.admissions.filters.offerState')}
            data-testid="admissions-filter-offer"
          >
            <option value="">{t('admin.admissions.filters.allOfferStates')}</option>
            <option value="draft">{t('admin.admissions.offerStates.draft')}</option>
            <option value="sent">{t('admin.admissions.offerStates.sentLabel')}</option>
            <option value="accepted">{t('admin.admissions.offerStates.acceptedFamily')}</option>
            <option value="declined">{t('admin.admissions.offerStates.familyDeclined')}</option>
            <option value="expired">{t('admin.admissions.offerStates.familyExpired')}</option>
            <option value="cancelled">{t('admin.admissions.offerStates.cancelled')}</option>
          </select>
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

      {hasActiveFilters ? (
        <div
          className="admissions-list-active-filters"
          aria-live="polite"
          data-testid="admissions-active-filters"
        >
          {debouncedSearch.trim() ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              onClick={clearSearch}
            >
              {t('admin.admissions.filters.chipSearch', { query: debouncedSearch.trim() })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {stateFilter ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              onClick={() => applyStateFilter('')}
              data-testid="chip-stage"
            >
              {t('admin.admissions.filters.chipState', {
                state: t(`admin.admissions.uiStages.${stateFilter}`),
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {outcomeFilter ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              onClick={() => applyOutcomeFilter('')}
              data-testid="chip-outcome"
            >
              {t('admin.admissions.filters.chipOutcome', {
                outcome: t(admissionOutcomeFilterLabelKey(outcomeFilter) ?? ''),
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {offerStateFilter &&
          outcomeFilter !== 'family_declined' &&
          outcomeFilter !== 'expired_offer' ? (
            <button
              type="button"
              className="admissions-list-active-filters__chip"
              onClick={() => applyOfferStateFilter('')}
              data-testid="chip-offer"
            >
              {t('admin.admissions.filters.chipOffer', {
                offer: t(`admin.admissions.offerStates.${offerStateFilter}`),
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
        ) : visibleSummary === 0 ? (
          listEmptyState
        ) : (
          <AdmissionsKanban
            columns={filteredKanbanGrouped}
            displayStages={kanbanDisplayStages}
            showClosed={includeClosed || stateFilter === CLOSED_UI_STAGE}
            onUpdated={reloadCurrentView}
            onLoadMore={handleKanbanLoadMore}
            selectionMode={selectionMode}
            isSelected={isSelected}
            onToggleSelect={toggle}
          />
        )
      ) : (
        <div
          className={cn(
            'admissions-list-results',
            tableState.fetching && !tableState.initialLoading && 'admissions-list-results--fetching',
          )}
          aria-busy={tableState.fetching || undefined}
        >
          <ResourceView
            state={tableState}
            isEmpty={() => filteredTableRows.length === 0}
            empty={listEmptyState}
          >
            {() => (
              <AdmissionsTable
                items={filteredTableRows}
                onUpdated={reloadCurrentView}
                selectionMode={selectionMode}
                isSelected={isSelected}
                onToggleSelect={toggle}
                onToggleVisible={() => toggleVisible(tableVisibleIds)}
                visibleSelectionState={tableVisibleSelection}
              />
            )}
          </ResourceView>
        </div>
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
            {includeClosed && outcomeFilterNeedsClosed(outcomeFilter) ? (
              <span className="admissions-list-footer__stat admissions-list-footer__stat--muted">
                {t('admin.admissions.filters.includingClosed')}
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
