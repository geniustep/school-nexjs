'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { useT } from '@/features/i18n/locale-context';
import { attendanceStatusLabel } from '@/lib/utils/labels';
import { endpoints } from '@/lib/api/endpoints';
import { formatDate } from '@/lib/utils/format';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

export default function ChildAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');

  const columns: Column<AttendanceRecord>[] = useMemo(
    () => [
      { key: 'date', header: t('common.date'), render: (a) => formatDate(a.date) },
      {
        key: 'status',
        header: t('common.status'),
        render: (a) => <AttendanceBadge status={a.status} />,
      },
      { key: 'class', header: t('common.class'), render: (a) => a.class?.name ?? '—' },
      { key: 'note', header: t('common.note'), render: (a) => a.note ?? '—' },
    ],
    [t],
  );

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
        ‹ {t('common.backToChild')}
      </Link>
      <PageHeader
        title={t('nav.attendance')}
        subtitle={t('parent.attendanceReadOnlySubtitle')}
      />
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
          <option value="">{t('common.allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {attendanceStatusLabel(t, s)}
            </option>
          ))}
        </select>
      </div>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🗓️" title={t('empty.attendanceRecords')} />}
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
