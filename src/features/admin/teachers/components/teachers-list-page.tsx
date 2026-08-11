'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { TeachersListFilters } from '@/features/admin/teachers/components/teachers-list-filters';
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
} from '@/features/admin/teachers/utils/teacher-domain-present';
import { normalizeTeacherSummaries } from '@/features/admin/teachers/utils/teacher-domain-normalize';
import {
  countTeacherInterventions,
  deriveTeacherInterventions,
  filterTeachersByOperationalPreset,
  getTeacherPrimaryIntervention,
  interventionTitleKey,
  presetFromSummaryCard,
  type TeacherOperationalPreset,
} from '@/features/admin/teachers/utils/teacher-interventions';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import { hasPermission } from '@/lib/permissions/permissions';
import { statusLabel } from '@/lib/utils/labels';
import type { TeacherSummary } from '@/types/teacher-domain';
import '@/features/admin/teachers/teachers-list.css';
import '@/features/admin/teachers/teachers-domain.css';
import '@/features/admin/teachers/teachers-list-density.css';

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
  const [accountFilter, setAccountFilter] = useState('');
  const [operationalPreset, setOperationalPreset] = useState<TeacherOperationalPreset>('all');
  const [importOpen, setImportOpen] = useState(false);

  const hasManualClientFilters = Boolean(
    stateFilter || activeFilter || hasAssignments || accountFilter,
  );
  const hasOperationalPreset = operationalPreset !== 'all';
  const useCompositionWindow = hasManualClientFilters || hasOperationalPreset;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, activeFilter, hasAssignments, accountFilter, operationalPreset]);

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

  const state = useGlobalAcademicYearResource<TeacherSummary[]>(endpoints.admin.teachers, query, {
    keepPreviousData: true,
  });
  const teachers = useMemo(
    () => normalizeTeacherSummaries(state.data ?? []),
    [state.data],
  );

  const manuallyFiltered = useMemo(() => {
    const base = filterTeacherSummaries(teachers, {
      state: stateFilter,
      active: activeFilter,
      hasAssignments,
    });
    if (accountFilter !== 'no_account') return base;
    return base.filter((teacher) => {
      const account = teacher.account as {
        has_linked_user?: boolean;
        user_id?: number | null;
      } | null | undefined;
      return account == null || (account.has_linked_user === false && account.user_id == null);
    });
  }, [teachers, stateFilter, activeFilter, hasAssignments, accountFilter]);

  const filteredTeachers = useMemo(
    () => filterTeachersByOperationalPreset(manuallyFiltered, operationalPreset),
    [manuallyFiltered, operationalPreset],
  );

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
      accountFilter ||
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
  const canShowSecondaryActions =
    hasPermission(user, 'export_data') || hasPermission(user, 'import_data');

  const resetFilters = () => {
    setSearchDraft('');
    setStateFilter('');
    setActiveFilter('');
    setHasAssignments('');
    setAccountFilter('');
    setOperationalPreset('all');
    setPage(1);
  };

  const applyOperationalPreset = (preset: TeacherOperationalPreset) => {
    setOperationalPreset(preset);
    if (preset === 'no_assignment') setHasAssignments('');
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
                {teacher.code ? (
                  <span className="teachers-list__code mono muted" dir="auto">
                    {teacher.code}
                  </span>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        key: 'teaching',
        header: t('admin.teacherDomain.columns.specialization'),
        render: (teacher) => {
          const assignmentCount =
            teacher.assignment_summary?.operational_count ??
            teacher.assignment_summary?.active_count ??
            0;
          const plannedLoad = formatPlannedLoad(
            teacher.academic_profile_summary?.weekly_hours_target ?? teacher.weekly_hours_target,
            t('common.dash'),
          );
          return (
            <div className="teachers-list__teaching">
              <span className="teachers-list__academic" dir="auto">
                {teacher.specialization?.trim() || t('common.dash')}
              </span>
              <span className="teachers-list__teaching-meta muted">
                {t('admin.teacherDomain.columns.activeAssignments')}: <bdi>{assignmentCount}</bdi>
                {' · '}
                {t('admin.teacherDomain.columns.weeklyTarget')}: <bdi>{plannedLoad}</bdi>
              </span>
            </div>
          );
        },
      },
      {
        key: 'attention',
        header: t('admin.teacherDomain.columns.intervention'),
        render: (teacher) => {
          const employment = teacherEmploymentState(teacher);
          const accountKey = teacherAccountStateLabelKey(teacher);
          const accountNeedsAttention = accountKey !== 'admin.teacherDomain.account.active';
          const interventions = deriveTeacherInterventions(teacher);
          const primaryIntervention = getTeacherPrimaryIntervention(teacher);
          const extraInterventions = Math.max(0, interventions.length - 1);
          return (
            <div className="teachers-list__attention">
              {employment !== 'active' ? (
                <Badge tone="slate">{statusLabel(t, employment)}</Badge>
              ) : null}
              {accountNeedsAttention ? (
                <span className="teachers-list__attention-note" dir="auto">
                  {t(accountKey)}
                </span>
              ) : null}
              {primaryIntervention ? (
                <span className="teachers-list__attention-note" dir="auto">
                  {t(interventionTitleKey(primaryIntervention.code))}
                  {extraInterventions > 0 ? ` +${extraInterventions}` : ''}
                </span>
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
        subtitle={check && !check.ok ? t('admin.teacherDomain.contract.incompatible') : undefined}
        actions={
          canAddTeacher || canShowSecondaryActions ? (
            <div className="teachers-list__header-actions">
              {canAddTeacher ? (
                <Link href="/admin/teachers/new" className="btn btn--primary btn--sm">
                  {t('admin.addTeacher')}
                </Link>
              ) : null}
              {canShowSecondaryActions ? (
                <details className="teachers-list__more-actions">
                  <summary className="btn btn--ghost btn--sm">المزيد</summary>
                  <div className="teachers-list__more-actions-menu">
                    <AdminListActions
                      exportPath={endpoints.admin.teachersExport}
                      exportFilename="teachers.csv"
                      showImport
                      importOpen={importOpen}
                      onToggleImport={() => setImportOpen((value) => !value)}
                    />
                  </div>
                </details>
              ) : null}
            </div>
          ) : null
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
        accountFilter={accountFilter}
        operationalPreset={operationalPreset}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchDraft}
        onSearchClear={() => setSearchDraft('')}
        onStateFilterChange={onStateFilterChange}
        onActiveFilterChange={onActiveFilterChange}
        onHasAssignmentsChange={onHasAssignmentsChange}
        onAccountFilterChange={setAccountFilter}
        onOperationalPresetChange={applyOperationalPreset}
        onReset={resetFilters}
      />

      {importOpen ? (
        <CsvImportPanel
          importPath={endpoints.admin.teachersImport}
          instructions={t('admin.academicSetup.teacherCreate.csvImportHint')}
          onDone={() => state.reload()}
        />
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
    </div>
  );
}
