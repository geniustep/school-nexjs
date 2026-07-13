'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Class Teaching Journal — admin surface.
 * Semantic guard: the journal is generated and read-only. This page never
 * exposes create/edit/void controls; it is a view onto Backend-generated
 * entries only.
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
import { buildPrintReportQuery } from '@/features/teaching-planning/print/utils/print-helpers';
import { normalizeClassJournalEntries } from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';
import {
  TEACHING_PLANNING_PAGE_SIZE,
  teachingPlanningListHasActiveQuery,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canSeeClassJournal } from '@/lib/permissions/teaching-planning';
import { CLASS_JOURNAL_ENTRY_STATES, type ClassJournalEntrySummary } from '@/types/teaching-delivery';
import '@/features/admin/teaching-planning/teaching-planning.css';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

export function ClassJournalListPage() {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const canSee = canSeeClassJournal(user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => setPage(1), [search, stateFilter]);

  const state = useAdminResource<unknown>(canSee ? endpoints.admin.classJournal : null, {
    page,
    page_size: TEACHING_PLANNING_PAGE_SIZE,
    state: stateFilter || undefined,
  });

  const rows = useMemo(() => {
    const normalized = normalizeClassJournalEntries(state.data);
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

  const resetFilters = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const selectedStateLabel = stateFilter
    ? t(`admin.teachingPlanning.classJournal.states.${stateFilter}`)
    : null;

  const columns: Column<ClassJournalEntrySummary>[] = useMemo(
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
        key: 'title',
        header: t('admin.teachingPlanning.delivery.columns.deliveredLine'),
        render: (row) => (
          <div className="tp-list__identity">
            <span className="tp-list__name" dir="auto">
              {row.delivered_title ?? row.distribution_line?.name ?? t('common.dash')}
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
        key: 'actions',
        header: '',
        width: '88px',
        render: (row) => (
          <div className="tp-list__row-actions" onClick={(event) => event.stopPropagation()}>
            <Link
              href={`/admin/teaching-planning/class-journal/${row.id}`}
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
      icon="📔"
      title={t('admin.teachingPlanning.classJournal.list.empty')}
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
          title={t('admin.teachingPlanning.hub.classJournalTitle')}
          subtitle={t('admin.teachingPlanning.hub.classJournalDesc')}
          actions={
            canSee ? (
              <div className="teaching-planning-page__actions">
                <Link
                  href={`/admin/teaching-planning/class-journal/print${buildPrintReportQuery(
                    { state: stateFilter || undefined, search: search.trim() || undefined },
                    'all_filtered',
                  )}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.teachingPlanning.print.actionAllFiltered')}
                </Link>
                <Link
                  href={`/admin/teaching-planning/class-journal/print${buildPrintReportQuery(
                    { state: stateFilter || undefined, search: search.trim() || undefined },
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
                  {CLASS_JOURNAL_ENTRY_STATES.map((item) => (
                    <option key={item} value={item}>
                      {t(`admin.teachingPlanning.classJournal.states.${item}`)}
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
                            router.push(`/admin/teaching-planning/class-journal/${row.id}`)
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
