'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel, titleCase } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Parent } from '@/types/parent';

export default function AdminParentsPage() {
  const router = useRouter();
  const t = useT();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const state = useAdminResource<Parent[]>(endpoints.admin.parents, { page, page_size: 20, search: query || undefined });
  const pg = state.meta?.pagination;

  const columns: Column<Parent>[] = useMemo(
    () => [
      { key: 'name', header: t('admin.fullName'), render: (p) => <strong>{p.name}</strong> },
      { key: 'phone', header: t('admin.phone'), render: (p) => <span className="mono">{p.phone ?? t('common.dash')}</span> },
      { key: 'email', header: t('admin.email'), render: (p) => p.email ?? t('common.dash') },
      {
        key: 'children',
        header: t('admin.linkedChildren'),
        render: (p) =>
          (p.children ?? []).length
            ? (p.children ?? []).map((c) => getStudentDisplayName(c)).join(', ')
            : t('common.dash'),
      },
      {
        key: 'lang',
        header: t('admin.preferredLanguage'),
        render: (p) => p.preferred_language ?? t('common.dash'),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (p) => (
          <Badge tone={p.status === 'active' ? 'green' : 'slate'}>{statusLabel(p.status)}</Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <>
      <PageHeader
        title={t('nav.parents')}
        subtitle={t('admin.parentsListDesc')}
        actions={
          <AdminListActions
            addHref="/admin/parents/new"
            managePermission="manage_parents"
            exportPath={endpoints.admin.parentsExport}
            exportFilename="parents.csv"
            showImport
            importOpen={importOpen}
            onToggleImport={() => setImportOpen((v) => !v)}
          />
        }
      />
      {importOpen && <CsvImportPanel importPath={endpoints.admin.parentsImport} onDone={() => state.reload()} />}
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
        <input className="input" placeholder={t('admin.searchParents')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn--primary" type="submit">{t('admin.search')}</button>
      </form>
      <ResourceView state={state} loadingLabel={t('common.loading')} isEmpty={(d) => d.length === 0} empty={<EmptyState icon="👪" title={t('empty.children')} />}>
        {(parents) => (
          <>
            <DataTable columns={columns} rows={parents} rowKey={(p) => p.id} onRowClick={(p) => router.push(`/admin/parents/${p.id}`)} />
            {pg && <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />}
          </>
        )}
      </ResourceView>
    </>
  );
}
