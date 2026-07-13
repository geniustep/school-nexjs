'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Annual Distributions list. An Annual Distribution is the year-long ordered
 * instructional plan for a Teaching Offering — NOT a timetable requirement.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { AnnualDistributionEditorDialog } from '@/features/admin/teaching-planning/components/annual-distribution-dialogs';
import { AnnualDistributionsListFilters } from '@/features/admin/teaching-planning/components/annual-distributions-list-filters';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import {
  TEACHING_PLANNING_PAGE_SIZE,
  filterAnnualDistributionsClient,
  resolveTeachingPlanningListEmptyVariant,
  teachingPlanningListHasActiveQuery,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { normalizeAnnualDistributions } from '@/features/admin/teaching-planning/utils/normalize-didactic-distribution';
import { useSession } from '@/features/auth/session-context';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canManageAnnualDistributions } from '@/lib/permissions/teaching-planning';
import type { ListParams } from '@/types/api';
import type { AnnualDistributionSummary } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/annual-distributions-list.css';

export function AnnualDistributionsListPage() {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const { options: yearOptions } = useAcademicYearOptions(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [yearId, setYearId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [stateFilter, yearId, search]);

  const hasActiveQuery = teachingPlanningListHasActiveQuery({
    search,
    state: stateFilter,
    yearId,
  });
  const emptyVariant = resolveTeachingPlanningListEmptyVariant({ hasActiveQuery });

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: TEACHING_PLANNING_PAGE_SIZE,
      state: stateFilter || undefined,
      academic_year_id: yearId || undefined,
    }),
    [page, stateFilter, yearId],
  );

  const state = useAdminResource(endpoints.admin.annualDistributions, params);
  const rows = useMemo(
    () => filterAnnualDistributionsClient(normalizeAnnualDistributions(state.data), search),
    [state.data, search],
  );
  const pg = state.meta?.pagination;
  const canCreate = canManageAnnualDistributions(user);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setYearId('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const columns: Column<AnnualDistributionSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.teachingPlanning.distributions.columns.name'),
        render: (row) => (
          <div className="annual-distributions-list__identity">
            <strong className="annual-distributions-list__name" dir="auto" title={row.name}>
              {row.name}
            </strong>
            {row.offering ? (
              <span
                className="annual-distributions-list__offering"
                dir="auto"
                title={row.offering.display_name}
              >
                {row.offering.display_name}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'period',
        header: t('admin.teachingPlanning.distributions.columns.period'),
        render: (row) => {
          const year =
            row.academic_year?.name ?? row.offering?.academic_year.name ?? t('common.dash');
          return (
            <div className="annual-distributions-list__period">
              <span
                className="annual-distributions-list__period-label"
                dir="auto"
                title={row.period_label || undefined}
              >
                {row.period_label || t('common.dash')}
              </span>
              <span className="annual-distributions-list__year" dir="auto">
                {year}
              </span>
            </div>
          );
        },
      },
      {
        key: 'totals',
        header: t('admin.teachingPlanning.distributions.columns.totals'),
        render: (row) => (
          <div className="annual-distributions-list__totals">
            <Badge tone="slate">
              {t('admin.teachingPlanning.distributions.lineCount', {
                count: row.totals.line_count,
              })}
            </Badge>
            <Badge tone="blue">
              {t('admin.teachingPlanning.distributions.sessionCount', {
                count: row.totals.total_sessions,
              })}
            </Badge>
          </div>
        ),
      },
      {
        key: 'state',
        header: t('admin.teachingPlanning.columns.state'),
        render: (row) => (
          <div className="annual-distributions-list__state">
            <WorkflowBadge state={row.state} />
            {row.active ? (
              <Badge tone="green">{t('admin.teachingPlanning.distributions.activeBadge')}</Badge>
            ) : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (row) => (
          <div
            className="annual-distributions-list__row-actions"
            onClick={(event) => event.stopPropagation()}
          >
            <Link
              href={`/admin/teaching-planning/distributions/${row.id}`}
              className="annual-distributions-list__view-link"
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
        title={t('admin.teachingPlanning.distributions.list.noMatch.title')}
        description={t('admin.teachingPlanning.distributions.list.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.teachingPlanning.filters.reset')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="🗓️"
        title={t('admin.teachingPlanning.distributions.list.noData.title')}
        description={t('admin.teachingPlanning.distributions.list.noData.description')}
        action={
          canCreate ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setCreateOpen(true)}
            >
              + {t('admin.teachingPlanning.distributions.create.open')}
            </button>
          ) : undefined
        }
      />
    );

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace annual-distributions-list-page">
        <Link
          href="/admin/teaching-planning"
          className="annual-distributions-list__back"
          aria-label={t('admin.teachingPlanning.backToHub')}
        >
          <span className="annual-distributions-list__back-icon" aria-hidden="true">
            ←
          </span>
          {t('admin.teachingPlanning.backToHub')}
        </Link>

        <PageHeader
          title={t('admin.teachingPlanning.distributions.title')}
          subtitle={
            pg
              ? t('admin.teachingPlanning.distributions.subtitleWithCount', {
                  total: pg.total,
                })
              : t('admin.teachingPlanning.distributions.subtitle')
          }
          actions={
            canCreate ? (
              <div className="annual-distributions-list__header-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setCreateOpen(true)}
                >
                  + {t('admin.teachingPlanning.distributions.create.open')}
                </button>
              </div>
            ) : undefined
          }
        />

        <AnnualDistributionsListFilters
          search={search}
          yearId={yearId}
          stateFilter={stateFilter}
          yearOptions={yearOptions}
          hasActiveFilters={hasActiveQuery}
          onSearchChange={setSearch}
          onSearchClear={clearSearch}
          onYearIdChange={setYearId}
          onStateFilterChange={setStateFilter}
          onReset={resetFilters}
        />

        {state.fetching ? (
          <p className="annual-distributions-list__fetching-hint" aria-live="polite">
            {t('admin.teachingPlanning.distributions.refetching')}
          </p>
        ) : null}

        <div
          className={
            state.fetching
              ? 'annual-distributions-list__results annual-distributions-list__results--fetching'
              : 'annual-distributions-list__results'
          }
          aria-busy={state.fetching || undefined}
        >
          <ResourceView state={{ ...state, data: rows }} loadingLabel={t('common.loading')}>
            {(data) =>
              data.length === 0 ? (
                listEmptyState
              ) : (
                <>
                  <div className="annual-distributions-list__table">
                    <DataTable
                      columns={columns}
                      rows={data}
                      rowKey={(row) => row.id}
                      onRowClick={(row) =>
                        router.push(`/admin/teaching-planning/distributions/${row.id}`)
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

        <AnnualDistributionEditorDialog
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={(item) => {
            setCreateOpen(false);
            router.push(`/admin/teaching-planning/distributions/${item.id}`);
          }}
        />
      </div>
    </RequireTeachingPlanningAccess>
  );
}
