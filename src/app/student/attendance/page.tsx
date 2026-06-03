'use client';

import { useMemo, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { useT } from '@/features/i18n/locale-context';
import { attendanceStatusLabel } from '@/lib/utils/labels';
import { endpoints } from '@/lib/api/endpoints';
import { formatDate } from '@/lib/utils/format';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

export default function StudentAttendancePage() {
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

  const state = useResource<AttendanceRecord[]>(endpoints.student.attendance, {
    page,
    page_size: 20,
    date: date || undefined,
    status: status || undefined,
  });
  const pg = state.meta?.pagination;

  return (
    <>
      <PageHeader
        title={t('studentPortal.myAttendance')}
        subtitle={t('studentPortal.attendanceSubtitle')}
      />

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
        loadingLabel={t('studentPortal.loadingAttendance')}
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
