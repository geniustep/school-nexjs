'use client';

// Teacher batch attendance entry — Odoo 18.0.1.0.381 ownership-aware UX.

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { ResourceView } from '@/components/states/resource';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { Card } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { isoDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type {
  AttendanceStatus,
  AttendanceBatchResult,
  AttendanceToday,
} from '@/types/attendance';
import {
  attendanceSheetLockReason,
  buildTeacherAttendanceBatchItems,
  buildTeacherAttendanceRoster,
  countTeacherAttendanceRoster,
  isAttendanceSheetLockedError,
  markTeacherAttendanceAllPresent,
  teacherAttendanceSheetUiMode,
  type TeacherAttendanceRosterRow,
} from './attendance-teacher-sheet';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const STATUS_BTN: Record<AttendanceStatus, string> = {
  present: 'btn--status-green',
  absent: 'btn--status-red',
  late: 'btn--status-amber',
  left_early: 'btn--status-blue',
};

function isTeacherTodayOnly(error: {
  code: string;
  message?: string;
  details?: Record<string, unknown>;
}): boolean {
  if (error.code !== 'validation_error') return false;
  if (error.details?.policy === 'teacher_today_only') return true;
  return /today/i.test(error.message ?? '');
}

export function AttendanceBatch({ classId }: { classId: number }) {
  const t = useT();
  const toast = useToast();
  const today = isoDate();
  const state = useResource<AttendanceToday>(endpoints.teacher.attendanceToday(classId));
  const [roster, setRoster] = useState<TeacherAttendanceRosterRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state.data) return;
    const mode = teacherAttendanceSheetUiMode(state.data);
    const editable = mode === 'record' || mode === 'continue';
    setRoster(buildTeacherAttendanceRoster(state.data, editable ? 'present' : null));
  }, [state.data]);

  const counts = useMemo(() => countTeacherAttendanceRoster(roster), [roster]);
  const pendingItems = useMemo(() => buildTeacherAttendanceBatchItems(roster), [roster]);

  function setStatus(studentId: number, status: AttendanceStatus) {
    setRoster((rows) =>
      rows.map((row) => (row.student_id === studentId ? { ...row, status } : row)),
    );
  }

  function setAllPresent() {
    setRoster((rows) => markTeacherAttendanceAllPresent(rows));
  }

  function statusLabel(status: AttendanceStatus): string {
    const key = status === 'left_early' ? 'leftEarly' : status;
    return t(`attendance.${key}`);
  }

  async function submit(data: AttendanceToday) {
    if (!data.recording_allowed || pendingItems.length === 0 || submitting) return;

    setSubmitting(true);
    const res = await api.post<AttendanceBatchResult>(
      endpoints.teacher.attendanceBatch(classId),
      {
        date: data.date || today,
        items: pendingItems,
      },
    );
    setSubmitting(false);

    if (!res.success) {
      if (isAttendanceSheetLockedError(res.error)) {
        const reason = attendanceSheetLockReason(res.error);
        toast.warning(
          reason === 'recorded_by_other_teacher'
            ? t('attendance.sheetLockedByOtherToast')
            : reason === 'completed' || reason === 'attendance_sheet_completed'
              ? t('attendance.sheetCompletedToast')
              : t('attendance.sheetLockedToast'),
        );
        state.reload();
        return;
      }
      if (res.error.code === 'permission_denied' || res.error.code === 'forbidden') {
        toast.error(t('attendance.permissionDenied'));
      } else if (isTeacherTodayOnly(res.error)) {
        toast.error(t('attendance.todayOnlyError'));
      } else {
        toast.error(res.error.message || t('attendance.saveFailed'));
      }
      return;
    }

    const { saved, failed, errors } = res.data;
    if (failed > 0) {
      toast.error(t('attendance.partialSave', { saved, failed }));
      errors.slice(0, 2).forEach((error) =>
        toast.error(t('attendance.studentError', { id: error.student_id, error: error.error })),
      );
    } else {
      toast.success(t('attendance.saveSuccess', { count: saved }));
    }
    state.reload();
  }

  return (
    <ResourceView state={state} loadingLabel={t('attendance.loadingRoster')}>
      {(data) => {
        const mode = teacherAttendanceSheetUiMode(data);
        const editable = mode === 'record' || mode === 'continue';
        const ownerName = data.sheet_owner?.name ?? null;
        const lockReason = data.recording_lock.reason;

        return (
          <>
            {mode === 'continue' ? (
              <Card>
                <strong>{t('attendance.sheetContinueTitle')}</strong>
                <p className="muted">{t('attendance.sheetContinueDesc')}</p>
              </Card>
            ) : null}

            {mode === 'locked_other' ? (
              <Card>
                <strong>{t('attendance.sheetLockedByOtherTitle')}</strong>
                <p className="muted">{t('attendance.sheetLockedByOtherDesc')}</p>
                {ownerName ? (
                  <p className="tiny muted" dir="auto">
                    {t('attendance.sheetOwner', { name: ownerName })}
                  </p>
                ) : null}
              </Card>
            ) : null}

            {mode === 'completed' ? (
              <Card>
                <strong>{t('attendance.sheetCompletedTitle')}</strong>
                <p className="muted">{t('attendance.sheetCompletedDesc')}</p>
                {ownerName ? (
                  <p className="tiny muted" dir="auto">
                    {t('attendance.sheetOwner', { name: ownerName })}
                  </p>
                ) : null}
              </Card>
            ) : null}

            {mode === 'blocked' ? (
              <Card>
                <strong>{t('attendance.sheetBlockedTitle')}</strong>
                <p className="muted">
                  {lockReason === 'attendance_blocked_by_calendar'
                    ? t('attendance.sheetBlockedCalendar')
                    : lockReason === 'existing_without_owner'
                      ? t('attendance.sheetBlockedLegacy')
                      : t('attendance.sheetBlockedDesc')}
                </p>
              </Card>
            ) : null}

            <div className="attendance-toolbar">
              <label className="attendance-toolbar__field">
                <span className="muted">{t('attendance.dateLabel')}</span>
                <input
                  className="input"
                  type="date"
                  value={data.date || today}
                  min={data.date || today}
                  max={data.date || today}
                  readOnly
                  title={t('attendance.todayOnlyTitle')}
                />
                <span className="tiny muted">{t('attendance.todayOnly')}</span>
              </label>
              <span className="spacer" />
              <span className="tiny muted">
                {editable
                  ? t('attendance.markAllPresentTitle')
                  : t('attendance.unrecordedNeutralHint')}
              </span>
              {editable ? (
                <button
                  className={cn('btn btn--sm', STATUS_BTN.present)}
                  onClick={setAllPresent}
                  type="button"
                  title={t('attendance.markAllPresentTitle')}
                >
                  {t('attendance.markAllPresent')}
                </button>
              ) : null}
            </div>

            {roster.length === 0 ? (
              <Card>
                <p className="muted">{t('attendance.noStudents')}</p>
              </Card>
            ) : (
              <>
                <div className="attendance-chips">
                  {STATUSES.map((status) => (
                    <span key={status} className={cn('attendance-chip', `attendance-chip--${status}`)}>
                      {statusLabel(status)}: <strong>{counts[status]}</strong>
                    </span>
                  ))}
                  <span className="attendance-chip">
                    {t('attendance.notRecorded')}: <strong>{counts.not_recorded}</strong>
                  </span>
                </div>

                <div className="table-wrap card" style={{ padding: 0 }}>
                  <table className="data">
                    <thead>
                      <tr>
                        <th>{t('attendance.student')}</th>
                        <th style={{ width: 340 }}>{t('attendance.statusColumn')}</th>
                        <th>{t('attendance.note')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((row) => (
                        <tr key={row.student_id}>
                          <td>
                            <strong>{row.full_name}</strong>
                            {row.status == null ? (
                              <span className="tiny muted"> · {t('attendance.notRecorded')}</span>
                            ) : null}
                          </td>
                          <td>
                            <div className="wrap-gap">
                              {STATUSES.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  className={cn(
                                    'btn btn--sm',
                                    STATUS_BTN[status],
                                    row.status === status && 'btn--status-active',
                                  )}
                                  disabled={!editable}
                                  onClick={() => setStatus(row.student_id, status)}
                                >
                                  {statusLabel(status)}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            <input
                              className="input"
                              placeholder={t('attendance.optionalNote')}
                              value={row.note}
                              disabled={!editable || row.status == null}
                              onChange={(event) => {
                                const note = event.target.value;
                                setRoster((rows) =>
                                  rows.map((item) =>
                                    item.student_id === row.student_id ? { ...item, note } : item,
                                  ),
                                );
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editable ? (
                  <div className={cn('save-bar save-bar--sticky', pendingItems.length > 0 && 'save-bar--dirty')}>
                    <span className="save-bar__status">
                      {pendingItems.length > 0
                        ? t('attendance.unsavedChanges')
                        : t('attendance.noChanges')}
                    </span>
                    <button
                      className="btn btn--primary"
                      onClick={() => submit(data)}
                      disabled={submitting || pendingItems.length === 0}
                    >
                      {submitting ? t('common.saving') : t('attendance.saveAttendance')}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </>
        );
      }}
    </ResourceView>
  );
}
