'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { studentClassLabel, studentLevelLabel } from '@/features/admin/students/utils/student-academic-labels';
import { useStudentsListFilterState } from '@/features/admin/students/hooks/use-students-list-filter-state';
import { useStudentsListView } from '@/features/admin/students/hooks/use-students-list-view';
import { StudentsKanban } from '@/features/admin/students/components/students-kanban';
import { StudentsListFilters } from '@/features/admin/students/components/students-list-filters';
import { studentsListToApiParams } from '@/features/admin/students/utils/students-list-url';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { hasStudentImportCapability } from '@/features/admin/students/import/student-import-capability';
import { canCreateStudents } from '@/lib/permissions/academic-capabilities';
import { hasPermission } from '@/lib/permissions/permissions';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Student } from '@/types/student';
import type { Level } from '@/types/class';
import '@/features/admin/students/student-360.css';

function StudentAvatar({ name }: { name: string }) {
  return (
    <span className="students-list__avatar" aria-hidden="true">
      {name.charAt(0) || '?'}
    </span>
  );
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const t = useT();
  const user = useSession();
  const canAddStudent = canCreateStudents(user);
  const canImportStudents = hasStudentImportCapability(user);
  const canShowListActions =
    canAddStudent ||
    canImportStudents ||
    hasPermission(user, 'export_data') ||
    hasPermission(user, 'import_data');
  const {
    search,
    cycleCode,
    levelId,
    classId,
    statusFilter,
    accountFilter,
    setSearch,
    clearSearch,
    setCycleCode,
    setLevelId,
    setClassId,
    setStatusFilter,
    setAccountFilter,
    setPage,
    resetFilters,
    hasActiveQuery,
    hasActiveFilters,
    appliedQuery,
  } = useStudentsListFilterState();
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useStudentsListView();

  const params = useMemo(() => studentsListToApiParams(appliedQuery), [appliedQuery]);
  const state = useAdminResource<Student[]>(endpoints.admin.students, params);
  const classesState = useAdminResource<import('@/types/class').SchoolClass[]>(endpoints.admin.classes);
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels);
  const pg = state.meta?.pagination;

  const listEmptyState = hasActiveQuery ? (
    <EmptyState
      icon="🔍"
      title={t('admin.studentsList.noMatch.title')}
      description={t('admin.studentsList.noMatch.description')}
      action={
        <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
          {t('admin.studentsList.resetFilters')}
        </button>
      }
    />
  ) : (
    <EmptyState
      title={t('admin.studentsList.noData.title')}
      description={t('admin.studentsList.noData.description')}
      action={
        canAddStudent ? (
          <Link href="/admin/students/new" className="btn btn--primary btn--sm">
            {t('admin.addStudent')}
          </Link>
        ) : undefined
      }
    />
  );

  const columns: Column<Student>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('admin.studentsList.columnStudent'),
        render: (s) => {
          const name = getStudentDisplayName(s);
          const ref = s.school_number ?? s.code ?? s.massar_code ?? null;
          return (
            <div className="students-list__student-cell">
              <StudentAvatar name={name} />
              <div className="students-list__student-text">
                <strong className="students-list__student-name" title={name} dir="auto">
                  {name}
                </strong>
                {ref ? (
                  <span className="students-list__student-ref mono muted" dir="auto" title={ref}>
                    {ref}
                  </span>
                ) : (
                  <span className="students-list__student-ref mono muted">{t('common.dash')}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'class_level',
        header: t('admin.studentsList.columnClassLevel'),
        render: (s) => (
          <span className="students-list__class-level">
            {studentClassLabel(s.class)}
            <span className="tiny muted"> · {studentLevelLabel(s.level)}</span>
          </span>
        ),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (s) => (
          <Badge tone={s.status === 'active' ? 'green' : 'slate'}>{statusLabel(t, s.status)}</Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (s) => (
          <div className="students-list__row-actions" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/admin/students/${s.id}`}
              className="students-list__view-link"
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

  return (
    <div className="students-list-page">
      <PageHeader
        title={t('nav.students')}
        subtitle={t('admin.studentsListDesc')}
        actions={
          canShowListActions ? (
            <div className="students-list__header-actions">
              <AdminListActions
                addHref="/admin/students/new"
                addLabel={t('admin.addStudent')}
                addCapability="students.create"
                managePermission="manage_students"
                exportPath={endpoints.admin.studentsExport}
                exportFilename="students.csv"
                showImport
                importOpen={importOpen}
                onToggleImport={() => setImportOpen((v) => !v)}
                extra={
                  canImportStudents ? (
                    <Link href="/admin/students/import" className="btn btn--ghost btn--sm">
                      {t('admin.studentImport.openImport')}
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : null
        }
      />

      {importOpen ? (
        <CsvImportPanel
          importPath={endpoints.admin.studentsImport}
          instructions={t('admin.studentsImportInstructions')}
          onDone={() => state.reload()}
        />
      ) : null}

      <div className="students-list__toolbar-wrap">
        <StudentsListFilters
          search={search}
          cycleCode={cycleCode}
          levelId={levelId}
          classId={classId}
          statusFilter={statusFilter}
          accountFilter={accountFilter}
          levels={levelsState.data ?? []}
          classes={classesState.data ?? []}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearch}
          onSearchClear={clearSearch}
          onCycleCodeChange={setCycleCode}
          onLevelIdChange={setLevelId}
          onClassIdChange={setClassId}
          onStatusFilterChange={setStatusFilter}
          onAccountFilterChange={setAccountFilter}
          onReset={resetFilters}
        />

        <div
          className="students-list__view-toggle"
          role="group"
          aria-label={t('admin.studentsList.viewMode')}
        >
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            {t('admin.studentsList.viewList')}
          </button>
          <button
            type="button"
            aria-pressed={view === 'kanban'}
            onClick={() => setView('kanban')}
          >
            {t('admin.studentsList.viewKanban')}
          </button>
        </div>
      </div>

      {state.fetching ? (
        <p className="students-list__fetching-hint" aria-live="polite">
          {t('admin.studentsList.refetching')}
        </p>
      ) : null}

      <div
        className={state.fetching ? 'students-list__results students-list__results--fetching' : 'students-list__results'}
        aria-busy={state.fetching || undefined}
      >
        <ResourceView
          state={state}
          loadingLabel={t('common.loading')}
          isEmpty={(d) => d.length === 0}
          empty={listEmptyState}
        >
          {(students) => (
            <>
              {view === 'kanban' ? (
                <StudentsKanban students={students} />
              ) : (
                <div className="students-list__table">
                  <DataTable
                    columns={columns}
                    rows={students}
                    rowKey={(s) => s.id}
                    onRowClick={(s) => router.push(`/admin/students/${s.id}`)}
                  />
                </div>
              )}
              {pg ? (
                <Pagination
                  page={pg.page}
                  totalPages={pg.total_pages}
                  total={pg.total}
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
