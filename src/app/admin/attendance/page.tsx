'use client';

import { useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, SectionHead } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { AttendanceCorrectPanel } from '@/features/attendance/attendance-correct';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { canSeeStudentData } from '@/lib/permissions/scope';
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL } from '@/lib/utils/labels';
import { formatDate } from '@/lib/utils/format';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import type { SchoolClass } from '@/types/class';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const columns: Column<AttendanceRecord>[] = [
  { key: 'date', header: 'Date', render: (a) => formatDate(a.date) },
  { key: 'student', header: 'Student', render: (a) => <strong>{getStudentDisplayName(a.student)}</strong> },
  { key: 'class', header: 'Class', render: (a) => a.class?.name ?? '—' },
  { key: 'status', header: 'Status', render: (a) => <AttendanceBadge status={a.status} /> },
  { key: 'recorded_by', header: 'Recorded by', render: (a) => a.recorded_by?.name ?? '—' },
  { key: 'note', header: 'Note', render: (a) => a.note ?? '—' },
];

export default function AdminAttendancePage() {
  const user = useSession();
  const canCorrect = canSeeStudentData(user) && hasPermission(user, 'manage_attendance');
  const [showCorrect, setShowCorrect] = useState(false);
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [classId, setClassId] = useState('');

  // Class options for the filter (best-effort; ignored on error).
  const classesState = useResource<SchoolClass[]>(endpoints.admin.classes);
  const classes = classesState.data ?? [];

  const state = useResource<AttendanceRecord[]>(endpoints.admin.attendance, {
    page,
    page_size: 20,
    date: date || undefined,
    status: status || undefined,
    class_id: classId || undefined,
  });
  const pg = state.meta?.pagination;

  function resetTo(setter: (v: string) => void, v: string) {
    setter(v);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Daily attendance within your access"
        actions={
          canCorrect ? (
            <button
              className={showCorrect ? 'btn btn--ghost' : 'btn btn--primary'}
              onClick={() => setShowCorrect((v) => !v)}
            >
              {showCorrect ? 'Close correction' : 'Correct a record'}
            </button>
          ) : undefined
        }
      />

      {canCorrect && showCorrect && (
        <div className="section">
          <SectionHead title="Correct a past attendance record" />
          <AttendanceCorrectPanel
            onSuccess={() => {
              setShowCorrect(false);
              state.reload();
            }}
          />
        </div>
      )}

      <div className="toolbar">
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => resetTo(setDate, e.target.value)}
        />
        <select
          className="select"
          value={classId}
          onChange={(e) => resetTo(setClassId, e.target.value)}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={status}
          onChange={(e) => resetTo(setStatus, e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ATTENDANCE_LABEL[s]}
            </option>
          ))}
        </select>
        {(date || status || classId) && (
          <button
            className="btn btn--ghost"
            onClick={() => {
              setDate('');
              setStatus('');
              setClassId('');
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </div>

      <ResourceView
        state={state}
        loadingLabel="Loading attendance…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🗓️" title="No attendance records" description="Try different filters." />}
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
