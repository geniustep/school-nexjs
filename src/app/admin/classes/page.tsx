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
import { statusLabel } from '@/lib/utils/labels';
import type { SchoolClass } from '@/types/class';

export default function AdminClassesPage() {
  const router = useRouter();
  const t = useT();
  const [importOpen, setImportOpen] = useState(false);
  const state = useAdminResource<SchoolClass[]>(endpoints.admin.classes);

  const columns: Column<SchoolClass>[] = useMemo(
    () => [
      { key: 'name', header: t('nav.classes'), render: (c) => <strong>{c.name}</strong> },
      { key: 'level', header: t('nav.levels'), render: (c) => c.level?.name ?? t('common.dash') },
      { key: 'students', header: t('nav.students'), render: (c) => <span className="mono">{c.student_count}{c.capacity ? ` / ${c.capacity}` : ''}</span> },
      { key: 'status', header: t('academic.status'), render: (c) => <Badge tone={c.status === 'active' ? 'green' : 'slate'}>{statusLabel(c.status)}</Badge> },
    ],
    [t],
  );

  return (
    <>
      <PageHeader
        title={t('nav.classes')}
        subtitle={t('admin.classesListDesc')}
        actions={
          <AdminListActions
            addHref="/admin/classes/new"
            managePermission="manage_classes"
            exportPath={endpoints.admin.classesExport}
            exportFilename="classes.csv"
            showImport
            importOpen={importOpen}
            onToggleImport={() => setImportOpen((v) => !v)}
          />
        }
      />
      {importOpen && <CsvImportPanel importPath={endpoints.admin.classesImport} onDone={() => state.reload()} />}
      <ResourceView state={state} loadingLabel={t('common.loading')} isEmpty={(d) => d.length === 0} empty={<EmptyState icon="🏫" title={t('empty.classes')} />}>
        {(classes) => <DataTable columns={columns} rows={classes} rowKey={(c) => c.id} onRowClick={(c) => router.push(`/admin/classes/${c.id}`)} />}
      </ResourceView>
    </>
  );
}
