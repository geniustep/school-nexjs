'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import {
  AdminAttendanceCorrectionPanel,
  AdminAttendanceEmptyFiltered,
  AdminAttendanceFiltersCard,
  AdminAttendanceOpsHeader,
  AdminAttendanceStatusBadge,
  AdminAttendanceTableSection,
  AdminAttendanceTodaySummary,
} from '@/features/admin/attendance/admin-attendance-ops-ui';
import {
  isDefaultFilters,
  resolveInitialDate,
  todayIso,
} from '@/features/admin/attendance/admin-attendance-utils';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatDate } from '@/lib/utils/format';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { AttendanceRecord } from '@/types/attendance';
import type { SchoolClass } from '@/types/class';

function AdminAttendanceInner() {
  const t = useT();
  const { formatDate: formatDateLocale } = useFormat();
  const user = useSession();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const correctParam = searchParams.get('correct');
  const classIdParam = searchParams.get('class_id');

  const canCorrect = hasPermission(user, 'manage_attendance');
  const initialDate = resolveInitialDate(dateParam);
  const initialClassId = classIdParam && /^\d+$/.test(classIdParam) ? classIdParam : '';

  const [showCorrect, setShowCorrect] = useState(correctParam === '1');
  const [page, setPage] = useState(1);
  const [date, setDate] = useState(initialDate);
  const [status, setStatus] = useState('');
  const [classId, setClassId] = useState(initialClassId);

  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);
  const classes = classesState.data ?? [];

  const state = useAdminResource<AttendanceRecord[]>(endpoints.admin.attendance, {
    page,
    page_size: 20,
    date: date || undefined,
    status: status || undefined,
    class_id: classId || undefined,
  });
  const pg = state.meta?.pagination;

  const classLabel = useMemo(() => {
    if (!classId) return t('admin.attendanceOps.allClassesLabel');
    return classes.find((c) => String(c.id) === classId)?.name ?? t('common.dash');
  }, [classId, classes, t]);

  const dateLabel = date ? formatDateLocale(date) : formatDateLocale(todayIso());

  const showReset = !isDefaultFilters(date, status, classId);

  function resetFilters() {
    setDate(todayIso());
    setStatus('');
    setClassId('');
    setPage(1);
  }

  function resetTo(setter: (v: string) => void, v: string) {
    setter(v);
    setPage(1);
  }

  const columns: Column<AttendanceRecord>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('attendance.student'),
        render: (a) => <strong className="admin-att-table__student">{getStudentDisplayName(a.student)}</strong>,
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (a) => a.class?.name ?? t('common.dash'),
      },
      {
        key: 'status',
        header: t('attendance.statusColumn'),
        render: (a) => <AdminAttendanceStatusBadge status={a.status} />,
      },
      {
        key: 'date',
        header: t('admin.attendanceList.date'),
        render: (a) => <span className="mono tiny">{formatDate(a.date)}</span>,
      },
      {
        key: 'recorded_by',
        header: t('admin.attendanceList.recordedBy'),
        render: (a) => a.recorded_by?.name ?? t('common.dash'),
      },
      {
        key: 'note',
        header: t('attendance.note'),
        render: (a) => (
          <span className="admin-att-table__note">{a.note?.trim() ? a.note : t('common.dash')}</span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="admin-workspace admin-attendance-page admin-attendance-ops">
      <AdminAttendanceOpsHeader
        schoolName={user.school?.name}
        dateLabel={dateLabel}
        classLabel={classLabel}
        canCorrect={canCorrect}
        showCorrect={showCorrect}
        onToggleCorrect={() => setShowCorrect((v) => !v)}
        onRefresh={() => state.reload()}
        refreshing={state.loading && state.data !== null}
      />

      <ResourceView state={state} loadingLabel={t('admin.attendanceList.loading')}>
        {(records) => (
          <>
            <AdminAttendanceTodaySummary records={records} listTotal={pg?.total} />

            <AdminAttendanceFiltersCard
              date={date}
              classId={classId}
              status={status}
              classes={classes}
              onDateChange={(v) => resetTo(setDate, v)}
              onClassChange={(v) => resetTo(setClassId, v)}
              onStatusChange={(v) => resetTo(setStatus, v)}
              onReset={resetFilters}
              showReset={showReset}
            />

            {canCorrect && (
              <AdminAttendanceCorrectionPanel
                open={showCorrect}
                onSuccess={() => {
                  setShowCorrect(false);
                  state.reload();
                }}
              />
            )}

            {records.length === 0 && showReset ? (
              <AdminAttendanceEmptyFiltered onReset={resetFilters} />
            ) : records.length > 0 ? (
              <AdminAttendanceTableSection title={t('admin.attendanceOps.tableTitle')}>
                <DataTable columns={columns} rows={records} rowKey={(a) => a.id} />
                {pg && (
                  <Pagination
                    page={pg.page}
                    totalPages={pg.total_pages}
                    total={pg.total}
                    onPage={setPage}
                  />
                )}
              </AdminAttendanceTableSection>
            ) : null}
          </>
        )}
      </ResourceView>
    </div>
  );
}

export default function AdminAttendancePage() {
  const t = useT();
  return (
    <RequireAdminPermission permission="view_attendance">
      <Suspense fallback={<p className="muted admin-att-ops-loading">{t('admin.attendanceList.loading')}</p>}>
        <AdminAttendanceInner />
      </Suspense>
    </RequireAdminPermission>
  );
}
