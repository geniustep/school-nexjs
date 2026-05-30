'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel, titleCase } from '@/lib/utils/labels';
import type { Parent } from '@/types/parent';

const columns: Column<Parent>[] = [
  { key: 'name', header: 'Name', render: (p) => <strong>{p.name}</strong> },
  { key: 'relation', header: 'Relation', render: (p) => (p.relation ? titleCase(p.relation) : '—') },
  { key: 'phone', header: 'Phone', render: (p) => <span className="mono">{p.phone ?? '—'}</span> },
  { key: 'email', header: 'Email', render: (p) => p.email ?? '—' },
  {
    key: 'children',
    header: 'Children',
    render: (p) => (p.children.length ? p.children.map((c) => c.full_name).join(', ') : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (p) => (
      <Badge tone={p.status === 'active' ? 'green' : 'slate'}>{statusLabel(p.status)}</Badge>
    ),
  },
];

export default function AdminParentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const state = useResource<Parent[]>(endpoints.admin.parents, {
    page,
    page_size: 20,
    search: query || undefined,
  });
  const pg = state.meta?.pagination;

  return (
    <>
      <PageHeader title="Parents" subtitle="All parents within your access" />

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
          placeholder="Search parents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn--primary" type="submit">
          Search
        </button>
      </form>

      <ResourceView
        state={state}
        loadingLabel="Loading parents…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="👪" title="No parents found" />}
      >
        {(parents) => (
          <>
            <DataTable
              columns={columns}
              rows={parents}
              rowKey={(p) => p.id}
              onRowClick={(p) => router.push(`/admin/parents/${p.id}`)}
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
