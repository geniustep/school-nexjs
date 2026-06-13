'use client';

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
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Student } from '@/types/student';
import type { ListParams } from '@/types/api';

export default function AdminStudentsPage() {
  const router = useRouter();
  const t = useT();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const params: ListParams = {
    page,
    page_size: 20,
    search: query || undefined,
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

  const columns: Column<Student>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.fullName'),
        render: (s) => <strong>{getStudentDisplayName(s)}</strong>,
      },
      {
        key: 'first_name',
        header: t('admin.personalName'),
        render: (s) => s.first_name?.trim() || t('common.dash'),
      },
      {
        key: 'last_name',
        header: t('admin.familyName'),
        render: (s) => s.last_name?.trim() || t('common.dash'),
      },
      {
        key: 'massar',
        header: t('admin.massarCode'),
        render: (s) => <span className="mono">{s.massar_code ?? t('common.dash')}</span>,
      },
      {
        key: 'school_number',
        header: t('admin.student360.schoolNumber'),
        render: (s) => <span className="mono">{s.school_number ?? s.code ?? t('common.dash')}</span>,
      },
      { key: 'class', header: t('nav.classes'), render: (s) => studentClassLabel(s.class) },
      { key: 'level', header: t('nav.levels'), render: (s) => studentLevelLabel(s.level) },
      {
        key: 'status',
        header: t('academic.status'),
        render: (s) => (
          <Badge tone={s.status === 'active' ? 'green' : 'slate'}>{statusLabel(t, s.status)}</Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <>
      <PageHeader
        title={t('nav.students')}
        subtitle={t('admin.studentsListDesc')}
        actions={
          <AdminListActions
            addHref="/admin/students/new"
            managePermission="manage_students"
            exportPath={endpoints.admin.studentsExport}
            exportFilename="students.csv"
            showImport
            importOpen={importOpen}
            onToggleImport={() => setImportOpen((v) => !v)}
          />
        }
      />

      {importOpen && (
        <CsvImportPanel
          importPath={endpoints.admin.studentsImport}
          instructions={t('admin.studentsImportInstructions')}
          onDone={() => state.reload()}
        />
      )}

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          className="input"
          placeholder={t('admin.searchStudents')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allClasses')}</option>
          {(classesState.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input" value={levelId} onChange={(e) => { setLevelId(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allLevels')}</option>
          {(levelsState.data ?? []).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allStates')}</option>
          <option value="active">{t('states.active')}</option>
          <option value="suspended">{t('states.suspended')}</option>
        </select>
        <select className="input" value={accountFilter} onChange={(e) => { setAccountFilter(e.target.value); setPage(1); }}>
          <option value="">{t('admin.account.filterAll')}</option>
          <option value="has_account">{t('admin.account.filterHasAccount')}</option>
          <option value="no_account">{t('admin.account.filterNoAccount')}</option>
          <option value="inactive_account">{t('admin.account.filterInactiveAccount')}</option>
        </select>
        <button className="btn btn--primary" type="submit">{t('admin.search')}</button>
      </form>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🎓" title={t('empty.students')} description={t('admin.adjustSearch')} />}
      >
        {(students) => (
          <>
            <DataTable
              columns={columns}
              rows={students}
              rowKey={(s) => s.id}
              onRowClick={(s) => router.push(`/admin/students/${s.id}`)}
            />
            {pg && (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
