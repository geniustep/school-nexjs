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
import { PageHeader } from '@/components/ui/primitives';
import { TeachingReferenceEditorDialog } from '@/features/admin/teaching-planning/components/teaching-reference-dialogs';
import { TeachingPlanningAcademicListFilters } from '@/features/admin/teaching-planning/components/teaching-planning-academic-list-filters';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { TeachingPlanningListBack } from '@/features/admin/teaching-planning/components/teaching-planning-list-back';
import {
  TEACHING_PLANNING_PAGE_SIZE,
  TEACHING_PLANNING_STATE_OPTIONS,
  filterTeachingReferencesClient,
  resolveTeachingPlanningListEmptyVariant,
  teachingPlanningListHasActiveQuery,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { normalizeTeachingReferences } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canManageTeachingReferences } from '@/lib/permissions/teaching-planning';
import type { ListParams } from '@/types/api';
import type { TeachingReferenceSummary } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

function stateLabel(t: (key: string) => string, value: string): string {
  const global = t(`states.${value}`);
  if (global !== `states.${value}`) return global;
  return t(`admin.teachingPlanning.states.${value}`);
}

export function TeachingReferencesListPage() {
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
  }, [stateFilter, levelId, subjectId, search]);

  const hasActiveQuery = teachingPlanningListHasActiveQuery({
    search,
    state: stateFilter,
    levelId,
    subjectId,
  });
  const emptyVariant = resolveTeachingPlanningListEmptyVariant({ hasActiveQuery });

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: TEACHING_PLANNING_PAGE_SIZE,
      state: stateFilter || undefined,
      level_id: levelId || undefined,
      subject_id: subjectId || undefined,
    }),
    [page, stateFilter, levelId, subjectId],
  );

  const state = useAdminResource(endpoints.admin.teachingReferences, params);
  const rows = useMemo(
    () => filterTeachingReferencesClient(normalizeTeachingReferences(state.data), search),
    [state.data, search],
  );
  const pg = state.meta?.pagination;
  const canCreate = canManageTeachingReferences(user);

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

  const selectedStateLabel = stateFilter ? stateLabel(t, stateFilter) : null;
  const stateOptions = useMemo(
    () =>
      TEACHING_PLANNING_STATE_OPTIONS.map((value) => ({
        value,
        label: stateLabel(t, value),
      })),
    [t],
  );

  const columns: Column<TeachingReferenceSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.teachingPlanning.columns.name'),
        render: (row) => (
          <div className="tp-list__identity">
            <strong className="tp-list__name" dir="auto" title={row.name}>
              {row.name}
            </strong>
          </div>
        ),
      },
      {
        key: 'level',
        header: t('admin.teachingPlanning.columns.level'),
        render: (row) => row.level.name,
      },
      {
        key: 'subject',
        header: t('admin.teachingPlanning.columns.subject'),
        render: (row) => row.subject.name,
      },
      {
        key: 'language',
        header: t('admin.teachingPlanning.columns.language'),
        render: (row) =>
          row.teaching_language
            ? `${row.teaching_language.name} (${row.teaching_language.code})`
            : t('common.dash'),
      },
      {
        key: 'state',
        header: t('admin.teachingPlanning.columns.state'),
        render: (row) => <WorkflowBadge state={row.state} />,
      },
      {
        key: 'offering_count',
        header: t('admin.teachingPlanning.columns.offeringCount'),
        render: (row) => String(row.offering_count),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (row) => (
          <div className="tp-list__row-actions" onClick={(event) => event.stopPropagation()}>
            <Link
              href={`/admin/teaching-planning/references/${row.id}`}
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

  const listEmptyState =
    emptyVariant === 'noMatch' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.teachingPlanning.references.list.noMatch.title')}
        description={t('admin.teachingPlanning.references.list.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.teachingPlanning.filters.reset')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📚"
        title={t('admin.teachingPlanning.references.list.noData.title')}
        description={t('admin.teachingPlanning.references.list.noData.description')}
        action={
          canCreate ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setCreateOpen(true)}
            >
              + {t('admin.teachingPlanning.references.create.open')}
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
          title={t('admin.teachingPlanning.references.title')}
          subtitle={
            pg
              ? t('admin.teachingPlanning.references.subtitleWithCount', { total: pg.total })
              : t('admin.teachingPlanning.references.subtitle')
          }
          actions={
            canCreate ? (
              <div className="tp-list__header-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setCreateOpen(true)}
                >
                  + {t('admin.teachingPlanning.references.create.open')}
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

        {state.fetching ? (
          <p className="tp-list__fetching-hint" aria-live="polite">
            {t('admin.teachingPlanning.references.refetching')}
          </p>
        ) : null}

        <div
          className={
            state.fetching ? 'tp-list__results tp-list__results--fetching' : 'tp-list__results'
          }
          aria-busy={state.fetching || undefined}
        >
          <ResourceView state={{ ...state, data: rows }} loadingLabel={t('common.loading')}>
            {(data) =>
              data.length === 0 ? (
                listEmptyState
              ) : (
                <>
                  <div className="tp-list__table">
                    <DataTable
                      columns={columns}
                      rows={data}
                      rowKey={(row) => row.id}
                      onRowClick={(row) =>
                        router.push(`/admin/teaching-planning/references/${row.id}`)
                      }
                    />
                  </div>
                  {pg ? (
                    <Pagination
                      page={pg.page ?? page}
                      pageSize={pg.page_size ?? TEACHING_PLANNING_PAGE_SIZE}
                      total={pg.total ?? data.length}
                      totalPages={
                        pg.total_pages ??
                        Math.max(
                          1,
                          Math.ceil(
                            (pg.total ?? data.length) /
                              (pg.page_size ?? TEACHING_PLANNING_PAGE_SIZE),
                          ),
                        )
                      }
                      onPage={setPage}
                    />
                  ) : null}
                </>
              )
            }
          </ResourceView>
        </div>

        <TeachingReferenceEditorDialog
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={(item) => {
            setCreateOpen(false);
            router.push(`/admin/teaching-planning/references/${item.id}`);
          }}
        />
      </div>
    </RequireTeachingPlanningAccess>
  );
}
