'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Subject } from '@/types/class';

export default function AdminSubjectsPage() {
  const router = useRouter();
  const t = useT();
  const [importOpen, setImportOpen] = useState(false);
  const state = useAdminResource<Subject[]>(endpoints.admin.subjects);

  const columns: Column<Subject>[] = useMemo(
    () => [
      { key: 'name', header: t('nav.subjects'), render: (s) => <strong>{s.name}</strong> },
      { key: 'code', header: t('admin.code'), render: (s) => s.code ?? t('common.dash') },
    ],
    [t],
  );

  return (
    <>
      <PageHeader
        title={t('nav.subjects')}
        subtitle={t('admin.subjectsListDesc')}
        actions={
          <AdminListActions
            addHref="/admin/subjects/new"
            managePermission="manage_classes"
            exportPath={endpoints.admin.subjectsExport}
            exportFilename="subjects.csv"
            showImport
            importOpen={importOpen}
            onToggleImport={() => setImportOpen((v) => !v)}
          />
        }
      />
      {importOpen && <CsvImportPanel importPath={endpoints.admin.subjectsImport} onDone={() => state.reload()} />}
      <ResourceView state={state} loadingLabel={t('common.loading')} isEmpty={(d) => d.length === 0} empty={<EmptyState icon="📖" title={t('admin.noSubjects')} />}>
        {(subjects) => (
          <DataTable columns={columns} rows={subjects} rowKey={(s) => s.id} onRowClick={(s) => router.push(`/admin/subjects/${s.id}`)} />
        )}
      </ResourceView>
    </>
  );
}
