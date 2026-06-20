'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { ResourceView } from '@/components/states/resource';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { AdmissionListItem, AdmissionsDashboard } from '@/types/admission';
import type { ListParams } from '@/types/api';
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

  useEffect(() => {
    /* reset not needed for kanban — full list */
  }, [debouncedSearch, stateFilter]);

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
  const dashboardState = useAdminResource<AdmissionsDashboard>(
    endpoints.admin.admissionsDashboard,
  );

  const items = listState.data ?? [];

  return (
    <div className="admissions-page">
      <PageHeader
        title={t('admin.admissions.title')}
        subtitle={t('admin.admissions.subtitle')}
        actions={
          <Link href="/admin/admissions/new" className="btn btn--primary">
            {t('admin.admissions.createButton')}
          </Link>
        }
      />

      {dashboardState.data && !dashboardState.error && (
        <AdmissionsDashboardSummary data={dashboardState.data} />
      )}
      {dashboardState.loading && !dashboardState.data && (
        <div className="muted">{t('common.loading')}</div>
      )}

      <div className="admissions-toolbar">
        <div className="admissions-toolbar__filters">
          <input
            className="input"
            type="search"
            placeholder={t('admin.admissions.filters.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('admin.admissions.filters.search')}
          />
          <select
            className="input"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            aria-label={t('admin.admissions.filters.state')}
          >
            <option value="">{t('common.allStatuses')}</option>
            {ALL_KANBAN_STATES.map((state) => (
              <option key={state} value={state}>
                {t(`admin.admissions.states.${state}`)}
              </option>
            ))}
          </select>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
            />
            {t('admin.admissions.filters.showClosed')}
          </label>
        </div>

        <div className="admissions-view-toggle" role="group" aria-label={t('admin.admissions.viewMode')}>
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

      <ResourceView state={listState}>
        {(rows) =>
          view === 'kanban' ? (
            <AdmissionsKanban items={rows} showClosed={showClosed} />
          ) : (
            <AdmissionsTable items={rows} />
          )
        }
      </ResourceView>
    </div>
  );
}
