'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/tables/data-table';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { AdminClassesBrowser } from '@/features/admin/classes/components/admin-classes-browser';
import { canonicalizeClassStudentCounts } from '@/features/admin/classes/utils/canonical-class-count';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useLocale } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, SchoolClass } from '@/types/class';

type ClassesPageData = { classes: SchoolClass[]; levels: Level[] };

const CLASSES_BROWSER_QUERY = { page_size: 500 };

export default function AdminClassesPage() {
  const t = useT();
  const router = useRouter();
  const { schoolViewMode, setActiveSchool } = useAdminSession();
  const allSchoolsMode = schoolViewMode === 'all';
  const { locale } = useLocale();
  const [importOpen, setImportOpen] = useState(false);
  const classesState = useGlobalAcademicYearResource<SchoolClass[]>(
    allSchoolsMode ? null : endpoints.admin.classes,
    CLASSES_BROWSER_QUERY,
  );
  // Levels are reference/options data and remain year-independent.
  const levelsState = useAdminResource<Level[]>(allSchoolsMode ? null : endpoints.admin.levels, CLASSES_BROWSER_QUERY);
  const allSchoolsState = useAdminResource<SchoolClass[]>(
    allSchoolsMode ? endpoints.admin.allSchoolsClasses : null,
    allSchoolsMode ? CLASSES_BROWSER_QUERY : undefined,
  );
  const canonicalClasses = useMemo(
    () => canonicalizeClassStudentCounts(classesState.data ?? []),
    [classesState.data],
  );

  const combinedState = useMemo<ResourceState<ClassesPageData>>(
    () => ({
      data:
        classesState.data != null
          ? { classes: canonicalClasses, levels: levelsState.data ?? [] }
          : null,
      loading: classesState.loading || levelsState.loading,
      initialLoading: classesState.initialLoading || levelsState.initialLoading,
      fetching: classesState.fetching || levelsState.fetching,
      meta: classesState.meta ?? levelsState.meta,
      error: classesState.error ?? levelsState.error,
      reload: () => {
        classesState.reload();
        levelsState.reload();
      },
    }),
    [canonicalClasses, classesState, levelsState],
  );

  const allSchoolsColumns: Column<SchoolClass>[] = useMemo(() => [
    { key: 'school', header: t('admin.activeSchool'), render: (cls) => <span dir="auto">{cls.school?.name ?? '—'}</span> },
    { key: 'class', header: t('common.class'), render: (cls) => <strong dir="auto">{cls.display_name ?? cls.name}</strong> },
    { key: 'level', header: t('nav.levels'), render: (cls) => <span dir="auto">{cls.level?.name ?? '—'}</span> },
    { key: 'students', header: t('nav.students'), render: (cls) => <span className="mono">{cls.assigned_count ?? cls.student_count}</span> },
  ], [t]);

  return (
    <div className="admin-workspace">
      <PageHeader
        title={locale === 'ar' ? 'الأقسام حسب المستوى' : 'Classes par niveau'}
        subtitle={locale === 'ar' ? 'استعرض الأقسام وجاهزيتها حسب كل مستوى دراسي.' : 'Consultez les classes et leur préparation par niveau.'}
        actions={
          !allSchoolsMode ? <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Link href="/admin/classes/distribution" className="btn btn--ghost btn--sm">
              {t('admin.classDistribution.entry')}
            </Link>
            <AdminListActions
              addHref="/admin/classes/new"
              addLabel={t('admin.createClass')}
              managePermission="manage_classes"
              exportPath={endpoints.admin.classesExport}
              exportFilename="classes.csv"
              showImport
              importOpen={importOpen}
              onToggleImport={() => setImportOpen((v) => !v)}
            />
          </div> : null
        }
      />
      {importOpen && !allSchoolsMode ? (
        <CsvImportPanel
          importPath={endpoints.admin.classesImport}
          onDone={() => combinedState.reload()}
        />
      ) : null}
      {allSchoolsMode ? <ResourceView state={allSchoolsState} loadingLabel={t('common.loading')}>
        {(classes) => <><p className="muted">عرض للقراءة فقط عبر المدارس المصرّح بها.</p><DataTable columns={allSchoolsColumns} rows={classes} rowKey={(cls) => `${cls.school?.id ?? 'active'}-${cls.id}`} onRowClick={(cls) => { if (cls.school?.id == null) return; void setActiveSchool(cls.school.id).then((switched) => { if (switched) router.push(`/admin/classes/${cls.id}`); }); }} /></>}
      </ResourceView> : <ResourceView state={combinedState} loadingLabel={t('common.loading')}>
        {(data) => <AdminClassesBrowser classes={data.classes} levels={data.levels} />}
      </ResourceView>}
    </div>
  );
}
