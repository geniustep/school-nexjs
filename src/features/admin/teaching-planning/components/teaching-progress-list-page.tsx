'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Teaching Progress — admin surface.
 * Semantic guard: progress is derived and read-only. This page renders the
 * Backend-computed summary and lines as-is; it never recomputes coverage
 * or status client-side and exposes no write controls.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PermissionDeniedState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Badge, Card, PageHeader, SectionHead, StatCard } from '@/components/ui/primitives';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { TeachingPlanningListBack } from '@/features/admin/teaching-planning/components/teaching-planning-list-back';
import { TeachingPlanningListSearch } from '@/features/admin/teaching-planning/components/teaching-planning-list-search';
import { buildPrintReportQuery } from '@/features/teaching-planning/print/utils/print-helpers';
import {
  normalizeTeachingProgressLines,
  normalizeTeachingProgressSummary,
} from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';
import {
  TEACHING_PLANNING_PAGE_SIZE,
  teachingPlanningListHasActiveQuery,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canSeeTeachingProgress } from '@/lib/permissions/teaching-planning';
import { TEACHING_PROGRESS_STATUSES, type TeachingProgressLineSummary } from '@/types/teaching-delivery';
import '@/features/admin/teaching-planning/teaching-planning.css';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

export function TeachingProgressListPage() {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const canSee = canSeeTeachingProgress(user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => setPage(1), [search, statusFilter]);

  const summaryState = useAdminResource<unknown>(
    canSee ? endpoints.admin.teachingProgressSummary : null,
  );
  const summary = useMemo(() => normalizeTeachingProgressSummary(summaryState.data), [summaryState.data]);

  const linesState = useAdminResource<unknown>(canSee ? endpoints.admin.teachingProgressLines : null, {
    page,
    page_size: TEACHING_PLANNING_PAGE_SIZE,
    status: statusFilter || undefined,
  });

  const rows = useMemo(() => {
    const normalized = normalizeTeachingProgressLines(linesState.data);
    const q = search.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((row) =>
      [row.title, row.name, row.class?.name, row.subject?.name, row.teacher?.name, row.offering?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [linesState.data, search]);

  const hasActiveQuery = teachingPlanningListHasActiveQuery({ search, state: statusFilter });

  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const selectedStatusLabel = statusFilter
    ? t(`admin.teachingPlanning.progress.statuses.${statusFilter}`)
    : null;

  const columns: Column<TeachingProgressLineSummary>[] = useMemo(
    () => [
      {
        key: 'title',
        header: t('admin.teachingPlanning.progress.columns.item'),
        render: (row) => (
          <div className="tp-list__identity">
            <span className="tp-list__name" dir="auto">
              {row.title ?? row.name ?? t('common.dash')}
            </span>
          </div>
        ),
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
        key: 'teacher',
        header: t('admin.teachingPlanning.jathatha.columns.teacher'),
        render: (row) => row.teacher?.name ?? t('common.dash'),
      },
      {
        key: 'coverage',
        header: t('admin.teachingPlanning.progress.columns.coverage'),
        render: (row) => (
          <bdi dir="ltr">
            {row.coverage_percent != null ? `${row.coverage_percent}%` : t('common.dash')}
          </bdi>
        ),
      },
      {
        key: 'delivered',
        header: t('admin.teachingPlanning.progress.columns.delivered'),
        render: (row) => (
          <bdi dir="ltr">
            {row.delivered_units ?? 0}/{row.planned_sessions ?? t('common.dash')}
          </bdi>
        ),
      },
      {
        key: 'status',
        header: t('admin.teachingPlanning.progress.columns.status'),
        render: (row) => <WorkflowBadge state={row.status} />,
      },
      {
        key: 'delayed',
        header: t('admin.teachingPlanning.progress.columns.delayed'),
        render: (row) =>
          row.delayed ? (
            <Badge tone="red">{t('admin.teachingPlanning.progress.delayed')}</Badge>
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
              href={`/admin/teaching-planning/progress/${row.id}`}
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

  const pg = linesState.meta?.pagination;

  const listEmptyState = (
    <EmptyState
      icon="📈"
      title={t('admin.teachingPlanning.progress.list.empty')}
      action={
        hasActiveQuery ? (
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
          title={t('admin.teachingPlanning.hub.progressTitle')}
          subtitle={t('admin.teachingPlanning.progress.subtitle')}
          actions={
            canSee ? (
              <div className="teaching-planning-page__actions">
                <Link
                  href={`/admin/teaching-planning/progress/print${buildPrintReportQuery(
                    { status: statusFilter || undefined, search: search.trim() || undefined },
                    'all_filtered',
                  )}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.teachingPlanning.print.actionAllFiltered')}
                </Link>
                <Link
                  href={`/admin/teaching-planning/progress/print${buildPrintReportQuery(
                    { status: statusFilter || undefined, search: search.trim() || undefined },
                    'current_page',
                    page,
                  )}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.teachingPlanning.print.actionCurrentPage')}
                </Link>
              </div>
            ) : undefined
          }
        />

        {!canSee ? (
          <PermissionDeniedState description={t('admin.pageForbidden')} />
        ) : (
          <>
            <div className="tp-list__stats grid grid--stats">
              <StatCard
                label={t('admin.teachingPlanning.progress.stats.coverage')}
                value={summary.coverage_percent != null ? `${summary.coverage_percent}%` : '—'}
                tone="blue"
              />
              <StatCard
                label={t('admin.teachingPlanning.progress.stats.planned')}
                value={summary.planned_lines ?? '—'}
              />
              <StatCard
                label={t('admin.teachingPlanning.progress.stats.started')}
                value={summary.started_lines ?? '—'}
              />
              <StatCard
                label={t('admin.teachingPlanning.progress.stats.completed')}
                value={summary.completed_lines ?? '—'}
                tone="green"
              />
              <StatCard
                label={t('admin.teachingPlanning.progress.stats.delayed')}
                value={summary.delayed_lines ?? '—'}
                tone={summary.delayed_lines ? 'red' : 'none'}
              />
            </div>

            {(summary.classes_needing_attention ?? []).length > 0 ? (
              <Card>
                <SectionHead title={t('admin.teachingPlanning.progress.attention.title')} />
                <div className="tp-list__attention">
                  {(summary.classes_needing_attention ?? []).map((ref) => (
                    <Badge key={ref.id} tone="amber">
                      {ref.name}
                    </Badge>
                  ))}
                </div>
              </Card>
            ) : null}

            {summary.last_delivery ? (
              <Card>
                <SectionHead title={t('admin.teachingPlanning.progress.lastDelivery.title')} />
                <p dir="auto">
                  <Link href={`/admin/teaching-planning/actual-deliveries/${summary.last_delivery.id}`}>
                    {summary.last_delivery.delivered_title ?? summary.last_delivery.class?.name ?? t('common.dash')}
                  </Link>
                </p>
              </Card>
            ) : null}

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
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label={t('admin.teachingPlanning.progress.columns.status')}
                >
                  <option value="">{t('admin.teachingPlanning.progress.filters.statusAll')}</option>
                  {TEACHING_PROGRESS_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {t(`admin.teachingPlanning.progress.statuses.${item}`)}
                    </option>
                  ))}
                </select>

                {hasActiveQuery ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
                    {t('admin.teachingPlanning.filters.reset')}
                  </button>
                ) : null}
              </div>

              {hasActiveQuery ? (
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
                  {selectedStatusLabel ? (
                    <button
                      type="button"
                      className="tp-list-filters__chip tp-list-filters__chip--action"
                      onClick={() => setStatusFilter('')}
                    >
                      {t('admin.teachingPlanning.filters.chipState', {
                        status: selectedStatusLabel,
                      })}
                      <span aria-hidden="true">×</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {linesState.fetching ? (
              <p className="tp-list__fetching-hint" aria-live="polite">
                {t('admin.teachingPlanning.offerings.refetching')}
              </p>
            ) : null}

            <div
              className={
                linesState.fetching
                  ? 'tp-list__results tp-list__results--fetching'
                  : 'tp-list__results'
              }
              aria-busy={linesState.fetching || undefined}
            >
              <ResourceView state={{ ...linesState, data: rows }} loadingLabel={t('common.loading')}>
                {(data) =>
                  data.length ? (
                    <>
                      <div className="tp-list__table">
                        <DataTable
                          columns={columns}
                          rows={data}
                          rowKey={(row) => row.id}
                          onRowClick={(row) => router.push(`/admin/teaching-planning/progress/${row.id}`)}
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
