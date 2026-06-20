'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { InfoBanner } from '@/components/ui/primitives';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { AdmissionListItem, AdmissionsDashboard } from '@/types/admission';
import type { ListParams } from '@/types/api';
import { buildAdmissionsDashboardFromList } from '../utils/admission-dashboard-from-list';
import { AdmissionsDashboardSummary } from './admissions-dashboard-summary';
import { AdmissionsKanban } from './admissions-kanban';
import { AdmissionsTable } from './admissions-table';
import { ALL_KANBAN_STATES } from '../utils/admission-labels';
import '../admissions.css';

type ViewMode = 'kanban' | 'table';

export function AdmissionsListPage() {
  const t = useT();
  const [view, setView] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);

  const listParams: ListParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      state: stateFilter || undefined,
      page_size: 200,
    }),
    [debouncedSearch, stateFilter],
  );

  const listState = useAdminResource<AdmissionListItem[]>(
    endpoints.admin.admissions,
    listParams,
  );

  const [dashboardApiEnabled, setDashboardApiEnabled] = useState(true);
  const dashboardState = useAdminResource<AdmissionsDashboard>(
    dashboardApiEnabled ? endpoints.admin.admissionsDashboard : null,
  );

  useEffect(() => {
    if (dashboardState.error && dashboardApiEnabled) {
      setDashboardApiEnabled(false);
    }
  }, [dashboardState.error, dashboardApiEnabled]);

  const dashboardData = useMemo(() => {
    if (dashboardState.data) return dashboardState.data;
    if (listState.data?.length) return buildAdmissionsDashboardFromList(listState.data);
    return null;
  }, [dashboardState.data, listState.data]);

  const dashboardFromFallback = !dashboardState.data && !!listState.data && !!dashboardState.error;

  function retryDashboard() {
    setDashboardApiEnabled(true);
    dashboardState.reload();
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
        <>
          {dashboardFromFallback ? (
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
          <AdmissionsDashboardSummary data={dashboardData} />
        </>
      ) : dashboardState.loading && dashboardApiEnabled ? (
        <div className="muted">{t('common.loading')}</div>
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

      <ResourceView state={listState}>
        {(rows) =>
          view === 'kanban' ? (
            <AdmissionsKanban items={rows} showClosed={showClosed} onUpdated={listState.reload} />
          ) : (
            <AdmissionsTable items={rows} onUpdated={listState.reload} />
          )
        }
      </ResourceView>
    </div>
  );
}
