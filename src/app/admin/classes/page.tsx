'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { SchoolClass } from '@/types/class';

const columns: Column<SchoolClass>[] = [
  { key: 'name', header: 'Class', render: (c) => <strong>{c.name}</strong> },
  { key: 'level', header: 'Level', render: (c) => c.level?.name ?? '—' },
  { key: 'year', header: 'Year', render: (c) => c.academic_year ?? '—' },
  {
    key: 'students',
    header: 'Students',
    render: (c) => (
      <span className="mono">
        {c.student_count}
        {c.capacity ? ` / ${c.capacity}` : ''}
      </span>
    ),
  },
  {
    key: 'teachers',
    header: 'Teachers',
    render: (c) => (c.teachers.length ? c.teachers.map((t) => t.name).join(', ') : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (c) => (
      <Badge tone={c.status === 'active' ? 'green' : 'slate'}>{statusLabel(c.status)}</Badge>
    ),
  },
];

export default function AdminClassesPage() {
  const state = useResource<SchoolClass[]>(endpoints.admin.classes);

  return (
    <>
      <PageHeader title="Classes" subtitle="All classes within your access" />
      <ResourceView
        state={state}
        loadingLabel="Loading classes…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🏫" title="No classes found" />}
      >
        {(classes) => <DataTable columns={columns} rows={classes} rowKey={(c) => c.id} />}
      </ResourceView>
    </>
  );
}
