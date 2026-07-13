'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { ReferenceJathathaEditorDialog } from '@/features/admin/teaching-planning/components/reference-jathatha-dialogs';
import { TeachingPlanningAcademicListFilters } from '@/features/admin/teaching-planning/components/teaching-planning-academic-list-filters';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { TeachingPlanningListBack } from '@/features/admin/teaching-planning/components/teaching-planning-list-back';
import { normalizeReferenceJathathas } from '@/features/admin/teaching-planning/utils/normalize-jathatha';
import {
  TEACHING_PLANNING_PAGE_SIZE,
  teachingPlanningListHasActiveQuery,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { canManageReferenceJathathas } from '@/lib/permissions/teaching-planning';
import { REFERENCE_JATHATHA_STATES, type ReferenceJathathaSummary } from '@/types/jathatha';
import '@/features/admin/teaching-planning/teaching-planning.css';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

export function ReferenceJathathasListPage() {
  const t = useT();
  const router = useRouter();
  const user = useSession();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [levelId, setLevelId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, stateFilter, levelId, subjectId]);

  const list = useAdminResource<unknown>(endpoints.admin.referenceJathathas, {
    page,
    page_size: TEACHING_PLANNING_PAGE_SIZE,
    state: stateFilter || undefined,
    level_id: levelId || undefined,
    subject_id: subjectId || undefined,
  });

  const rows = useMemo(
    () =>
      normalizeReferenceJathathas(list.data).filter((row) =>
        [row.name, row.reference?.name, row.sequence?.name, row.session_template?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [list.data, search],
  );

  const hasActiveQuery = teachingPlanningListHasActiveQuery({
    search,
    state: stateFilter,
    levelId,
    subjectId,
  });

  const resetFilters = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setLevelId('');
    setSubjectId('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const selectedStateLabel = stateFilter
    ? t(`admin.teachingPlanning.jathatha.referenceStates.${stateFilter}`)
    : null;
  const stateOptions = useMemo(
    () =>
      REFERENCE_JATHATHA_STATES.map((item) => ({
        value: item,
        label: t(`admin.teachingPlanning.jathatha.referenceStates.${item}`),
      })),
    [t],
  );

  const columns: Column<ReferenceJathathaSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.teachingPlanning.jathatha.columns.name'),
        render: (row) => (
          <div className="tp-list__identity">
            <strong className="tp-list__name" dir="auto" title={row.name}>
              {row.name}
            </strong>
          </div>
        ),
      },
      {
        key: 'reference',
        header: t('admin.teachingPlanning.columns.reference'),
        render: (row) => row.reference?.name ?? t('common.dash'),
      },
      {
        key: 'sequenceTemplate',
        header: `${t('admin.teachingPlanning.jathatha.sequence')} / ${t('admin.teachingPlanning.jathatha.template')}`,
        render: (row) => (
          <div className="tp-list__meta">
            <span dir="auto">{row.sequence?.name ?? t('common.dash')}</span>
            {row.session_template?.name ? (
              <span dir="auto">{row.session_template.name}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'academic',
        header: t('admin.teachingPlanning.columns.levelAndSubject'),
        render: (row) => (
          <div className="tp-list__meta">
            <span dir="auto">{row.level?.name ?? t('common.dash')}</span>
            <span dir="auto">{row.subject?.name ?? t('common.dash')}</span>
          </div>
        ),
      },
      {
        key: 'counts',
        header: t('admin.teachingPlanning.jathatha.columns.activities'),
        render: (row) => (
          <>
            <bdi dir="ltr">{row.activity_count}</bdi> / <bdi dir="ltr">{row.phase_count}</bdi>
          </>
        ),
      },
      {
        key: 'state',
        header: t('admin.teachingPlanning.columns.state'),
        render: (row) => <WorkflowBadge state={row.state} />,
      },
      {
        key: 'version',
        header: t('admin.teachingPlanning.fields.versionLabel'),
        render: (row) =>
          row.version_label ? (
            <Badge tone="slate">
              <bdi dir="ltr">{row.version_label}</bdi>
            </Badge>
          ) : (
            t('common.dash')
          ),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (row) => (
          <div className="tp-list__row-actions" onClick={(event) => event.stopPropagation()}>
            <Link
              href={`/admin/teaching-planning/reference-jathathas/${row.id}`}
              className="tp-list__view-link"
              aria-label={t('common.view')}
              title={t('common.view')}
            >
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        ),
      },
    ],
    [t],
  );

  const pg = list.meta?.pagination;
  const canCreate = canManageReferenceJathathas(user);

  const listEmptyState = (
    <EmptyState
      icon="📝"
      title={t('admin.teachingPlanning.jathatha.list.empty')}
      action={
        hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.teachingPlanning.filters.reset')}
          </button>
        ) : canCreate ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setCreateOpen(true)}
          >
            + {t('admin.teachingPlanning.jathatha.reference.create')}
          </button>
        ) : undefined
      }
    />
  );

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace tp-list-page">
        <TeachingPlanningListBack />

        <PageHeader
          title={t('admin.teachingPlanning.hub.referenceJathathaTitle')}
          subtitle={t('admin.teachingPlanning.hub.referenceJathathaDesc')}
          actions={
            canCreate ? (
              <div className="tp-list__header-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setCreateOpen(true)}
                >
                  + {t('admin.teachingPlanning.jathatha.reference.create')}
                </button>
              </div>
            ) : undefined
          }
        />

        <TeachingPlanningAcademicListFilters
          search={search}
          stateFilter={stateFilter}
          levelId={levelId}
          subjectId={subjectId}
          stateOptions={stateOptions}
          hasActiveFilters={hasActiveQuery}
          onSearchChange={setSearch}
          onSearchClear={clearSearch}
          onStateFilterChange={setStateFilter}
          onLevelIdChange={setLevelId}
          onSubjectIdChange={setSubjectId}
          onReset={resetFilters}
          selectedStateLabel={selectedStateLabel}
        />

        {list.fetching ? (
          <p className="tp-list__fetching-hint" aria-live="polite">
            {t('admin.teachingPlanning.offerings.refetching')}
          </p>
        ) : null}

        <div
          className={
            list.fetching ? 'tp-list__results tp-list__results--fetching' : 'tp-list__results'
          }
          aria-busy={list.fetching || undefined}
        >
          <ResourceView state={{ ...list, data: rows }} loadingLabel={t('common.loading')}>
            {(data) =>
              data.length ? (
                <>
                  <div className="tp-list__table">
                    <DataTable
                      columns={columns}
                      rows={data}
                      rowKey={(row) => row.id}
                      onRowClick={(row) =>
                        router.push(`/admin/teaching-planning/reference-jathathas/${row.id}`)
                      }
                    />
                  </div>
                  {pg ? (
                    <Pagination
                      page={pg.page ?? page}
                      pageSize={pg.page_size ?? TEACHING_PLANNING_PAGE_SIZE}
                      total={pg.total ?? data.length}
                      totalPages={pg.total_pages ?? 1}
                      onPage={setPage}
                    />
                  ) : null}
                </>
              ) : (
                listEmptyState
              )
            }
          </ResourceView>
        </div>

        <ReferenceJathathaEditorDialog
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={(item) => router.push(`/admin/teaching-planning/reference-jathathas/${item.id}`)}
        />
      </div>
    </RequireTeachingPlanningAccess>
  );
}
