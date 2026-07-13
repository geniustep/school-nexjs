'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { TeachingOfferingEditorDialog } from '@/features/admin/teaching-planning/components/teaching-offering-dialogs';
import { TeachingOfferingsListFilters } from '@/features/admin/teaching-planning/components/teaching-offerings-list-filters';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import {
  TEACHING_PLANNING_PAGE_SIZE,
  filterTeachingOfferingsClient,
  resolveTeachingPlanningListEmptyVariant,
  teachingOfferingReadinessTone,
  teachingPlanningBlockerLabelKey,
  teachingPlanningListHasActiveQuery,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { normalizeTeachingOfferings } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import { useSession } from '@/features/auth/session-context';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canManageTeachingOfferings } from '@/lib/permissions/teaching-planning';
import type { ListParams } from '@/types/api';
import type { TeachingOfferingSummary } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-offerings-list.css';

function blockerLabel(t: (key: string) => string, code: string): string {
  const key = teachingPlanningBlockerLabelKey(code);
  const translated = t(key);
  return translated === key ? code : translated;
}

function ReadinessItem({
  ready,
  label,
  readyLabel,
  notReadyLabel,
}: {
  ready: boolean;
  label: string;
  readyLabel: string;
  notReadyLabel: string;
}) {
  return (
    <span
      className="teaching-offerings-list__readiness-item"
      title={`${label}: ${ready ? readyLabel : notReadyLabel}`}
      aria-label={`${label}: ${ready ? readyLabel : notReadyLabel}`}
    >
      <span
        className={
          ready
            ? 'teaching-offerings-list__readiness-dot teaching-offerings-list__readiness-dot--ready'
            : 'teaching-offerings-list__readiness-dot teaching-offerings-list__readiness-dot--blocked'
        }
        aria-hidden="true"
      />
      <span className="teaching-offerings-list__readiness-label" dir="auto">
        {label}
      </span>
    </span>
  );
}

