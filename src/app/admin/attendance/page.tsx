'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import {
  AdminAttendanceCorrectionPanel,
  AdminAttendanceEmptyFiltered,
  AdminAttendanceFiltersCard,
  AdminAttendanceNoData,
  AdminAttendanceOpsHeader,
  AdminAttendanceRefetchHint,
  AdminAttendanceStatusBadge,
  AdminAttendanceStudentCell,
  AdminAttendanceTableSection,
  AdminAttendanceTodaySummary,
} from '@/features/admin/attendance/admin-attendance-ops-ui';
import {
  ATTENDANCE_PAGE_SIZE,
  hasActiveAttendanceFilters,
  isDefaultFilters,
  resolveAttendanceListEmptyVariant,
  resolveInitialDate,
  todayIso,
} from '@/features/admin/attendance/admin-attendance-utils';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatDate } from '@/lib/utils/format';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { AttendanceRecord } from '@/types/attendance';
import type { SchoolClass } from '@/types/class';
import '@/features/admin/attendance/admin-attendance.css';

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

  const classesState = useGlobalAcademicYearResource<SchoolClass[]>(endpoints.admin.classes);
  const classes = classesState.data ?? [];

  const state = useGlobalAcademicYearResource<AttendanceRecord[]>(endpoints.admin.attendance, {
    page,
    page_size: ATTENDANCE_PAGE_SIZE,
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

  const hasActiveFilters = hasActiveAttendanceFilters(date, status, classId);
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
        render: (a) => (
          <AdminAttendanceStudentCell name={getStudentDisplayName(a.student)} />
        ),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (a) => (
          <span className="admin-att-table__meta" dir="auto">
            {a.class?.name ?? t('common.dash')}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('attendance.statusColumn'),
        render: (a) => <AdminAttendanceStatusBadge status={a.status} />,
      },
      {
        key: 'date',
        header: t('admin.attendanceList.date'),
        render: (a) => (
          <span className="mono tiny" dir="ltr">
            {formatDate(a.date)}
          </span>
        ),
      },
      {
        key: 'recorded_by',
        header: t('admin.attendanceList.recordedBy'),
        render: (a) => (
          <span dir="auto">{a.recorded_by?.name ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'note',
        header: t('attendance.note'),
        render: (a) => (
          <span className="admin-att-table__note" dir="auto" title={a.note?.trim() || undefined}>
            {a.note?.trim() ? a.note : t('common.dash')}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="admin-workspace admin-attendance-page">
      <AdminAttendanceOpsHeader
        schoolName={user.school?.name}
        dateLabel={dateLabel}
        classLabel={classLabel}
        canCorrect={canCorrect}
        showCorrect={showCorrect}
        onToggleCorrect={() => setShowCorrect((v) => !v)}
        onRefresh={() => state.reload()}
        refreshing={state.fetching}
      />

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

      {state.fetching && !state.initialLoading ? <AdminAttendanceRefetchHint /> : null}

      <ResourceView state={state} loadingLabel={t('admin.attendanceList.loading')}>
        {(records) => {
          const listEmptyVariant = resolveAttendanceListEmptyVariant({
            hasActiveFilters,
            recordCount: records.length,
          });

          return (
            <>
              <div
                className={state.fetching ? 'admin-att-results admin-att-results--fetching' : 'admin-att-results'}
                aria-busy={state.fetching || undefined}
              >
                {records.length > 0 ? (
                  <AdminAttendanceTodaySummary records={records} listTotal={pg?.total} />
                ) : null}

                {canCorrect ? (
                  <AdminAttendanceCorrectionPanel
                    open={showCorrect}
                    onSuccess={() => {
                      setShowCorrect(false);
                      state.reload();
                    }}
                  />
                ) : null}

                {listEmptyVariant === 'no-match' ? (
                  <AdminAttendanceEmptyFiltered onReset={resetFilters} />
                ) : null}

                {listEmptyVariant === 'no-data' ? <AdminAttendanceNoData /> : null}

                {records.length > 0 ? (
                  <AdminAttendanceTableSection
                    title={t('admin.attendanceOps.tableTitle')}
                    count={pg?.total}
                    fetching={state.fetching}
                  >
                    <DataTable columns={columns} rows={records} rowKey={(a) => a.id} />
                    {pg ? (
                      <Pagination
                        page={pg.page}
                        totalPages={pg.total_pages}
                        total={pg.total}
                        pageSize={ATTENDANCE_PAGE_SIZE}
                        onPage={setPage}
                      />
                    ) : null}
                  </AdminAttendanceTableSection>
                ) : null}
              </div>
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}

export default function AdminAttendancePage() {
  const t = useT();
  return (
    <RequireAdminPermission permission="view_attendance">
      <Suspense fallback={<p className="admin-att-loading">{t('admin.attendanceList.loading')}</p>}>
        <AdminAttendanceInner />
      </Suspense>
    </RequireAdminPermission>
  );
}
