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
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { TeachingPlanningListBack } from '@/features/admin/teaching-planning/components/teaching-planning-list-back';
import { TeachingPlanningListSearch } from '@/features/admin/teaching-planning/components/teaching-planning-list-search';
import { normalizeTeacherJathathas } from '@/features/admin/teaching-planning/utils/normalize-jathatha';
import {
  TEACHING_PLANNING_PAGE_SIZE,
  teachingPlanningListHasActiveQuery,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  TEACHER_JATHATHA_REVIEW_STATES,
  TEACHER_JATHATHA_STATES,
  type TeacherJathathaSummary,
} from '@/types/jathatha';
import '@/features/admin/teaching-planning/teaching-planning.css';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

export function TeacherJathathasReviewListPage() {
  const t = useT();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState('');

  useEffect(() => {
    setPage(1);
  }, [search, stateFilter, reviewFilter]);

  const state = useAdminResource<unknown>(endpoints.admin.teacherJathathasAdmin, {
    page,
    page_size: TEACHING_PLANNING_PAGE_SIZE,
    state: stateFilter || undefined,
    review_state: reviewFilter || undefined,
  });

  const rows = useMemo(
    () =>
      normalizeTeacherJathathas(state.data).filter((row) =>
        [row.name, row.teacher?.name, row.class?.name, row.subject?.name, row.sequence?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [state.data, search],
  );

  const hasActiveQuery = teachingPlanningListHasActiveQuery({ search, state: stateFilter });
  const hasReviewFilter = Boolean(reviewFilter);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setReviewFilter('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const selectedStateLabel = stateFilter
    ? t(`admin.teachingPlanning.jathatha.teacherStates.${stateFilter}`)
    : null;
  const selectedReviewLabel = reviewFilter
    ? t(`admin.teachingPlanning.jathatha.reviewStates.${reviewFilter}`)
    : null;

  const columns: Column<TeacherJathathaSummary>[] = useMemo(
    () => [
      {
        key: 'session',
        header: t('admin.teachingPlanning.jathatha.columns.session'),
        render: (row) => (
          <bdi dir="ltr">
            {[row.session_date, row.session_start_time, row.session_end_time]
              .filter(Boolean)
              .join(' ') || '—'}
          </bdi>
        ),
      },
      {
        key: 'teacher',
        header: t('admin.teachingPlanning.jathatha.columns.teacher'),
        render: (row) => row.teacher?.name ?? t('common.dash'),
      },
      {
        key: 'class',
        header: t('admin.teachingPlanning.jathatha.columns.class'),
        render: (row) => row.class?.name ?? t('common.dash'),
      },
      {
        key: 'subject',
        header: t('admin.teachingPlanning.columns.subject'),
        render: (row) => row.subject?.name ?? t('common.dash'),
      },
      {
        key: 'state',
        header: t('admin.teachingPlanning.columns.state'),
        render: (row) => <WorkflowBadge state={row.state} />,
      },
      {
        key: 'review',
        header: t('admin.teachingPlanning.jathatha.columns.reviewState'),
        render: (row) => <WorkflowBadge state={row.review_state} />,
      },
      {
        key: 'readiness',
        header: t('admin.teachingPlanning.jathatha.readiness.title'),
        render: (row) => (
          <Badge tone={row.readiness?.ready ? 'green' : 'amber'}>
            {row.readiness?.ready
              ? t('admin.teachingPlanning.jathatha.readiness.ready')
              : t('admin.teachingPlanning.jathatha.readiness.notReady')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (row) => (
          <div className="tp-list__row-actions" onClick={(event) => event.stopPropagation()}>
            <Link
              href={`/admin/teaching-planning/teacher-jathathas/${row.id}`}
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

  const pg = state.meta?.pagination;

  const listEmptyState = (
    <EmptyState
      icon="🔎"
      title={t('admin.teachingPlanning.jathatha.list.empty')}
      action={
        hasActiveQuery || hasReviewFilter ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.teachingPlanning.filters.reset')}
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
          title={t('admin.teachingPlanning.hub.teacherJathathaReviewTitle')}
          subtitle={t('admin.teachingPlanning.hub.teacherJathathaReviewDesc')}
        />

        <div className="tp-list-filters">
          <div className="tp-list-filters__primary">
            <TeachingPlanningListSearch
              value={search}
              onChange={setSearch}
              onClear={clearSearch}
              placeholder={t('admin.teachingPlanning.filters.searchPlaceholder')}
              label={t('admin.teachingPlanning.filters.searchPlaceholder')}
            />

            <select
              className="select"
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
              aria-label={t('admin.teachingPlanning.columns.state')}
            >
              <option value="">{t('admin.teachingPlanning.filters.stateAll')}</option>
              {TEACHER_JATHATHA_STATES.map((item) => (
                <option key={item} value={item}>
                  {t(`admin.teachingPlanning.jathatha.teacherStates.${item}`)}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={reviewFilter}
              onChange={(event) => setReviewFilter(event.target.value)}
              aria-label={t('admin.teachingPlanning.jathatha.columns.reviewState')}
            >
              <option value="">{t('admin.teachingPlanning.jathatha.review.all')}</option>
              {TEACHER_JATHATHA_REVIEW_STATES.map((item) => (
                <option key={item} value={item}>
                  {t(`admin.teachingPlanning.jathatha.reviewStates.${item}`)}
                </option>
              ))}
            </select>

            {hasActiveQuery || hasReviewFilter ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
                {t('admin.teachingPlanning.filters.reset')}
              </button>
            ) : null}
          </div>

          {hasActiveQuery || hasReviewFilter ? (
            <div className="tp-list-filters__chips" aria-live="polite">
              {search.trim() ? (
                <button
                  type="button"
                  className="tp-list-filters__chip tp-list-filters__chip--action"
                  onClick={clearSearch}
                >
                  {t('admin.teachingPlanning.filters.chipSearch', { query: search.trim() })}
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
              {selectedStateLabel ? (
                <button
                  type="button"
                  className="tp-list-filters__chip tp-list-filters__chip--action"
                  onClick={() => setStateFilter('')}
                >
                  {t('admin.teachingPlanning.filters.chipState', { status: selectedStateLabel })}
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
              {selectedReviewLabel ? (
                <button
                  type="button"
                  className="tp-list-filters__chip tp-list-filters__chip--action"
                  onClick={() => setReviewFilter('')}
                >
                  {t('admin.teachingPlanning.filters.chipState', { status: selectedReviewLabel })}
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {state.fetching ? (
          <p className="tp-list__fetching-hint" aria-live="polite">
            {t('admin.teachingPlanning.offerings.refetching')}
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
              data.length ? (
                <>
                  <div className="tp-list__table">
                    <DataTable
                      columns={columns}
                      rows={data}
                      rowKey={(row) => row.id}
                      onRowClick={(row) =>
                        router.push(`/admin/teaching-planning/teacher-jathathas/${row.id}`)
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
      </div>
    </RequireTeachingPlanningAccess>
  );
}
