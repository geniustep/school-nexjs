'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { TeacherLifecycleDialogs } from '@/features/admin/teachers/components/teacher-lifecycle-dialogs';
import { TeachersListFilters } from '@/features/admin/teachers/components/teachers-list-filters';
import { TeachersListInterventionCell } from '@/features/admin/teachers/components/teachers-list-intervention-cell';
import {
  TeachersListSummaryCards,
  type TeachersListSummaryCardId,
} from '@/features/admin/teachers/components/teachers-list-summary-cards';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useTeacherDomainContract } from '@/features/admin/teachers/hooks/use-teacher-domain-contract';
import {
  TEACHER_DOMAIN_FILTER_FETCH_SIZE,
  TEACHER_DOMAIN_PAGE_SIZE,
  TEACHER_DOMAIN_SEARCH_DEBOUNCE_MS,
  filterTeacherSummaries,
  formatPlannedLoad,
  paginateTeacherSummaries,
  resolveTeacherListEmptyVariant,
  teacherAccountStateLabelKey,
  teacherDisplayName,
  teacherEmploymentState,
  teacherInitials,
  teacherPrimaryActions,
} from '@/features/admin/teachers/utils/teacher-domain-present';
import { hasAllowedAction } from '@/features/admin/teachers/utils/teacher-domain-allowed-actions';
import { normalizeTeacherSummaries } from '@/features/admin/teachers/utils/teacher-domain-normalize';
import {
  countTeacherInterventions,
  filterTeachersByOperationalPreset,
  presetFromSummaryCard,
  type TeacherOperationalPreset,
} from '@/features/admin/teachers/utils/teacher-interventions';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import { statusLabel } from '@/lib/utils/labels';
import type { TeacherSummary } from '@/types/teacher-domain';
import '@/features/admin/teachers/teachers-list.css';
import '@/features/admin/teachers/teachers-domain.css';

type LifecycleAction = 'terminate' | 'archive' | 'reactivate' | null;

