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
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useTeacherDomainContract } from '@/features/admin/teachers/hooks/use-teacher-domain-contract';
import {
  TEACHER_DOMAIN_PAGE_SIZE,
  TEACHER_DOMAIN_SEARCH_DEBOUNCE_MS,
  formatPlannedLoad,
  resolveTeacherListEmptyVariant,
  teacherAccountStateLabelKey,
  teacherDisplayName,
  teacherEmploymentState,
  teacherInitials,
  teacherPrimaryActions,
  teacherWarningCount,
} from '@/features/admin/teachers/utils/teacher-domain-present';
import { hasAllowedAction } from '@/features/admin/teachers/utils/teacher-domain-allowed-actions';
import { normalizeTeacherSummaries } from '@/features/admin/teachers/utils/teacher-domain-normalize';
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
  const [importOpen, setImportOpen] = useState(false);
  const [lifecycle, setLifecycle] = useState<{
    teacher: TeacherSummary | null;
    action: LifecycleAction;
  }>({ teacher: null, action: null });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, activeFilter, hasAssignments]);

  const query = useMemo(() => {
    const next: Record<string, string | number> = {
      page,
      page_size: TEACHER_DOMAIN_PAGE_SIZE,
    };
    const search = debouncedSearch.trim();
    if (search) next.search = search;
    if (stateFilter) next.state = stateFilter;
    if (activeFilter) next.active = activeFilter;
    if (hasAssignments) next.has_assignments = hasAssignments;
    return next;
  }, [page, debouncedSearch, stateFilter, activeFilter, hasAssignments]);

  const state = useAdminResource<TeacherSummary[]>(endpoints.admin.teachers, query);
  const teachers = useMemo(
    () => normalizeTeacherSummaries(state.data ?? []),
    [state.data],
  );
  const pg = state.meta?.pagination;
  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || stateFilter || activeFilter || hasAssignments,
  );
  const emptyVariant = resolveTeacherListEmptyVariant({
    total: pg?.total,
    hasActiveFilters,
  });

  const canAddTeacher = canShowAcademicListAdd(user, {
    legacyPermission: 'manage_teachers',
    capability: 'manage_teachers',
  });

  const listEmptyState =
    emptyVariant === 'noMatch' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.teacherDomain.list.noMatchTitle')}
        description={t('admin.teacherDomain.list.noMatchDesc')}
        action={
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setSearchDraft('');
              setStateFilter('');
              setActiveFilter('');
              setHasAssignments('');
            }}
          >
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
              <div>
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
        key: 'eligibleSubjects',
        header: t('admin.teacherDomain.columns.eligibleSubjects'),
        className: 'teachers-list__academic-col',
        render: (teacher) => {
          const count = teacher.academic_profile_summary?.subject_eligibility_count;
          const names = (teacher.subjects ?? []).map((s) => s.name).join(', ');
          const label =
            names ||
            (count != null
              ? t('admin.teacherDomain.list.subjectCount', { count })
              : t('common.dash'));
          return (
            <span className="teachers-list__academic" dir="auto" title={label}>
              {label}
            </span>
          );
        },
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
        key: 'load',
        header: t('admin.teacherDomain.columns.plannedLoad'),
        render: (teacher) => (
          <span className="teachers-list__meta" dir="ltr">
            {formatPlannedLoad(
              teacher.assignment_summary?.planned_weekly_load ?? teacher.weekly_hours_target,
              t('common.dash'),
            )}
          </span>
        ),
      },
      {
        key: 'warnings',
        header: t('admin.teacherDomain.columns.warnings'),
        render: (teacher) => {
          const count = teacherWarningCount(teacher);
          if (!count) return <span className="muted">{t('common.dash')}</span>;
          return (
            <Badge tone="amber">
              {t('admin.teacherDomain.list.warningCount', { count })}
            </Badge>
          );
        },
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

      <div className="teachers-list__filters" role="search">
        <label className="field teachers-list__search">
          <span className="sr-only">{t('common.search')}</span>
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={t('admin.teacherDomain.filters.searchPlaceholder')}
            dir="auto"
          />
        </label>
        <label className="field">
          <span>{t('admin.teacherDomain.filters.state')}</span>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">{t('admin.teacherDomain.filters.all')}</option>
            <option value="active">{t('admin.teacherDomain.states.active')}</option>
            <option value="terminated">{t('admin.teacherDomain.states.terminated')}</option>
            <option value="archived">{t('admin.teacherDomain.states.archived')}</option>
          </select>
        </label>
        <label className="field">
          <span>{t('admin.teacherDomain.filters.active')}</span>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="">{t('admin.teacherDomain.filters.all')}</option>
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
          </select>
        </label>
        <label className="field">
          <span>{t('admin.teacherDomain.filters.hasAssignments')}</span>
          <select value={hasAssignments} onChange={(e) => setHasAssignments(e.target.value)}>
            <option value="">{t('admin.teacherDomain.filters.all')}</option>
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
          </select>
        </label>
      </div>

      {importOpen ? (
        <CsvImportPanel importPath={endpoints.admin.teachersImport} onDone={() => state.reload()} />
      ) : null}

      <ResourceView
        state={{ ...state, data: teachers }}
        loadingLabel={t('common.loading')}
        isEmpty={(rows) => rows.length === 0}
        empty={listEmptyState}
      >
        {(rows) => (
          <>
            {state.fetching ? (
              <p className="tiny muted teachers-list__refetch" aria-live="polite">
                {t('admin.teacherDomain.list.refetching')}
              </p>
            ) : null}
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(teacher) => teacher.id}
              onRowClick={(teacher) => router.push(`/admin/teachers/${teacher.id}`)}
            />
            {pg ? (
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

      <TeacherLifecycleDialogs
        teacher={lifecycle.teacher}
        action={lifecycle.action}
        onClose={() => setLifecycle({ teacher: null, action: null })}
        onSuccess={() => state.reload()}
      />
    </div>
  );
}
