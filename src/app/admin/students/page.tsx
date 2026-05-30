'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { Student } from '@/types/student';

const columns: Column<Student>[] = [
  { key: 'name', header: 'Name', render: (s) => <strong>{s.full_name}</strong> },
  { key: 'code', header: 'Code', render: (s) => <span className="mono">{s.code ?? '—'}</span> },
  { key: 'class', header: 'Class', render: (s) => s.class?.name ?? '—' },
  { key: 'level', header: 'Level', render: (s) => s.level?.name ?? '—' },
  {
    key: 'parents',
    header: 'Parents',
    render: (s) => (s.parents.length ? s.parents.map((p) => p.name).join(', ') : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (s) => (
      <Badge tone={s.status === 'active' ? 'green' : 'slate'}>{statusLabel(s.status)}</Badge>
    ),
  },
];

export default function AdminStudentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const state = useResource<Student[]>(endpoints.admin.students, {
    page,
    page_size: 20,
    search: query || undefined,
  });
  const pg = state.meta?.pagination;

  return (
    <>
      <PageHeader title="Students" subtitle="All students within your access" />

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
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn--primary" type="submit">
          Search
        </button>
        {query && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setSearch('');
              setQuery('');
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </form>

      <ResourceView
        state={state}
        loadingLabel="Loading students…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🎓" title="No students found" description="Try adjusting your search." />}
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
              <Pagination
                page={pg.page}
                totalPages={pg.total_pages}
                total={pg.total}
                onPage={setPage}
              />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