export function TeachingOfferingsListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSession();
  const { options: yearOptions } = useAcademicYearOptions(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [yearId, setYearId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = canManageTeachingOfferings(user);

  useEffect(() => {
    if (!canCreate) return;
    if (searchParams.get('create') !== '1') return;
    setCreateOpen(true);
    router.replace('/admin/teaching-planning/offerings', { scroll: false });
  }, [canCreate, router, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [stateFilter, yearId, levelId, subjectId, search]);

  const hasActiveQuery = teachingPlanningListHasActiveQuery({
    search,
    state: stateFilter,
    yearId,
    levelId,
    subjectId,
  });
  const emptyVariant = resolveTeachingPlanningListEmptyVariant({ hasActiveQuery });

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: TEACHING_PLANNING_PAGE_SIZE,
      state: stateFilter || undefined,
      academic_year_id: yearId || undefined,
      level_id: levelId || undefined,
      subject_id: subjectId || undefined,
    }),
    [page, stateFilter, yearId, levelId, subjectId],
  );

  const state = useAdminResource(endpoints.admin.teachingOfferings, params);
  const rows = useMemo(
    () => filterTeachingOfferingsClient(normalizeTeachingOfferings(state.data), search),
    [state.data, search],
  );
  const pg = state.meta?.pagination;

  const resetFilters = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setYearId('');
    setLevelId('');
    setSubjectId('');
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const columns: Column<TeachingOfferingSummary>[] = useMemo(
    () => [
      {
        key: 'display_name',
        header: t('admin.teachingPlanning.columns.displayName'),
        render: (row) => {
          const lang = row.teaching_language
            ? `${row.teaching_language.name} (${row.teaching_language.code})`
            : null;
          return (
            <div className="teaching-offerings-list__identity">
              <strong
                className="teaching-offerings-list__name"
                dir="auto"
                title={row.display_name}
              >
                {row.display_name}
              </strong>
              <div className="teaching-offerings-list__meta">
                <span dir="auto">{row.academic_year.name}</span>
                {lang ? (
                  <span className="teaching-offerings-list__lang mono" dir="auto" title={lang}>
                    {row.teaching_language?.code ?? lang}
                  </span>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        key: 'academic',
        header: t('admin.teachingPlanning.columns.levelAndSubject'),
        render: (row) => (
          <div className="teaching-offerings-list__academic">
            <span
              className="teaching-offerings-list__academic-primary"
              dir="auto"
              title={row.level.name}
            >
              {row.level.name}
            </span>
            <span
              className="teaching-offerings-list__academic-secondary"
              dir="auto"
              title={row.subject.name}
            >
              {row.subject.name}
            </span>
          </div>
        ),
      },
      {
        key: 'coverage',
        header: t('admin.teachingPlanning.columns.coverage'),
        render: (row) => (
          <div className="teaching-offerings-list__coverage" dir="ltr">
            <span>
              <strong>{row.class_count}</strong>{' '}
              {t('admin.teachingPlanning.offerings.coverage.classes')}
            </span>
            <span>
              <strong>{row.teacher_count}</strong>{' '}
              {t('admin.teachingPlanning.offerings.coverage.teachers')}
            </span>
          </div>
        ),
      },
      {
        key: 'readiness',
        header: t('admin.teachingPlanning.columns.readiness'),
        render: (row) => (
          <div className="teaching-offerings-list__readiness">
            <div className="teaching-offerings-list__readiness-row">
              <ReadinessItem
                ready={row.readiness.reference_ready}
                label={t('admin.teachingPlanning.readiness.referenceReady')}
                readyLabel={t('admin.teachingPlanning.readiness.readyYes')}
                notReadyLabel={t('admin.teachingPlanning.readiness.readyNo')}
              />
              <ReadinessItem
                ready={row.readiness.distribution_ready}
                label={t('admin.teachingPlanning.readiness.distributionReady')}
                readyLabel={t('admin.teachingPlanning.readiness.readyYes')}
                notReadyLabel={t('admin.teachingPlanning.readiness.readyNo')}
              />
            </div>
            {!row.readiness.distribution_ready &&
            row.readiness.blockers.includes('annual_distribution_required') ? (
              <Badge tone={teachingOfferingReadinessTone(false)}>
                {blockerLabel(t, 'annual_distribution_required')}
              </Badge>
            ) : null}
          </div>
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
          <div
            className="teaching-offerings-list__row-actions"
            onClick={(event) => event.stopPropagation()}
          >
            <Link
              href={`/admin/teaching-planning/offerings/${row.id}`}
              className="teaching-offerings-list__view-link"
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
        title={t('admin.teachingPlanning.offerings.list.noMatch.title')}
        description={t('admin.teachingPlanning.offerings.list.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.teachingPlanning.filters.reset')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="🧭"
        title={t('admin.teachingPlanning.offerings.list.noData.title')}
        description={t('admin.teachingPlanning.offerings.list.noData.description')}
        action={
          canCreate ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setCreateOpen(true)}
            >
              + {t('admin.teachingPlanning.offerings.create.open')}
            </button>
          ) : undefined
        }
      />
    );

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace teaching-offerings-list-page">
        <Link
          href="/admin/teaching-planning"
          className="teaching-offerings-list__back"
          aria-label={t('admin.teachingPlanning.backToHub')}
        >
          <span className="teaching-offerings-list__back-icon" aria-hidden="true">
            ←
          </span>
          {t('admin.teachingPlanning.backToHub')}
        </Link>

        <PageHeader
          title={t('admin.teachingPlanning.offerings.title')}
          subtitle={
            pg
              ? t('admin.teachingPlanning.offerings.subtitleWithCount', { total: pg.total })
              : t('admin.teachingPlanning.offerings.subtitle')
          }
          actions={
            canCreate ? (
              <div className="teaching-offerings-list__header-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setCreateOpen(true)}
                >
                  + {t('admin.teachingPlanning.offerings.create.open')}
                </button>
              </div>
            ) : undefined
          }
        />

        <TeachingOfferingsListFilters
          search={search}
          yearId={yearId}
          stateFilter={stateFilter}
          levelId={levelId}
          subjectId={subjectId}
          yearOptions={yearOptions}
          hasActiveFilters={hasActiveQuery}
          onSearchChange={setSearch}
          onSearchClear={clearSearch}
          onYearIdChange={setYearId}
          onStateFilterChange={setStateFilter}
          onLevelIdChange={setLevelId}
          onSubjectIdChange={setSubjectId}
          onReset={resetFilters}
        />

        {state.fetching ? (
          <p className="teaching-offerings-list__fetching-hint" aria-live="polite">
            {t('admin.teachingPlanning.offerings.refetching')}
          </p>
        ) : null}

        <div
          className={
            state.fetching
              ? 'teaching-offerings-list__results teaching-offerings-list__results--fetching'
              : 'teaching-offerings-list__results'
          }
          aria-busy={state.fetching || undefined}
        >
          <ResourceView state={{ ...state, data: rows }} loadingLabel={t('common.loading')}>
            {(data) =>
              data.length === 0 ? (
                listEmptyState
              ) : (
                <>
                  <div className="teaching-offerings-list__table">
                    <DataTable
                      columns={columns}
                      rows={data}
                      rowKey={(row) => row.id}
                      onRowClick={(row) =>
                        router.push(`/admin/teaching-planning/offerings/${row.id}`)
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

        <TeachingOfferingEditorDialog
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={(item) => {
            setCreateOpen(false);
            router.push(`/admin/teaching-planning/offerings/${item.id}`);
          }}
        />
      </div>
    </RequireTeachingPlanningAccess>
  );
}
