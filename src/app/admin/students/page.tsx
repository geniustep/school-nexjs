'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { hasStudentImportCapability } from '@/features/admin/students/import/student-import-capability';
import { hasPermission } from '@/lib/permissions/permissions';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Student } from '@/types/student';
import type { ListParams } from '@/types/api';
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
  const canManageStudents = hasPermission(user, 'manage_students');
  const canImportStudents = hasStudentImportCapability(user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [classId, setClassId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classId, levelId, statusFilter, accountFilter]);

  const params: ListParams = {
    page,
    page_size: 20,
    search: debouncedSearch.trim() || undefined,
    class_id: classId || undefined,
    level_id: levelId || undefined,
    status: statusFilter || undefined,
    has_account:
      accountFilter === 'has_account'
        ? 'true'
        : accountFilter === 'no_account'
          ? 'false'
          : undefined,
    account_status: accountFilter === 'inactive_account' ? 'inactive' : undefined,
  };
  const state = useAdminResource<Student[]>(endpoints.admin.students, params);
  const classesState = useAdminResource<import('@/types/class').SchoolClass[]>(endpoints.admin.classes);
  const levelsState = useAdminResource<import('@/types/api').Ref[]>(endpoints.admin.levels);
  const pg = state.meta?.pagination;

  const hasActiveFilters = !!(debouncedSearch || classId || levelId || statusFilter || accountFilter);

  function resetFilters() {
    setSearch('');
    setClassId('');
    setLevelId('');
    setStatusFilter('');
    setAccountFilter('');
    setPage(1);
  }

  const columns: Column<Student>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('admin.studentsList.columnStudent'),
        render: (s) => (
          <div className="students-list__student-cell">
            <StudentAvatar name={getStudentDisplayName(s)} />
            <div>
              <strong>{getStudentDisplayName(s)}</strong>
              <span className="tiny mono muted">
                {s.school_number ?? s.code ?? s.massar_code ?? t('common.dash')}
              </span>
            </div>
          </div>
        ),
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
            <Link href={`/admin/students/${s.id}`} className="btn btn--ghost btn--sm">
              {t('common.view')}
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
        subtitle={
          pg
            ? t('admin.studentsList.subtitleWithCount', { total: pg.total })
            : t('admin.studentsListDesc')
        }
        actions={
          canManageStudents ? (
            <div className="students-list__header-actions">
              <Link href="/admin/students/new" className="btn btn--primary btn--sm">
                {t('admin.addStudent')}
              </Link>
              <AdminListActions
                addHref={undefined}
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

      <div className="students-list__toolbar">
        <input
          className="input students-list__search"
          placeholder={t('admin.searchStudents')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('admin.searchStudents')}
        />
        <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">{t('admin.allClasses')}</option>
          {(classesState.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
          <option value="">{t('admin.allLevels')}</option>
          {(levelsState.data ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t('admin.allStates')}</option>
          <option value="active">{t('states.active')}</option>
          <option value="suspended">{t('states.suspended')}</option>
        </select>
        <select className="input" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="">{t('admin.account.filterAll')}</option>
          <option value="has_account">{t('admin.account.filterHasAccount')}</option>
          <option value="no_account">{t('admin.account.filterNoAccount')}</option>
          <option value="inactive_account">{t('admin.account.filterInactiveAccount')}</option>
        </select>
        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.studentsList.resetFilters')}
          </button>
        ) : null}
      </div>

      {pg ? (
        <p className="students-list__results tiny muted">
          {t('admin.studentsList.resultsCount', { count: pg.total })}
        </p>
      ) : null}

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState title={t('empty.students')} description={t('admin.adjustSearch')} />}
      >
        {(students) => (
          <>
            <div className="students-list__table">
              <DataTable
                columns={columns}
                rows={students}
                rowKey={(s) => s.id}
                onRowClick={(s) => router.push(`/admin/students/${s.id}`)}
              />
            </div>
            {pg ? (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            ) : null}
          </>
        )}
      </ResourceView>
    </div>
  );
}
