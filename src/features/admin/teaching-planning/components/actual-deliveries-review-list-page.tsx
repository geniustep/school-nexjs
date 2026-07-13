'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Actual Delivery Review — admin surface.
 * Semantic guard: Actual Delivery Record ≠ Teacher Jathatha ≠ Class Journal
 * Entry. Admin reviews the record as submitted; it never edits its content
 * here (see actual-delivery-review-detail-view.tsx for the read-only detail).
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PermissionDeniedState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { TeachingPlanningListBack } from '@/features/admin/teaching-planning/components/teaching-planning-list-back';
import { TeachingPlanningListSearch } from '@/features/admin/teaching-planning/components/teaching-planning-list-search';
import { normalizeActualDeliveries } from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';
import {
  TEACHING_PLANNING_PAGE_SIZE,
  teachingPlanningListHasActiveQuery,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canSeeActualDeliveryReview } from '@/lib/permissions/teaching-planning';
import {
  ACTUAL_DELIVERY_REVIEW_STATES,
  ACTUAL_DELIVERY_STATES,
  DELIVERY_DEVIATION_TYPES,
  type ActualDeliverySummary,
} from '@/types/teaching-delivery';
import '@/features/admin/teaching-planning/teaching-planning.css';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

export function ActualDeliveriesReviewListPage() {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const canSee = canSeeActualDeliveryReview(user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState('');
  const [deviationFilter, setDeviationFilter] = useState('');

  useEffect(() => setPage(1), [search, stateFilter, reviewFilter, deviationFilter]);

  const state = useAdminResource<unknown>(canSee ? endpoints.admin.actualDeliveries : null, {
    page,
    page_size: TEACHING_PLANNING_PAGE_SIZE,
    state: stateFilter || undefined,
    review_state: reviewFilter || undefined,
    deviation_type: deviationFilter || undefined,
  });

  const rows = useMemo(() => {
    const normalized = normalizeActualDeliveries(state.data);
    const q = search.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((row) =>
      [row.teacher?.name, row.class?.name, row.subject?.name, row.offering?.name, row.delivered_title]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [state.data, search]);

  const hasActiveQuery = teachingPlanningListHasActiveQuery({ search, state: stateFilter });
  const hasExtraFilters = Boolean(reviewFilter || deviationFilter);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setReviewFilter('');
    setDeviationFilter('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const selectedStateLabel = stateFilter ? t(`states.${stateFilter}`) : null;
  const selectedReviewLabel = reviewFilter
    ? t(`admin.teachingPlanning.jathatha.reviewStates.${reviewFilter}`)
    : null;
  const selectedDeviationLabel = deviationFilter
    ? t(`admin.teachingPlanning.delivery.deviationTypes.${deviationFilter}`)
    : null;

  const columns: Column<ActualDeliverySummary>[] = useMemo(
    () => [
      {
        key: 'session',
        header: t('admin.teachingPlanning.delivery.columns.session'),
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
        key: 'deliveredLine',
        header: t('admin.teachingPlanning.delivery.columns.deliveredLine'),
        render: (row) => (
          <div className="tp-list__identity">
            <span className="tp-list__name" dir="auto">
              {row.delivered_distribution_line?.name ?? row.delivered_title ?? t('common.dash')}
            </span>
            {row.offering?.name ? (
              <span className="tp-list__meta" dir="auto">
                {row.offering.name}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'completion',
        header: t('admin.teachingPlanning.delivery.columns.completion'),
        render: (row) =>
          row.completion_state ? (
            <span dir="auto">
              {t(`admin.teachingPlanning.delivery.completionStates.${row.completion_state}`)}
              {row.completion_percent != null ? (
                <>
                  {' '}
                  <bdi dir="ltr">({row.completion_percent}%)</bdi>
                </>
              ) : null}
            </span>
          ) : (
            t('common.dash')
          ),
      },
      {
        key: 'deviation',
        header: t('admin.teachingPlanning.delivery.columns.deviation'),
        render: (row) =>
          row.deviation_type && row.deviation_type !== 'none' ? (
            <Badge tone="amber">
              {t(`admin.teachingPlanning.delivery.deviationTypes.${row.deviation_type}`)}
            </Badge>
          ) : (
            t('common.dash')
          ),
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
              href={`/admin/teaching-planning/actual-deliveries/${row.id}`}
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
      icon="📋"
      title={t('admin.teachingPlanning.delivery.list.empty')}
      action={
        hasActiveQuery || hasExtraFilters ? (
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
          title={t('admin.teachingPlanning.hub.actualDeliveryTitle')}
          subtitle={t('admin.teachingPlanning.hub.actualDeliveryDesc')}
        />

        {!canSee ? (
          <PermissionDeniedState description={t('admin.pageForbidden')} />
        ) : (
          <>
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
                  {ACTUAL_DELIVERY_STATES.map((item) => (
                    <option key={item} value={item}>
                      {t(`states.${item}`)}
                    </option>
                  ))}
                </select>

                <select
                  className="select"
                  value={reviewFilter}
                  onChange={(event) => setReviewFilter(event.target.value)}
                  aria-label={t('admin.teachingPlanning.jathatha.columns.reviewState')}
                >
                  <option value="">{t('admin.teachingPlanning.delivery.filters.reviewAll')}</option>
                  {ACTUAL_DELIVERY_REVIEW_STATES.map((item) => (
                    <option key={item} value={item}>
                      {t(`admin.teachingPlanning.jathatha.reviewStates.${item}`)}
                    </option>
                  ))}
                </select>

                <select
                  className="select"
                  value={deviationFilter}
                  onChange={(event) => setDeviationFilter(event.target.value)}
                  aria-label={t('admin.teachingPlanning.delivery.columns.deviation')}
                >
                  <option value="">
                    {t('admin.teachingPlanning.delivery.filters.deviationAll')}
                  </option>
                  {DELIVERY_DEVIATION_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {t(`admin.teachingPlanning.delivery.deviationTypes.${item}`)}
                    </option>
                  ))}
                </select>

                {hasActiveQuery || hasExtraFilters ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
                    {t('admin.teachingPlanning.filters.reset')}
                  </button>
                ) : null}
              </div>

              {hasActiveQuery || hasExtraFilters ? (
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
                      {t('admin.teachingPlanning.filters.chipState', {
                        status: selectedStateLabel,
                      })}
                      <span aria-hidden="true">×</span>
                    </button>
                  ) : null}
                  {selectedReviewLabel ? (
                    <button
                      type="button"
                      className="tp-list-filters__chip tp-list-filters__chip--action"
                      onClick={() => setReviewFilter('')}
                    >
                      {t('admin.teachingPlanning.filters.chipState', {
                        status: selectedReviewLabel,
                      })}
                      <span aria-hidden="true">×</span>
                    </button>
                  ) : null}
                  {selectedDeviationLabel ? (
                    <button
                      type="button"
                      className="tp-list-filters__chip tp-list-filters__chip--action"
                      onClick={() => setDeviationFilter('')}
                    >
                      {t('admin.teachingPlanning.filters.chipState', {
                        status: selectedDeviationLabel,
                      })}
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
                state.fetching
                  ? 'tp-list__results tp-list__results--fetching'
                  : 'tp-list__results'
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
                            router.push(`/admin/teaching-planning/actual-deliveries/${row.id}`)
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
          </>
        )}
      </div>
    </RequireTeachingPlanningAccess>
  );
}
