'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { ResourcesListFilters } from '@/features/admin/resources/components/resources-list-filters';
import {
  formatResourceListDate,
  formatResourceTypeLabel,
  RESOURCES_PAGE_SIZE,
  resourcesListHasActiveQuery,
  resolveResourcesListEmptyVariant,
} from '@/features/admin/resources/utils/resources-list-present';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useSession } from '@/features/auth/session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import { hasPermission } from '@/lib/permissions/permissions';
import type { ListParams } from '@/types/api';
import type { ResourceSummary } from '@/types/resource';
import '@/features/admin/resources/resources-list.css';

function readInitialClassId(searchParams: URLSearchParams | null): string {
  const raw = searchParams?.get('class_id')?.trim() ?? '';
  return raw || '';
}

export function ResourcesListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSession();
  const { formatDate } = useFormat();

  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState(() => readInitialClassId(searchParams));
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const debouncedTypeFilter = useDebouncedValue(typeFilter, 400);

  useEffect(() => {
    setPage(1);
  }, [classId, stateFilter, debouncedTypeFilter]);

  const appliedTypeFilter = debouncedTypeFilter.trim();
  const hasActiveQuery = resourcesListHasActiveQuery({
    classId,
    stateFilter,
    typeFilter: appliedTypeFilter,
  });
  const hasActiveFilters = resourcesListHasActiveQuery({
    classId,
    stateFilter,
    typeFilter,
  });

  const params: ListParams = {
    page,
    page_size: RESOURCES_PAGE_SIZE,
    class_id: classId || undefined,
    state: stateFilter || undefined,
    resource_type: appliedTypeFilter || undefined,
  };

  const state = useAdminResource<ResourceSummary[]>(endpoints.admin.resources, params);
  const classesState = useAdminResource<import('@/types/class').SchoolClass[]>(endpoints.admin.classes);
  const pg = state.meta?.pagination;

  const canAddResource = canShowAcademicListAdd(user, {
    legacyPermission: 'manage_resources',
    capability: 'manage_resources',
  });
  const canShowListActions =
    canAddResource || hasPermission(user, 'export_data');

  const resetFilters = useCallback(() => {
    setClassId('');
    setStateFilter('');
    setTypeFilter('');
    setPage(1);
  }, []);

  const clearTypeFilter = useCallback(() => {
    setTypeFilter('');
    setPage(1);
  }, []);

  const emptyVariant = resolveResourcesListEmptyVariant({ hasActiveQuery });

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.resourcesList.noMatch.title')}
        description={t('admin.resourcesList.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.resourcesList.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📚"
        title={t('admin.resourcesList.noData.title')}
        description={t('admin.resourcesList.noData.description')}
        action={
          canAddResource ? (
            <Link href="/admin/resources/new" className="btn btn--primary btn--sm">
              {t('admin.addResource')}
            </Link>
          ) : undefined
        }
      />
    );

  const columns: Column<ResourceSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('academic.resources'),
        render: (r) => (
          <strong className="resources-list__title" dir="auto" title={r.name}>
            {r.name}
          </strong>
        ),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (r) => {
          const label = r.class?.name ?? t('common.dash');
          return (
            <span className="resources-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (r) => {
          const label = r.subject?.name ?? t('common.dash');
          return (
            <span className="resources-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'teacher',
        header: t('academic.teacher'),
        render: (r) => {
          const label = r.teacher?.name ?? t('common.dash');
          return (
            <span className="resources-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'type',
        header: t('academic.type'),
        render: (r) => (
          <span className="resources-list__type mono" dir="ltr" title={r.resource_type ?? undefined}>
            {formatResourceTypeLabel(r.resource_type, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (r) => <WorkflowBadge state={r.state} />,
      },
      {
        key: 'date',
        header: t('academic.publishDate'),
        render: (r) => (
          <span className="resources-list__date" dir="ltr">
            {formatResourceListDate(r.publish_date, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'attachments',
        header: t('academic.attachments'),
        render: (r) => (
          <div className="resources-list__attachments">
            <AttachmentListIndicator item={r} showName={false} compact />
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (r) => (
          <div className="resources-list__row-actions" onClick={(event) => event.stopPropagation()}>
            <Link
              href={`/admin/resources/${r.id}`}
              className="resources-list__view-link"
              aria-label={t('common.view')}
              title={t('common.view')}
            >
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        ),
      },
    ],
    [t, formatDate],
  );

  return (
    <div className="admin-workspace resources-list-page">
      <Link href="/admin/academic" className="back-link">
        ‹ {t('admin.academicCenter')}
      </Link>
      <PageHeader
        title={t('academic.resources')}
        subtitle={
          pg
            ? t('admin.resourcesList.subtitleWithCount', { total: pg.total })
            : t('admin.resourcesListDesc')
        }
        actions={
          canShowListActions ? (
            <div className="resources-list__header-actions">
              <AdminListActions
                addHref="/admin/resources/new"
                addLabel={t('admin.addResource')}
                addCapability="manage_resources"
                managePermission="manage_resources"
                exportPath={endpoints.admin.resourcesExport}
                exportFilename="resources.csv"
              />
            </div>
          ) : null
        }
      />

      <ResourcesListFilters
        classId={classId}
        stateFilter={stateFilter}
        typeFilter={typeFilter}
        classes={classesState.data ?? []}
        hasActiveFilters={hasActiveFilters}
        onClassIdChange={setClassId}
        onStateFilterChange={setStateFilter}
        onTypeFilterChange={setTypeFilter}
        onTypeFilterClear={clearTypeFilter}
        onReset={resetFilters}
      />

      {state.fetching ? (
        <p className="resources-list__fetching-hint" aria-live="polite">
          {t('admin.resourcesList.refetching')}
        </p>
      ) : null}

      <div
        className={
          state.fetching
            ? 'resources-list__results resources-list__results--fetching'
            : 'resources-list__results'
        }
        aria-busy={state.fetching || undefined}
      >
        <ResourceView
          state={state}
          loadingLabel={t('common.loading')}
          isEmpty={(rows) => rows.length === 0}
          empty={listEmptyState}
        >
          {(rows) => (
            <>
              <div className="resources-list__table">
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => router.push(`/admin/resources/${r.id}`)}
                />
              </div>
              {pg ? (
                <Pagination
                  page={pg.page}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  pageSize={RESOURCES_PAGE_SIZE}
                  onPage={setPage}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      </div>
    </div>
  );
}
