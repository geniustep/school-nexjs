'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { mergeAllSchoolsClassLevels } from '@/features/admin/all-schools/all-schools-academic-options';
import { useOpenSchoolRecord } from '@/features/admin/all-schools/use-open-school-record';
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
import { StudentsFilteredRosterExport } from '@/features/admin/students/components/students-filtered-roster-export';
import { isStaleStudentsListServiceSelection } from '@/features/admin/students/utils/students-list-service-visibility';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { isAllSchoolsReadMode } from '@/lib/admin/all-schools-read-mode';
import { endpoints } from '@/lib/api/endpoints';
import { hasStudentImportCapability } from '@/features/admin/students/import/student-import-capability';
import { canCreateStudents } from '@/lib/permissions/academic-capabilities';
import { hasPermission } from '@/lib/permissions/permissions';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Student } from '@/types/student';
import type { Level, SchoolClass } from '@/types/class';
import type { FeeType } from '@/types/finance';
import '@/features/admin/students/student-360.css';
import '@/features/admin/students/students-list-density.css';

type StudentListColumnKey = 'student' | 'class_level' | 'status' | 'massar' | 'birth' | 'gender' | 'phone' | 'school_number';

const DEFAULT_STUDENT_LIST_COLUMNS: StudentListColumnKey[] = ['student', 'class_level', 'status'];
const STUDENTS_FILTER_CLASS_QUERY = { page_size: 500 };

