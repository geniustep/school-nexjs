'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo, useState } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { AdminClassesBrowser } from '@/features/admin/classes/components/admin-classes-browser';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, SchoolClass } from '@/types/class';

type ClassesPageData = { classes: SchoolClass[]; levels: Level[] };

export default function AdminClassesPage() {
  const t = useT();
  const [importOpen, setImportOpen] = useState(false);
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels);

  const combinedState = useMemo<ResourceState<ClassesPageData>>(
    () => ({
      data:
        classesState.data != null
          ? { classes: classesState.data, levels: levelsState.data ?? [] }
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
    [classesState, levelsState],
  );

  return (
    <div className="admin-workspace">
      <PageHeader
        title={t('nav.classes')}
        subtitle={t('admin.classesListDesc')}
        actions={
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
        }
      />
      {importOpen ? (
        <CsvImportPanel
          importPath={endpoints.admin.classesImport}
          onDone={() => combinedState.reload()}
        />
      ) : null}
      <ResourceView state={combinedState} loadingLabel={t('common.loading')}>
        {(data) => <AdminClassesBrowser classes={data.classes} levels={data.levels} />}
      </ResourceView>
    </div>
  );
}
