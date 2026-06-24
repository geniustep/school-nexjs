'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { Pagination } from '@/components/tables/data-table';
import { InfoBanner } from '@/components/ui/primitives';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { AdmissionListItem, AdmissionsDashboard } from '@/types/admission';
import type { ListParams } from '@/types/api';
import { useAdmissionsKanbanBoard } from '../hooks/use-admissions-kanban-board';
import { AdmissionsDashboardSummary } from './admissions-dashboard-summary';
import { AdmissionsKanban } from './admissions-kanban';
import { AdmissionsTable } from './admissions-table';
import { ACTIVE_KANBAN_STATES, ALL_KANBAN_STATES, CLOSED_KANBAN_STATES } from '../utils/admission-labels';
import '../admissions.css';

type ViewMode = 'kanban' | 'table';

const TABLE_PAGE_SIZE = 25;

export function AdmissionsListPage() {
  const t = useT();
  const [view, setView] = useState<ViewMode>('kanban');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);

  const displayStates = showClosed
    ? [...ACTIVE_KANBAN_STATES, ...CLOSED_KANBAN_STATES]
    : ACTIVE_KANBAN_STATES;
  const fetchStates = stateFilter ? [stateFilter] : displayStates;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, view, showClosed]);

  const tableParams: ListParams = useMemo(
    () => ({
      page,
      page_size: TABLE_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      state: stateFilter || undefined,
    }),
    [page, debouncedSearch, stateFilter],
  );

  const tableState = useAdminResource<AdmissionListItem[]>(
    view === 'table' ? endpoints.admin.admissions : null,
    tableParams,
  );

  const kanbanBoard = useAdmissionsKanbanBoard({
    columns: fetchStates,
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

  function retryDashboard() {
    setDashboardApiEnabled(true);
    dashboardState.reload();
  }

  function handleKpiClick(key: keyof AdmissionsDashboard) {
    if (key === 'total_open') {
      setStateFilter('');
      setShowClosed(false);
      return;
    }
    if (key === 'lost_count') {
      setStateFilter('lost');
      setShowClosed(true);
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
        <Link href="/admin/admissions/new" className="btn btn--primary admissions-list-header__cta">
          {t('admin.admissions.createButton')}
        </Link>
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

      <div className="card admissions-list-toolbar">
        <div className="admissions-list-toolbar__row">
          <div className="admissions-list-toolbar__filters">
            <input
              className="input admissions-list-toolbar__search"
              type="search"
              placeholder={t('admin.admissions.filters.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('admin.admissions.filters.search')}
            />
            <select
              className="input admissions-list-toolbar__state"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              aria-label={t('admin.admissions.filters.state')}
            >
              <option value="">{t('admin.admissions.filters.allStates')}</option>
              {ALL_KANBAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {t(`admin.admissions.states.${state}`)}
                </option>
              ))}
            </select>
            <label className="admissions-list-toolbar__closed checkbox-row">
              <input
                type="checkbox"
                checked={showClosed}
                onChange={(e) => setShowClosed(e.target.checked)}
              />
              <span>{t('admin.admissions.filters.showClosed')}</span>
            </label>
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
        </div>
      </div>

      {view === 'kanban' ? (
        kanbanBoard.initialLoading ? (
          <div className="muted">{t('common.loading')}</div>
        ) : kanbanBoard.error ? (
          <div className="alert alert--error">{kanbanBoard.error.message}</div>
        ) : (
          <AdmissionsKanban
            columns={kanbanBoard.grouped}
            displayStates={displayStates}
            showClosed={showClosed}
            onUpdated={reloadCurrentView}
            onLoadMore={kanbanBoard.loadMore}
          />
        )
      ) : (
        <ResourceView state={tableState}>
          {(rows) => (
            <>
              <AdmissionsTable items={rows} onUpdated={reloadCurrentView} />
              {tablePagination ? (
                <Pagination
                  page={tablePagination.page}
                  pageSize={tablePagination.page_size}
                  totalPages={tablePagination.total_pages}
                  total={tablePagination.total}
                  onPage={setPage}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      )}
    </div>
  );
}
