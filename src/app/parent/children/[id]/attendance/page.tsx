'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL } from '@/lib/utils/labels';
import { formatDate } from '@/lib/utils/format';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const columns: Column<AttendanceRecord>[] = [
  { key: 'date', header: 'Date', render: (a) => formatDate(a.date) },
  { key: 'status', header: 'Status', render: (a) => <AttendanceBadge status={a.status} /> },
  { key: 'class', header: 'Class', render: (a) => a.class?.name ?? '—' },
  { key: 'note', header: 'Note', render: (a) => a.note ?? '—' },
];

export default function ChildAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');

  const state = useResource<AttendanceRecord[]>(endpoints.parent.childAttendance(id), {
    page,
    page_size: 20,
    date: date || undefined,
    status: status || undefined,
  });
  const pg = state.meta?.pagination;

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ Back to child
      </Link>
      <PageHeader title="Attendance" subtitle="Read-only attendance history" />
      <ChildSubnav id={id} />

      <div className="toolbar">
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ATTENDANCE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <ResourceView
        state={state}
        loadingLabel="Loading attendance…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🗓️" title="No attendance records" />}
      >
        {(records) => (
          <>
            <DataTable columns={columns} rows={records} rowKey={(a) => a.id} />
            {pg && (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
