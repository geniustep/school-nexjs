'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { studentClassLabel, studentLevelLabel } from '@/features/admin/students/utils/student-academic-labels';
import { useStudentsListFilterState } from '@/features/admin/students/hooks/use-students-list-filter-state';
import { useStudentsListResource } from '@/features/admin/students/hooks/use-students-list-resource';
import { useStudentsFinancialServiceCounts } from '@/features/admin/students/hooks/use-students-financial-service-counts';
import { useStudentsListFeeTypeOptions } from '@/features/admin/students/hooks/use-students-list-fee-type-options';
import { useStudentsListView } from '@/features/admin/students/hooks/use-students-list-view';
import { StudentsKanban } from '@/features/admin/students/components/students-kanban';
import { StudentsListFilters } from '@/features/admin/students/components/students-list-filters';
import { StudentsFinancialServiceCountCards } from '@/features/admin/students/components/students-financial-service-count-cards';
import { StudentQuickCreateDialog } from '@/features/admin/students/components/student-quick-create-dialog';
import { isStaleStudentsListServiceSelection } from '@/features/admin/students/utils/students-list-service-visibility';
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
import type { FeeType } from '@/types/finance';
import '@/features/admin/students/student-360.css';
import '@/features/admin/students/students-list-density.css';

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
  const canExportStudents = hasPermission(user, 'export_data');
  const canImportCsv = hasPermission(user, 'import_data');
  const canShowSecondaryActions = canAddStudent || canImportStudents || canExportStudents || canImportCsv;
  const {
    search, cycleCode, levelId, classId, statusFilter, accountFilter, serviceId, servicePresence,
    setSearch, clearSearch, setCycleCode, setLevelId, setClassId, setStatusFilter, setAccountFilter,
    setServiceId, selectServiceHas, clearServiceFilter, setServicePresence, setPage, resetFilters,
    hasActiveQuery, hasActiveFilters, appliedQuery,
  } = useStudentsListFilterState();
  const [importOpen, setImportOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [view, setView] = useStudentsListView();

  const classesState = useGlobalAcademicYearResource<import('@/types/class').SchoolClass[]>(
    endpoints.admin.classes,
  );
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels);
  const { feeTypes, loading: feeTypesLoading } = useStudentsListFeeTypeOptions();
  const state = useStudentsListResource(appliedQuery, levelsState.data, levelsState.loading);
  const serviceCounts = useStudentsFinancialServiceCounts(appliedQuery);
  const pg = state.meta?.pagination;

  const serviceFilterOptions = useMemo((): FeeType[] => {
    if (serviceCounts.initialLoading) return feeTypes;
    const byId = new Map(feeTypes.map((ft) => [ft.id, ft]));
    return serviceCounts.items.map((item) => byId.get(item.service_id)).filter((ft): ft is FeeType => ft != null);
  }, [feeTypes, serviceCounts.initialLoading, serviceCounts.items]);

  useEffect(() => {
    if (!serviceId) return;
    const feeTypesLoaded = !feeTypesLoading;
    const countsLoaded = !serviceCounts.initialLoading;
    if (!feeTypesLoaded && !countsLoaded) return;
    const stale = isStaleStudentsListServiceSelection(serviceId, {
      feeTypesLoaded,
      feeTypeIds: feeTypes.map((ft) => ft.id),
      countsLoaded,
      countServiceIds: serviceCounts.items.map((item) => item.service_id),
    });
    if (stale) clearServiceFilter();
  }, [serviceId, feeTypes, feeTypesLoading, serviceCounts.initialLoading, serviceCounts.items, clearServiceFilter]);

  const listEmptyState = hasActiveQuery ? (
    <EmptyState icon="🔍" title={t('admin.studentsList.noMatch.title')} description={t('admin.studentsList.noMatch.description')}
      action={<button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>{t('admin.studentsList.resetFilters')}</button>} />
  ) : (
    <EmptyState title={t('admin.studentsList.noData.title')} description={t('admin.studentsList.noData.description')}
      action={canAddStudent ? <button type="button" className="btn btn--primary btn--sm students-list__quick-create-trigger" onClick={() => setQuickCreateOpen(true)}><span aria-hidden="true">+</span>{t('admin.studentsList.quickCreate.trigger')}</button> : undefined} />
  );

  const columns: Column<Student>[] = useMemo(() => [
    {
      key: 'student', header: t('admin.studentsList.columnStudent'), render: (s) => {
        const name = getStudentDisplayName(s);
        const ref = s.school_number ?? s.code ?? s.massar_code ?? null;
        return <div className="students-list__student-cell"><StudentAvatar name={name} /><div className="students-list__student-text">
          <strong className="students-list__student-name" title={name} dir="auto">{name}</strong>
          {ref ? <span className="students-list__student-ref mono muted" dir="auto" title={ref}>{ref}</span> : null}
        </div></div>;
      },
    },
    {
      key: 'class_level', header: t('admin.studentsList.columnClassLevel'), render: (s) => <span className="students-list__class-level">
        {studentClassLabel(s.class)}<span className="tiny muted"> · {studentLevelLabel(s.level)}</span>
      </span>,
    },
    {
      key: 'status', header: t('academic.status'), render: (s) => s.status === 'active' ? null : <Badge tone="slate">{statusLabel(t, s.status)}</Badge>,
    },
  ], [t]);

  return (
    <div className="students-list-page">
      <PageHeader
        title={t('nav.students')}
        actions={canAddStudent || canShowSecondaryActions ? <div className="students-list__header-actions">
          {canAddStudent ? <>
            <button type="button" className="btn btn--primary btn--sm students-list__quick-create-trigger" onClick={() => setQuickCreateOpen(true)}><span aria-hidden="true">+</span>{t('admin.studentsList.quickCreate.trigger')}</button>
            <Link href="/admin/students/new" className="btn btn--ghost btn--sm">{t('admin.studentsList.quickCreate.fullRegistration')}</Link>
          </> : null}
          {canShowSecondaryActions ? <details className="students-list__more-actions">
            <summary className="btn btn--ghost btn--sm">{t('common.more')}</summary>
            <div className="students-list__more-actions-menu">
              <AdminListActions
                exportPath={endpoints.admin.studentsExport}
                exportFilename="students.csv"
                showImport
                importOpen={importOpen}
                onToggleImport={() => setImportOpen((v) => !v)}
                extra={canImportStudents || canAddStudent ? <>
                  {canAddStudent ? <Link href="/admin/students/family/new" className="btn btn--ghost btn--sm">{t('admin.student360.familyRegistration.entryFromList')}</Link> : null}
                  {canImportStudents ? <Link href="/admin/students/import" className="btn btn--ghost btn--sm">{t('admin.studentImport.openImport')}</Link> : null}
                </> : null}
              />
            </div>
          </details> : null}
        </div> : null}
      />

      {importOpen ? <CsvImportPanel importPath={endpoints.admin.studentsImport} instructions={t('admin.studentsImportInstructions')} onDone={() => state.reload()} /> : null}
      {quickCreateOpen ? <StudentQuickCreateDialog open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} onCreated={() => state.reload()} /> : null}

      <StudentsFinancialServiceCountCards
        items={serviceCounts.items} feeTypes={feeTypes} totalStudents={serviceCounts.totalStudents}
        initialLoading={serviceCounts.initialLoading} fetching={serviceCounts.fetching} error={serviceCounts.error}
        serviceId={serviceId} servicePresence={servicePresence}
        onSelectAll={clearServiceFilter} onSelectService={selectServiceHas} onRetry={serviceCounts.reload}
      />

      <div className="students-list__toolbar-wrap">
        <StudentsListFilters
          search={search} cycleCode={cycleCode} levelId={levelId} classId={classId}
          statusFilter={statusFilter} accountFilter={accountFilter} serviceId={serviceId} servicePresence={servicePresence}
          levels={levelsState.data ?? []} classes={classesState.data ?? []} feeTypes={serviceFilterOptions}
          feeTypesLoading={feeTypesLoading || serviceCounts.initialLoading} hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearch} onSearchClear={clearSearch} onCycleCodeChange={setCycleCode}
          onLevelIdChange={setLevelId} onClassIdChange={setClassId} onStatusFilterChange={setStatusFilter}
          onAccountFilterChange={setAccountFilter} onServiceIdChange={setServiceId}
          onServicePresenceChange={setServicePresence} onReset={resetFilters}
        />
        <div className="students-list__view-toggle" role="group" aria-label={t('admin.studentsList.viewMode')}>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>{t('admin.studentsList.viewList')}</button>
          <button type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')}>{t('admin.studentsList.viewKanban')}</button>
        </div>
      </div>

      {state.fetching ? <p className="students-list__fetching-hint" aria-live="polite">{t('admin.studentsList.refetching')}</p> : null}
      <div className={state.fetching ? 'students-list__results students-list__results--fetching' : 'students-list__results'} aria-busy={state.fetching || undefined}>
        <ResourceView state={state} loadingLabel={t('common.loading')} isEmpty={(d) => d.length === 0} empty={listEmptyState}>
          {(students) => <>
            {view === 'kanban' ? <StudentsKanban students={students} /> : <div className="students-list__table"><DataTable columns={columns} rows={students} rowKey={(s) => s.id} onRowClick={(s) => router.push(`/admin/students/${s.id}`)} /></div>}
            {pg ? <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} /> : null}
          </>}
        </ResourceView>
      </div>
    </div>
  );
}
