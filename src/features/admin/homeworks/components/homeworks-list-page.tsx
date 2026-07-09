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
import { HomeworksListFilters } from '@/features/admin/homeworks/components/homeworks-list-filters';
import {
  formatHomeworkListDate,
  HOMEWORKS_PAGE_SIZE,
  homeworksListHasActiveQuery,
  resolveHomeworksListEmptyVariant,
} from '@/features/admin/homeworks/utils/homeworks-list-present';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useSession } from '@/features/auth/session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import { hasPermission } from '@/lib/permissions/permissions';
import type { ListParams } from '@/types/api';
import type { AdminHomeworkSummary } from '@/types/homework';
import '@/features/admin/homeworks/homeworks-list.css';

function readInitialClassId(searchParams: URLSearchParams | null): string {
  const raw = searchParams?.get('class_id')?.trim() ?? '';
  return raw || '';
}

export function HomeworksListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSession();
  const { formatDate } = useFormat();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [classId, setClassId] = useState(() => readInitialClassId(searchParams));
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classId, stateFilter]);

  const appliedSearch = debouncedSearch.trim();
  const hasActiveQuery = homeworksListHasActiveQuery({
    search: appliedSearch,
    classId,
    stateFilter,
  });
  const hasActiveFilters = homeworksListHasActiveQuery({
    search,
    classId,
    stateFilter,
  });

  const params: ListParams = {
    page,
    page_size: HOMEWORKS_PAGE_SIZE,
    search: appliedSearch || undefined,
    class_id: classId || undefined,
    state: stateFilter || undefined,
  };

  const state = useAdminResource<AdminHomeworkSummary[]>(endpoints.admin.homeworks, params);
  const classesState = useAdminResource<import('@/types/class').SchoolClass[]>(endpoints.admin.classes);
  const pg = state.meta?.pagination;

  const canAddHomework = canShowAcademicListAdd(user, {
    legacyPermission: 'manage_homeworks',
    capability: 'manage_homeworks',
  });
  const canShowListActions =
    canAddHomework || hasPermission(user, 'export_data');

  const resetFilters = useCallback(() => {
    setSearch('');
    setClassId('');
    setStateFilter('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const emptyVariant = resolveHomeworksListEmptyVariant({ hasActiveQuery });

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.homeworksList.noMatch.title')}
        description={t('admin.homeworksList.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.homeworksList.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📝"
        title={t('admin.homeworksList.noData.title')}
        description={t('admin.homeworksList.noData.description')}
        action={
          canAddHomework ? (
            <Link href="/admin/homeworks/new" className="btn btn--primary btn--sm">
              {t('admin.addHomework')}
            </Link>
          ) : undefined
        }
      />
    );

  const columns: Column<AdminHomeworkSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('academic.homework'),
        render: (h) => (
          <strong className="homeworks-list__title" dir="auto" title={h.name}>
            {h.name}
          </strong>
        ),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (h) => {
          const label = h.class?.name ?? t('common.dash');
          return (
            <span className="homeworks-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (h) => {
          const label = h.subject?.name ?? t('common.dash');
          return (
            <span className="homeworks-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'teacher',
        header: t('academic.teacher'),
        render: (h) => {
          const label = h.teacher?.name ?? t('common.dash');
          return (
            <span className="homeworks-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (h) => <WorkflowBadge state={h.state} />,
      },
      {
        key: 'publish_date',
        header: t('academic.publishDate'),
        render: (h) => (
          <span className="homeworks-list__date" dir="ltr">
            {formatHomeworkListDate(h.publish_date, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'deadline',
        header: t('academic.deadline'),
        render: (h) => (
          <span className="homeworks-list__date" dir="ltr">
            {formatHomeworkListDate(h.deadline, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'submissions',
        header: t('academic.homeworkSubmissions'),
        render: (h) => (
          <span className="homeworks-list__date" dir="ltr">
            {h.submission_count ?? 0}
          </span>
        ),
      },
      {
        key: 'attachments',
        header: t('academic.attachments'),
        render: (h) => <AttachmentListIndicator item={h} showName={false} compact />,
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (h) => (
          <div className="homeworks-list__row-actions" onClick={(event) => event.stopPropagation()}>
            <Link
              href={`/admin/homeworks/${h.id}`}
              className="homeworks-list__view-link"
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
    <div className="admin-workspace homeworks-list-page">
      <Link href="/admin/academic" className="back-link">
        ‹ {t('admin.academicCenter')}
      </Link>
      <PageHeader
        title={t('academic.homework')}
        subtitle={
          pg
            ? t('admin.homeworksList.subtitleWithCount', { total: pg.total })
            : t('admin.homeworkListDesc')
        }
        actions={
          canShowListActions ? (
            <div className="homeworks-list__header-actions">
              <AdminListActions
                addHref="/admin/homeworks/new"
                addLabel={t('admin.addHomework')}
                addCapability="manage_homeworks"
                managePermission="manage_homeworks"
                exportPath={endpoints.admin.homeworksExport}
                exportFilename="homeworks.csv"
              />
            </div>
          ) : null
        }
      />

      <HomeworksListFilters
        search={search}
        classId={classId}
        stateFilter={stateFilter}
        classes={classesState.data ?? []}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearch}
        onSearchClear={clearSearch}
        onClassIdChange={setClassId}
        onStateFilterChange={setStateFilter}
        onReset={resetFilters}
      />

      {state.fetching ? (
        <p className="homeworks-list__fetching-hint" aria-live="polite">
          {t('admin.homeworksList.refetching')}
        </p>
      ) : null}

      <div
        className={
          state.fetching
            ? 'homeworks-list__results homeworks-list__results--fetching'
            : 'homeworks-list__results'
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
              <div className="homeworks-list__table">
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(h) => h.id}
                  onRowClick={(h) => router.push(`/admin/homeworks/${h.id}`)}
                />
              </div>
              {pg ? (
                <Pagination
                  page={pg.page}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  pageSize={HOMEWORKS_PAGE_SIZE}
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
