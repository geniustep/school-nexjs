'use client';

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';

// Class students — assigned class only (permission_denied otherwise, handled
// by ResourceView via ApiErrorView).
interface ClassStudent {
  id: number;
  full_name: string;
  code?: string | null;
  status?: string;
}

const columns: Column<ClassStudent>[] = [
  { key: 'name', header: 'Student', render: (s) => <strong>{s.full_name}</strong> },
  { key: 'code', header: 'Code', render: (s) => <span className="mono">{s.code ?? '—'}</span> },
  {
    key: 'status',
    header: 'Status',
    render: (s) =>
      s.status ? (
        <Badge tone={s.status === 'active' ? 'green' : 'slate'}>{statusLabel(s.status)}</Badge>
      ) : (
        '—'
      ),
  },
];

export default function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const state = useResource<ClassStudent[]>(endpoints.teacher.classStudents(id));

  return (
    <>
      <Link href="/teacher/classes" className="back-link">
        ‹ Back to my classes
      </Link>
      <PageHeader
        title="Class students"
        actions={
          <Link className="btn btn--primary btn--sm" href={`/teacher/attendance?class=${id}`}>
            Take attendance
          </Link>
        }
      />
      <ResourceView
        state={state}
        loadingLabel="Loading students…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🎓" title="No students in this class" />}
      >
        {(students) => <DataTable columns={columns} rows={students} rowKey={(s) => s.id} />}
      </ResourceView>
    </>
  );
}
