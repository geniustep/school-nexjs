'use client';

// Teacher batch attendance entry. Loads today's roster for an assigned class,
// lets the teacher set a status per student, and submits via the documented
// batch endpoint. Handles partial success (saved/failed/errors).
//
// Only assigned classes are reachable — the API returns permission_denied
// otherwise, surfaced through ApiErrorView.

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
  AttendanceToday,
  AttendanceStatus,
  AttendanceBatchResult,
} from '@/types/attendance';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

// Maps each attendance status to a semantic button color class.
const STATUS_BTN: Record<AttendanceStatus, string> = {
  present: 'btn--status-green',
  absent: 'btn--status-red',
  late: 'btn--status-amber',
  left_early: 'btn--status-blue',
};

interface RosterRow {
  student_id: number;
  full_name: string;
  status: AttendanceStatus;
  note: string;
}

function buildRoster(today: AttendanceToday): RosterRow[] {
  const rows: RosterRow[] = [];
  const seen = new Set<number>();
  for (const r of today.recorded ?? []) {
    if (!r.student?.id) continue;
    if (seen.has(r.student.id)) continue;
    seen.add(r.student.id);
    rows.push({
      student_id: r.student.id,
      full_name: r.student.full_name,
      status: r.status,
      note: r.note ?? '',
    });
  }
  // API returns `id` (not `student_id`) in the not_recorded array.
  for (const n of today.not_recorded ?? []) {
    if (!n.id) continue;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    rows.push({
      student_id: n.id,
      full_name: n.full_name,
      status: n.status ?? 'present',
      note: '',
    });
  }
  return rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

// Detects the backend's teacher_today_only policy rejection (422). The policy
// hint may arrive in error.details.policy or be implied by the message.
function isTeacherTodayOnly(error: { code: string; message?: string; details?: Record<string, unknown> }): boolean {
  if (error.code !== 'validation_error') return false;
  if (error.details?.policy === 'teacher_today_only') return true;
  return /today/i.test(error.message ?? '');
}

export function AttendanceBatch({ classId }: { classId: number }) {
  const t = useT();
  const toast = useToast();
  const today = isoDate();
  const [date, setDate] = useState(today);
  const state = useResource<AttendanceToday>(endpoints.teacher.attendanceToday(classId));
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (state.data) {
      setRoster(buildRoster(state.data));
      setTouched(false);
    }
  }, [state.data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of roster) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [roster]);

  function setStatus(studentId: number, status: AttendanceStatus) {
    setTouched(true);
    setRoster((rows) =>
      rows.map((r) => (r.student_id === studentId ? { ...r, status } : r)),
    );
  }

  function setAll(status: AttendanceStatus) {
    setTouched(true);
    setRoster((rows) => rows.map((r) => ({ ...r, status })));
  }

  function statusLabel(status: AttendanceStatus): string {
    const key = status === 'left_early' ? 'leftEarly' : status;
    return t(`attendance.${key}`);
  }

  async function submit() {
    const invalidRows = roster.filter((r) => !r.student_id);
    if (invalidRows.length > 0) {
      toast.error(t('attendance.invalidStudentIds'));
      return;
    }
    setSubmitting(true);
    const res = await api.post<AttendanceBatchResult>(
      endpoints.teacher.attendanceBatch(classId),
      {
        date,
        items: roster.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          note: r.note || undefined,
        })),
      },
    );
    setSubmitting(false);

    if (!res.success) {
      if (res.error.code === 'permission_denied') {
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
      errors.slice(0, 2).forEach((e) =>
        toast.error(t('attendance.studentError', { id: e.student_id, error: e.error })),
      );
    } else {
      toast.success(t('attendance.saveSuccess', { count: saved }));
    }
    setTouched(false);
    state.reload();
  }

  return (
    <ResourceView state={state} loadingLabel={t('attendance.loadingRoster')}>
      {() => (
        <>
          {/* Toolbar: date picker (today only) + mark-all quick actions */}
          <div className="toolbar">
            <label className="row tiny" style={{ gap: 6 }}>
              <span className="muted">{t('attendance.dateLabel')}</span>
              {/* Policy: teachers record attendance for today only. The picker
                  is locked to today (min === max); past/future are disabled. */}
              <input
                className="input"
                type="date"
                value={date}
                min={today}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                title={t('attendance.todayOnlyTitle')}
              />
              <span className="tiny muted">{t('attendance.todayOnly')}</span>
            </label>
            <span className="spacer" />
            {/* Safe default only: everyone is present unless marked otherwise.
                No "mark all absent/late/left early" shortcut by design. */}
            <span className="tiny muted">{t('attendance.defaultPresent')}</span>
            <button
              className={cn('btn btn--sm', STATUS_BTN.present)}
              onClick={() => setAll('present')}
              type="button"
              title={t('attendance.markAllPresentTitle')}
            >
              {t('attendance.markAllPresent')}
            </button>
          </div>

          {roster.length === 0 ? (
            <Card>
              <p className="muted">{t('attendance.noStudents')}</p>
            </Card>
          ) : (
            <>
              {/* Status counts summary */}
              <div className="wrap-gap" style={{ marginBlockEnd: 12 }}>
                {STATUSES.map((s) => (
                  <span key={s} className="tiny muted">
                    {statusLabel(s)}: <strong>{counts[s] ?? 0}</strong>
                  </span>
                ))}
              </div>

              {/* Roster table */}
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
                    {roster.map((r) => (
                      <tr key={r.student_id}>
                        <td>
                          <strong>{r.full_name}</strong>
                        </td>
                        <td>
                          <div className="wrap-gap">
                            {STATUSES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                className={cn(
                                  'btn btn--sm',
                                  STATUS_BTN[s],
                                  r.status === s && 'btn--status-active',
                                )}
                                onClick={() => setStatus(r.student_id, s)}
                              >
                                {statusLabel(s)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <input
                            className="input"
                            placeholder={t('attendance.optionalNote')}
                            value={r.note}
                            onChange={(e) => {
                              setTouched(true);
                              setRoster((rows) =>
                                rows.map((x) =>
                                  x.student_id === r.student_id
                                    ? { ...x, note: e.target.value }
                                    : x,
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

              {/* Save bar — shows unsaved state prominently */}
              <div className={cn('save-bar', touched && 'save-bar--dirty')}>
                <span className="save-bar__status">
                  {touched ? (
                    <>{t('attendance.unsavedChanges')}</>
                  ) : (
                    <>{t('attendance.allSaved')}</>
                  )}
                </span>
                <button
                  className="btn btn--primary"
                  onClick={submit}
                  disabled={submitting || roster.length === 0}
                >
                  {submitting ? t('common.saving') : t('attendance.saveAttendance')}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </ResourceView>
  );
}