function StudentAvatar({ name }: { name: string }) {
  return (
    <span className="students-list__avatar" aria-hidden="true">
      {name.charAt(0) || '?'}
    </span>
  );
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allSchools = isAllSchoolsReadMode(pathname, searchParams);
  const { openRecord } = useOpenSchoolRecord();
  const t = useT();
  const { locale } = useLocale();
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
  const [view, setView] = useStudentsListView();
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<StudentListColumnKey[]>(DEFAULT_STUDENT_LIST_COLUMNS);
  const [columnSearch, setColumnSearch] = useState('');

  const classesState = useGlobalAcademicYearResource<SchoolClass[]>(
    endpoints.admin.classes,
    STUDENTS_FILTER_CLASS_QUERY,
  );
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, STUDENTS_FILTER_CLASS_QUERY);
  const availableLevels = useMemo(
    () =>
      allSchools
        ? mergeAllSchoolsClassLevels(classesState.data ?? [], levelsState.data ?? [])
        : levelsState.data ?? [],
    [allSchools, classesState.data, levelsState.data],
  );
  const { feeTypes, loading: feeTypesLoading } = useStudentsListFeeTypeOptions();
  const state = useStudentsListResource(
    appliedQuery,
    availableLevels,
    levelsState.loading || (allSchools && classesState.loading),
  );
  const serviceCounts = useStudentsFinancialServiceCounts(appliedQuery);
  const pg = state.meta?.pagination;

  useEffect(() => {
    if (allSchools && serviceId) clearServiceFilter();
  }, [allSchools, serviceId, clearServiceFilter]);

  const serviceFilterOptions = useMemo((): FeeType[] => {
    if (allSchools) return [];
    if (serviceCounts.initialLoading) return feeTypes;
    const byId = new Map(feeTypes.map((ft) => [ft.id, ft]));
    return serviceCounts.items.map((item) => byId.get(item.service_id)).filter((ft): ft is FeeType => ft != null);
  }, [allSchools, feeTypes, serviceCounts.initialLoading, serviceCounts.items]);

  const rosterFilterDescription = useMemo(() => {
    const parts: string[] = [];
    const ar = locale === 'ar';
    if (search.trim()) parts.push(`${ar ? 'بحث' : 'Search'}: ${search.trim()}`);
    if (cycleCode) parts.push(`${ar ? 'السلك' : 'Cycle'}: ${cycleCode}`);
    const selectedLevel = availableLevels.find((level) => String(level.id) === levelId);
    if (selectedLevel) parts.push(`${ar ? 'المستوى' : 'Level'}: ${selectedLevel.name}`);
    const selectedClass = (classesState.data ?? []).find((cls) => String(cls.id) === classId);
    if (selectedClass) parts.push(`${ar ? 'القسم' : 'Class'}: ${selectedClass.name}`);
    const selectedService = feeTypes.find((service) => String(service.id) === serviceId);
    if (!allSchools && selectedService) parts.push(`${ar ? (servicePresence === 'not_has' ? 'بدون خدمة' : 'خدمة') : 'Service'}: ${selectedService.name}`);
    if (statusFilter) parts.push(statusLabel(t, statusFilter));
    if (accountFilter) parts.push(accountFilter === 'has_account' ? (ar ? 'له حساب' : 'Has account') : accountFilter === 'no_account' ? (ar ? 'دون حساب' : 'No account') : (ar ? 'حساب غير نشط' : 'Inactive account'));
    return parts.join(' · ') || (locale === 'ar' ? 'الكل' : locale === 'fr' ? 'Tous les élèves' : 'All students');
  }, [allSchools, search, cycleCode, levelId, classId, serviceId, servicePresence, statusFilter, accountFilter, availableLevels, classesState.data, feeTypes, t, locale]);

  useEffect(() => {
    if (allSchools || !serviceId) return;
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
  }, [allSchools, serviceId, feeTypes, feeTypesLoading, serviceCounts.initialLoading, serviceCounts.items, clearServiceFilter]);

  const listEmptyState = hasActiveQuery ? (
    <EmptyState icon="🔍" title={t('admin.studentsList.noMatch.title')} description={t('admin.studentsList.noMatch.description')}
      action={<button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>{t('admin.studentsList.resetFilters')}</button>} />
  ) : (
    <EmptyState title={t('admin.studentsList.noData.title')} description={t('admin.studentsList.noData.description')}
      action={canAddStudent ? <Link href="/admin/students/new" className="btn btn--primary btn--sm students-list__quick-create-trigger"><span aria-hidden="true">+</span>{t('admin.studentsList.quickCreate.submit')}</Link> : undefined} />
  );

  const tableLabels = useMemo(() => locale === 'ar'
    ? { customize: 'تخصيص الأعمدة', add: 'أضف عمودًا…', none: 'لا توجد أعمدة مطابقة.', massar: 'رقم مسار', birth: 'تاريخ الازدياد', gender: 'الجنس', phone: 'هاتف التواصل', schoolNumber: 'رقم التلميذ', male: 'ذكر', female: 'أنثى', moveBefore: 'حرّك قبل', moveAfter: 'حرّك بعد', remove: 'حذف' }
    : { customize: 'Customize columns', add: 'Add a column…', none: 'No matching columns.', massar: 'Massar code', birth: 'Date of birth', gender: 'Gender', phone: 'Contact phone', schoolNumber: 'Student number', male: 'Male', female: 'Female', moveBefore: 'Move earlier', moveAfter: 'Move later', remove: 'Remove' }, [locale]);

  const availableColumns: Column<Student>[] = useMemo(() => [
    {
      key: 'student', header: t('admin.studentsList.columnStudent'), render: (s) => {
        const name = getStudentDisplayName(s);
        const ref = s.school_number ?? s.code ?? s.massar_code ?? null;
        const meta = [ref, s.school?.name].filter((value): value is string => Boolean(value?.trim())).join(' · ');
        return <div className="students-list__student-cell"><StudentAvatar name={name} /><div className="students-list__student-text">
          <strong className="students-list__student-name" title={name} dir="auto">{name}</strong>
          {meta ? <span className="students-list__student-ref mono muted" dir="auto" title={meta}>{meta}</span> : null}
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
    {
      key: 'massar', header: tableLabels.massar, render: (s) => <span dir="ltr" className="mono">{s.massar_code ?? '—'}</span>,
    },
    {
      key: 'birth', header: tableLabels.birth, render: (s) => s.date_of_birth ? <span dir="ltr">{s.date_of_birth}</span> : '—',
    },
    {
      key: 'gender', header: tableLabels.gender, render: (s) => s.gender === 'male' ? tableLabels.male : s.gender === 'female' ? tableLabels.female : '—',
    },
    {
      key: 'phone', header: tableLabels.phone, render: (s) => {
        const phones = Array.from(new Set((s.parents ?? []).map((parent) => parent.phone?.trim()).filter((phone): phone is string => Boolean(phone))));
        return <span dir="ltr">{s.phone?.trim() || phones.join(' · ') || '—'}</span>;
      },
    },
    {
      key: 'school_number', header: tableLabels.schoolNumber, render: (s) => <span dir="ltr" className="mono">{s.school_number ?? s.code ?? s.matricule ?? '—'}</span>,
    },
  ], [t, tableLabels]);
  const columns = useMemo(() => visibleColumnKeys
    .map((key) => availableColumns.find((column) => column.key === key))
    .filter((column): column is Column<Student> => column != null), [availableColumns, visibleColumnKeys]);
  const availableToAdd = useMemo(() => {
    const searchValue = columnSearch.trim().toLocaleLowerCase(locale);
    return availableColumns.filter((column) => !visibleColumnKeys.includes(column.key as StudentListColumnKey)
      && (!searchValue || String(column.header).toLocaleLowerCase(locale).includes(searchValue)));
  }, [availableColumns, columnSearch, locale, visibleColumnKeys]);

  function addColumn(key: StudentListColumnKey) {
    setVisibleColumnKeys((current) => current.includes(key) ? current : [...current, key]);
    setColumnSearch('');
  }

  function removeColumn(key: StudentListColumnKey) {
    if (key === 'student') return;
    setVisibleColumnKeys((current) => current.filter((item) => item !== key));
  }

  function moveColumn(key: StudentListColumnKey, targetIndex: number) {
    setVisibleColumnKeys((current) => {
      const sourceIndex = current.indexOf(key);
      if (sourceIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, key);
      return next;
    });
  }

  return (
    <div className="students-list-page">
      <PageHeader
        title={t('nav.students')}
        actions={canAddStudent || canShowSecondaryActions ? <div className="students-list__header-actions">
          {canAddStudent ? <Link href="/admin/students/new" className="btn btn--primary btn--sm students-list__quick-create-trigger"><span aria-hidden="true">+</span>{t('admin.studentsList.quickCreate.submit')}</Link> : null}
          {canShowSecondaryActions ? <details className="students-list__more-actions">
            <summary className="btn btn--ghost btn--sm">{t('common.more')}</summary>
            <div className="students-list__more-actions-menu">
              <AdminListActions
                exportPath={endpoints.admin.studentsExport}
                exportFilename="students.csv"
                showImport
                importOpen={importOpen}
                onToggleImport={() => setImportOpen((v) => !v)}
                readOnly={allSchools}
                preserveReadOnlyGeometry={allSchools}
                extra={canExportStudents || canImportStudents || canAddStudent ? <>
                  {canExportStudents ? <StudentsFilteredRosterExport filters={appliedQuery} levels={availableLevels} filterDescription={rosterFilterDescription} /> : null}
                  {canAddStudent ? <Link href="/admin/students/family/new" className="btn btn--ghost btn--sm">{t('admin.student360.familyRegistration.entryFromList')}</Link> : null}
                  {canImportStudents ? <Link href="/admin/students/import" className="btn btn--ghost btn--sm">{t('admin.studentImport.openImport')}</Link> : null}
                </> : null}
              />
            </div>
          </details> : null}
        </div> : null}
      />

      {!allSchools && importOpen ? <CsvImportPanel importPath={endpoints.admin.studentsImport} instructions={t('admin.studentsImportInstructions')} onDone={() => state.reload()} /> : null}

      <StudentsFinancialServiceCountCards
        items={allSchools ? [] : serviceCounts.items} feeTypes={feeTypes} totalStudents={allSchools ? pg?.total ?? 0 : serviceCounts.totalStudents}
        initialLoading={allSchools ? false : serviceCounts.initialLoading} fetching={allSchools ? false : serviceCounts.fetching} error={allSchools ? null : serviceCounts.error}
        serviceId={allSchools ? '' : serviceId} servicePresence={allSchools ? '' : servicePresence}
        onSelectAll={clearServiceFilter} onSelectService={selectServiceHas} onRetry={serviceCounts.reload}
        readOnly={allSchools}
      />

      <div className="students-list__toolbar-wrap">
        <StudentsListFilters
          search={search} cycleCode={cycleCode} levelId={levelId} classId={classId}
          statusFilter={statusFilter} accountFilter={accountFilter} serviceId={allSchools ? '' : serviceId} servicePresence={allSchools ? '' : servicePresence}
          levels={availableLevels} classes={classesState.data ?? []} feeTypes={serviceFilterOptions}
          feeTypesLoading={allSchools ? false : feeTypesLoading || serviceCounts.initialLoading} serviceReadOnly={allSchools} hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearch} onSearchClear={clearSearch} onCycleCodeChange={setCycleCode}
          onLevelIdChange={setLevelId} onClassIdChange={setClassId} onStatusFilterChange={setStatusFilter}
          onAccountFilterChange={setAccountFilter} onServiceIdChange={setServiceId}
          onServicePresenceChange={setServicePresence} onReset={resetFilters}
        />
        <div className="students-list__view-toggle" role="group" aria-label={t('admin.studentsList.viewMode')}>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>{t('admin.studentsList.viewList')}</button>
          <button type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')}>{t('admin.studentsList.viewKanban')}</button>
        </div>
        {view === 'list' ? <details className="students-list__more-actions">
          <summary className="btn btn--ghost btn--sm">{tableLabels.customize}</summary>
          <div className="students-list__more-actions-menu" style={{ minWidth: 330 }}>
            <div className="col" style={{ gap: 8 }}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {visibleColumnKeys.map((key, index) => {
                  const column = availableColumns.find((item) => item.key === key);
                  const label = String(column?.header ?? key);
                  return <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 6px', border: '1px solid var(--c-border)', borderRadius: 999, background: 'var(--c-surface-2)' }}>
                    {label}
                    <button type="button" className="btn btn--ghost btn--sm" disabled={index === 0} aria-label={tableLabels.moveBefore} onClick={() => moveColumn(key, index - 1)}>↑</button>
                    <button type="button" className="btn btn--ghost btn--sm" disabled={index === visibleColumnKeys.length - 1} aria-label={tableLabels.moveAfter} onClick={() => moveColumn(key, index + 1)}>↓</button>
                    {key !== 'student' ? <button type="button" className="btn btn--ghost btn--sm" aria-label={tableLabels.remove} onClick={() => removeColumn(key)}>×</button> : null}
                  </span>;
                })}
              </div>
              <input type="search" value={columnSearch} onChange={(event) => setColumnSearch(event.target.value)} placeholder={tableLabels.add} aria-label={tableLabels.add} />
              {columnSearch ? <div className="col" style={{ gap: 4 }}>
                {availableToAdd.length ? availableToAdd.map((column) => <button key={column.key} type="button" className="btn btn--ghost btn--sm" style={{ justifyContent: 'flex-start' }} onClick={() => addColumn(column.key as StudentListColumnKey)}>+ {column.header}</button>) : <span className="muted tiny">{tableLabels.none}</span>}
              </div> : null}
            </div>
          </div>
        </details> : null}
      </div>

      {state.fetching ? <p className="students-list__fetching-hint" aria-live="polite">{t('admin.studentsList.refetching')}</p> : null}
      <div className={state.fetching ? 'students-list__results students-list__results--fetching' : 'students-list__results'} aria-busy={state.fetching || undefined}>
        <ResourceView state={state} loadingLabel={t('common.loading')} isEmpty={(d) => d.length === 0} empty={listEmptyState}>
          {(students) => <>
            {view === 'kanban' ? <StudentsKanban students={students} /> : <div className="students-list__table"><DataTable columns={columns} rows={students} rowKey={(s) => s.id} onRowClick={(s) => {
              const href = `/admin/students/${s.id}`;
              if (allSchools && s.school?.id) {
                void openRecord(s.school.id, href);
                return;
              }
              router.push(href);
            }} /></div>}
            {pg ? <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} /> : null}
          </>}
        </ResourceView>
      </div>
    </div>
  );
}
