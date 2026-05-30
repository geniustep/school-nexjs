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
import type { Teacher } from '@/types/teacher';

const columns: Column<Teacher>[] = [
  { key: 'name', header: 'Name', render: (t) => <strong>{t.name}</strong> },
  { key: 'code', header: 'Code', render: (t) => <span className="mono">{t.code ?? '—'}</span> },
  {
    key: 'classes',
    header: 'Classes',
    render: (t) => (t.classes.length ? t.classes.map((c) => c.name).join(', ') : '—'),
  },
  {
    key: 'subjects',
    header: 'Subjects',
    render: (t) => (t.subjects.length ? t.subjects.map((s) => s.name).join(', ') : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (t) => (
      <Badge tone={t.status === 'active' ? 'green' : 'slate'}>{statusLabel(t.status)}</Badge>
    ),
  },
];

export default function AdminTeachersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const state = useResource<Teacher[]>(endpoints.admin.teachers, { page, page_size: 20 });
  const pg = state.meta?.pagination;

  return (
    <>
      <PageHeader title="Teachers" subtitle="All teachers within your access" />
      <ResourceView
        state={state}
        loadingLabel="Loading teachers…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="👩‍🏫" title="No teachers found" />}
      >
        {(teachers) => (
          <>
            <DataTable
              columns={columns}
              rows={teachers}
              rowKey={(t) => t.id}
              onRowClick={(t) => router.push(`/admin/teachers/${t.id}`)}
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