export function TeachersListPage() {
  const router = useRouter();
  const t = useT();
  const user = useSession();
  const { check } = useTeacherDomainContract();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const debouncedSearch = useDebouncedValue(searchDraft, TEACHER_DOMAIN_SEARCH_DEBOUNCE_MS);
  const [stateFilter, setStateFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [hasAssignments, setHasAssignments] = useState('');
  const [operationalPreset, setOperationalPreset] = useState<TeacherOperationalPreset>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [lifecycle, setLifecycle] = useState<{
    teacher: TeacherSummary | null;
    action: LifecycleAction;
  }>({ teacher: null, action: null });

  const hasManualClientFilters = Boolean(stateFilter || activeFilter || hasAssignments);
  const hasOperationalPreset = operationalPreset !== 'all';
  const useCompositionWindow = hasManualClientFilters || hasOperationalPreset;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, activeFilter, hasAssignments, operationalPreset]);

  const query = useMemo(() => {
    const search = debouncedSearch.trim();
    const next: Record<string, string | number> = {
      page: useCompositionWindow ? 1 : page,
      page_size: useCompositionWindow
        ? TEACHER_DOMAIN_FILTER_FETCH_SIZE
        : TEACHER_DOMAIN_PAGE_SIZE,
    };
    if (search) next.search = search;
    return next;
  }, [page, debouncedSearch, useCompositionWindow]);

  const state = useAdminResource<TeacherSummary[]>(endpoints.admin.teachers, query, {
    keepPreviousData: true,
  });
  const teachers = useMemo(
    () => normalizeTeacherSummaries(state.data ?? []),
    [state.data],
  );

  const manuallyFiltered = useMemo(
    () =>
      filterTeacherSummaries(teachers, {
        state: stateFilter,
        active: activeFilter,
        hasAssignments,
      }),
    [teachers, stateFilter, activeFilter, hasAssignments],
  );

  const filteredTeachers = useMemo(
    () => filterTeachersByOperationalPreset(manuallyFiltered, operationalPreset),
    [manuallyFiltered, operationalPreset],
  );

  // Card composition counts follow the rows available after independent manual
  // filters (and before the operational preset), so the number matches what the
  // user can still reach when clicking a card without a silent mismatch.
  const interventionCounts = useMemo(
    () => countTeacherInterventions(manuallyFiltered),
    [manuallyFiltered],
  );

  const serverPagination = state.meta?.pagination;
  const schoolTotal = serverPagination?.total ?? null;
  const compositionScope = useMemo(() => {
    if (schoolTotal != null && teachers.length >= schoolTotal) return 'full' as const;
    if (useCompositionWindow) return 'loaded_window' as const;
    return 'page' as const;
  }, [schoolTotal, teachers.length, useCompositionWindow]);

  const filteredTotal = filteredTeachers.length;
  const clientTotalPages = Math.max(1, Math.ceil(filteredTotal / TEACHER_DOMAIN_PAGE_SIZE) || 1);
  const safePage = useCompositionWindow
    ? Math.min(Math.max(1, page), filteredTotal === 0 ? 1 : clientTotalPages)
    : page;
  const visibleTeachers = useMemo(
    () =>
      useCompositionWindow
        ? paginateTeacherSummaries(filteredTeachers, safePage, TEACHER_DOMAIN_PAGE_SIZE)
        : filteredTeachers,
    [filteredTeachers, useCompositionWindow, safePage],
  );
  const pg = useCompositionWindow
    ? {
        page: safePage,
        total_pages: clientTotalPages,
        total: filteredTotal,
        page_size: TEACHER_DOMAIN_PAGE_SIZE,
      }
    : serverPagination;

  const hasActiveFilters = Boolean(
    searchDraft.trim() ||
      stateFilter ||
      activeFilter ||
      hasAssignments ||
      operationalPreset !== 'all',
  );
  const emptyVariant = resolveTeacherListEmptyVariant({
    total: useCompositionWindow ? filteredTotal : pg?.total,
    hasActiveFilters,
  });

  const canAddTeacher = canShowAcademicListAdd(user, {
    legacyPermission: 'manage_teachers',
    capability: 'manage_teachers',
  });

  const resetFilters = () => {
    setSearchDraft('');
    setStateFilter('');
    setActiveFilter('');
    setHasAssignments('');
    setOperationalPreset('all');
    setPage(1);
  };

  const applyOperationalPreset = (preset: TeacherOperationalPreset) => {
    setOperationalPreset(preset);
    // Avoid silent conflict with the legacy hasAssignments select when using
    // the operational_count-based no_assignment preset.
    if (preset === 'no_assignment') {
      setHasAssignments('');
    }
    setPage(1);
  };

  const onSummaryCardSelect = (card: TeachersListSummaryCardId) => {
    applyOperationalPreset(presetFromSummaryCard(card));
  };

  const onHasAssignmentsChange = (value: string) => {
    setHasAssignments(value);
    if (operationalPreset === 'no_assignment' && value !== '') {
      setOperationalPreset('all');
    }
    setPage(1);
  };

  const onStateFilterChange = (value: string) => {
    setStateFilter(value);
    setPage(1);
  };

  const onActiveFilterChange = (value: string) => {
    setActiveFilter(value);
    setPage(1);
  };

  const listEmptyState =
    emptyVariant === 'noMatch' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.teacherDomain.list.noMatchTitle')}
        description={t('admin.teacherDomain.list.noMatchDesc')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.teacherDomain.filters.reset')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="👩‍🏫"
        title={t('admin.academicSetup.teachersEmptyTitle')}
        description={t('admin.academicSetup.teachersEmptyDesc')}
        action={
          canAddTeacher ? (
            <Link href="/admin/teachers/new" className="btn btn--primary btn--sm">
              {t('admin.addTeacher')}
            </Link>
          ) : undefined
        }
      />
    );

  const columns: Column<TeacherSummary>[] = useMemo(
    () => [
      {
        key: 'teacher',
        header: t('admin.fullName'),
        render: (teacher) => {
          const name = teacherDisplayName(teacher);
          return (
            <div className="teachers-list__identity">
              <span className="teachers-list__avatar" aria-hidden="true">
                {teacherInitials(name)}
              </span>
              <div className="teachers-list__identity-text">
                <strong className="teachers-list__name" dir="auto" title={name}>
                  {name}
                </strong>
                <span className="teachers-list__code mono muted" dir="auto">
                  {teacher.code ?? t('common.dash')}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'employment',
        header: t('admin.teacherDomain.columns.employment'),
        render: (teacher) => (
          <Badge tone={teacherEmploymentState(teacher) === 'active' ? 'green' : 'slate'}>
            {statusLabel(t, teacherEmploymentState(teacher))}
          </Badge>
        ),
      },
      {
        key: 'account',
        header: t('admin.teacherDomain.columns.account'),
        className: 'teachers-list__academic-col',
        render: (teacher) => (
          <span className="teachers-list__meta" dir="auto">
            {t(teacherAccountStateLabelKey(teacher))}
          </span>
        ),
      },
      {
        key: 'specialization',
        header: t('admin.teacherDomain.columns.specialization'),
        className: 'teachers-list__academic-col',
        render: (teacher) => (
          <span className="teachers-list__academic" dir="auto">
            {teacher.specialization?.trim() || t('common.dash')}
          </span>
        ),
      },
      {
        key: 'assignments',
        header: t('admin.teacherDomain.columns.activeAssignments'),
        render: (teacher) => (
          <span className="teachers-list__meta" dir="ltr">
            {teacher.assignment_summary?.operational_count ??
              teacher.assignment_summary?.active_count ??
              t('common.dash')}
          </span>
        ),
      },
      {
        key: 'loadTarget',
        header: t('admin.teacherDomain.columns.weeklyTarget'),
        className: 'teachers-list__academic-col',
        render: (teacher) => (
          <span className="teachers-list__meta" dir="ltr">
            {formatPlannedLoad(
              teacher.academic_profile_summary?.weekly_hours_target ??
                teacher.weekly_hours_target,
              t('common.dash'),
            )}
          </span>
        ),
      },
      {
        key: 'intervention',
        header: t('admin.teacherDomain.columns.intervention'),
        render: (teacher) => <TeachersListInterventionCell teacher={teacher} />,
      },
      {
        key: 'actions',
        header: '',
        width: '140px',
        render: (teacher) => {
          const actions = teacherPrimaryActions(teacher);
          return (
            <div
              className="teachers-list__row-actions"
              onClick={(event) => event.stopPropagation()}
            >
              {actions.includes('archive') ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  aria-label={t('admin.teacherDomain.lifecycle.archive')}
                  onClick={() => setLifecycle({ teacher, action: 'archive' })}
                >
                  {t('admin.teacherDomain.lifecycle.archiveShort')}
                </button>
              ) : null}
              {hasAllowedAction(teacher.allowed_actions, 'view') || true ? (
                <Link
                  href={`/admin/teachers/${teacher.id}`}
                  className="teachers-list__view-link"
                  aria-label={t('common.view')}
                  title={t('common.view')}
                >
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t],
  );

  return (
    <div className="admin-workspace teachers-list-page">
      <PageHeader
        title={t('nav.teachers')}
        subtitle={
          check && !check.ok
            ? t('admin.teacherDomain.contract.incompatible')
            : schoolTotal != null
              ? t('admin.teacherDomain.list.subtitleWithCount', { total: schoolTotal })
              : t('admin.teachersListDesc')
        }
        actions={
          <div className="teachers-list__header-actions">
            <AdminListActions
              addHref="/admin/teachers/new"
              addLabel={t('admin.addTeacher')}
              addCapability="manage_teachers"
              managePermission="manage_teachers"
              exportPath={endpoints.admin.teachersExport}
              exportFilename="teachers.csv"
              showImport
              importOpen={importOpen}
              onToggleImport={() => setImportOpen((v) => !v)}
            />
          </div>
        }
      />

      <TeachersListSummaryCards
        totalSchool={schoolTotal}
        counts={interventionCounts}
        compositionScope={compositionScope}
        loadedCount={teachers.length}
        windowSize={TEACHER_DOMAIN_FILTER_FETCH_SIZE}
        activePreset={operationalPreset}
        disabled={state.initialLoading}
        onSelect={onSummaryCardSelect}
      />

      <TeachersListFilters
        search={searchDraft}
        stateFilter={stateFilter}
        activeFilter={activeFilter}
        hasAssignments={hasAssignments}
        operationalPreset={operationalPreset}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchDraft}
        onSearchClear={() => setSearchDraft('')}
        onStateFilterChange={onStateFilterChange}
        onActiveFilterChange={onActiveFilterChange}
        onHasAssignmentsChange={onHasAssignmentsChange}
        onOperationalPresetChange={applyOperationalPreset}
        onReset={resetFilters}
      />

      {importOpen ? (
        <CsvImportPanel importPath={endpoints.admin.teachersImport} onDone={() => state.reload()} />
      ) : null}

      {state.fetching && !state.initialLoading ? (
        <p className="teachers-list__fetching-hint" aria-live="polite">
          {t('admin.teacherDomain.list.refetching')}
        </p>
      ) : null}

      <div
        className={
          state.fetching
            ? 'teachers-list__results teachers-list__results--fetching'
            : 'teachers-list__results'
        }
        aria-busy={state.fetching || undefined}
      >
        <ResourceView
          state={{ ...state, data: visibleTeachers }}
          loadingLabel={t('common.loading')}
          isEmpty={() =>
            useCompositionWindow
              ? filteredTotal === 0
              : (serverPagination?.total ?? teachers.length) === 0
          }
          empty={listEmptyState}
        >
          {(rows) => (
            <>
              <div className="teachers-list__table">
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(teacher) => teacher.id}
                  onRowClick={(teacher) => router.push(`/admin/teachers/${teacher.id}`)}
                />
              </div>
              {pg && (useCompositionWindow ? filteredTotal > 0 : true) ? (
                <Pagination
                  page={pg.page}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  pageSize={TEACHER_DOMAIN_PAGE_SIZE}
                  onPage={setPage}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      </div>

      <TeacherLifecycleDialogs
        teacher={lifecycle.teacher}
        action={lifecycle.action}
        onClose={() => setLifecycle({ teacher: null, action: null })}
        onSuccess={() => state.reload()}
      />
    </div>
  );
}
