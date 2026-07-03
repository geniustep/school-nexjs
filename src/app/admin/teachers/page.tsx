'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { Teacher } from '@/types/teacher';

export default function AdminTeachersPage() {
  const router = useRouter();
  const t = useT();
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const state = useAdminResource<Teacher[]>(endpoints.admin.teachers, { page, page_size: 20 });
  const pg = state.meta?.pagination;

  const columns: Column<Teacher>[] = useMemo(
    () => [
      { key: 'name', header: t('admin.fullName'), render: (te) => <strong>{te.name}</strong> },
      { key: 'code', header: t('admin.code'), render: (te) => <span className="mono">{te.code ?? t('common.dash')}</span> },
      { key: 'classes', header: t('nav.classes'), render: (te) => (te.classes.length ? te.classes.map((c) => c.name).join(', ') : t('common.dash')) },
      { key: 'subjects', header: t('nav.subjects'), render: (te) => (te.subjects.length ? te.subjects.map((s) => s.name).join(', ') : t('common.dash')) },
      { key: 'status', header: t('academic.status'), render: (te) => <Badge tone={te.status === 'active' ? 'green' : 'slate'}>{statusLabel(t, te.status)}</Badge> },
    ],
    [t],
  );

  return (
    <>
      <PageHeader
        title={t('nav.teachers')}
        subtitle={t('admin.teachersListDesc')}
        actions={
          <AdminListActions
            addHref="/admin/teachers/new"
            addCapability="manage_teachers"
            managePermission="manage_teachers"
            exportPath={endpoints.admin.teachersExport}
            exportFilename="teachers.csv"
            showImport
            importOpen={importOpen}
            onToggleImport={() => setImportOpen((v) => !v)}
          />
        }
      />
      {importOpen && <CsvImportPanel importPath={endpoints.admin.teachersImport} onDone={() => state.reload()} />}
      <ResourceView state={state} loadingLabel={t('common.loading')} isEmpty={(d) => d.length === 0} empty={<EmptyState icon="👩‍🏫" title={t('empty.classes')} />}>
        {(teachers) => (
          <>
            <DataTable columns={columns} rows={teachers} rowKey={(te) => te.id} onRowClick={(te) => router.push(`/admin/teachers/${te.id}`)} />
            {pg && <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />}
          </>
        )}
      </ResourceView>
    </>
  );
}
