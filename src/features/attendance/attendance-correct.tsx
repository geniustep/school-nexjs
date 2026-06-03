'use client';

// Admin-only past-date attendance correction panel.
// Consumes POST /admin/attendance/correct. Visibility is gated to admins who
// can see student data AND hold manage_attendance — but the API remains the
// real authority (server enforces scope + permission). Classes and students
// come from the already-scoped admin endpoints, so the selectable set respects
// the admin's scope automatically.

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/primitives';
import { PermissionDeniedState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { attendanceStatusLabel } from '@/lib/utils/labels';
import { isoDate } from '@/lib/utils/format';
import { getStudentDisplayName } from '@/lib/utils/student';
import { cn } from '@/lib/utils/cn';
import type { SchoolClass } from '@/types/class';
import type { Student } from '@/types/student';
import type { AttendanceStatus, AttendanceCorrectRequest } from '@/types/attendance';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const STATUS_BTN: Record<AttendanceStatus, string> = {
  present: 'btn--status-green',
  absent: 'btn--status-red',
  late: 'btn--status-amber',
  left_early: 'btn--status-blue',
};

export function AttendanceCorrectPanel({ onSuccess }: { onSuccess?: () => void }) {
  const t = useT();
  const toast = useToast();
  const today = isoDate();

  const [date, setDate] = useState('');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [denied, setDenied] = useState(false);

  const classesState = useResource<SchoolClass[]>(endpoints.admin.classes);
  const classes = classesState.data ?? [];

  const studentsState = useResource<Student[]>(
    classId ? endpoints.admin.students : null,
    classId ? { class_id: classId, page_size: 200 } : undefined,
  );
  const students = studentsState.data ?? [];

  useEffect(() => {
    setStudentId('');
  }, [classId]);

  const canSubmit = useMemo(
    () => Boolean(date && classId && studentId && status) && !submitting,
    [date, classId, studentId, status, submitting],
  );

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const payload: AttendanceCorrectRequest = {
      date,
      class_id: Number(classId),
      student_id: Number(studentId),
      status,
      note: note.trim() || undefined,
    };
    const res = await api.post(endpoints.admin.attendanceCorrect, payload);
    setSubmitting(false);

    if (!res.success) {
      if (res.error.code === 'permission_denied') {
        setDenied(true);
        return;
      }
      if (res.error.code === 'validation_error') {
        toast.error(res.error.message || t('attendance.correctPanel.validationError'));
        return;
      }
      toast.error(res.error.message || t('attendance.correctPanel.saveFailed'));
      return;
    }

    const studentName =
      getStudentDisplayName(students.find((s) => String(s.id) === studentId)) || '—';
    toast.success(
      t('attendance.correctPanel.success', { name: studentName, date }),
    );
    setNote('');
    onSuccess?.();
  }

  if (denied) {
    return (
      <Card>
        <PermissionDeniedState description={t('attendance.correctPanel.permissionDesc')} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid grid--form">
          <label className="col tiny" style={{ gap: 4 }}>
            <span className="muted">{t('common.date')}</span>
            <input
              className="input"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              title={t('attendance.correctPanel.dateHelp')}
            />
          </label>

          <label className="col tiny" style={{ gap: 4 }}>
            <span className="muted">{t('common.class')}</span>
            <select
              className="select"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">{t('attendance.correctPanel.selectClass')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="col tiny" style={{ gap: 4 }}>
            <span className="muted">{t('attendance.student')}</span>
            <select
              className="select"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!classId || studentsState.loading}
            >
              <option value="">
                {!classId
                  ? t('attendance.correctPanel.selectClassFirst')
                  : studentsState.loading
                    ? t('attendance.correctPanel.loadingStudents')
                    : students.length === 0
                      ? t('attendance.correctPanel.noStudentsInClass')
                      : t('attendance.correctPanel.selectStudent')}
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {getStudentDisplayName(s)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="col tiny" style={{ gap: 6 }}>
          <span className="muted">{t('common.status')}</span>
          <div className="wrap-gap">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  'btn btn--sm',
                  STATUS_BTN[s],
                  status === s && 'btn--status-active',
                )}
                onClick={() => setStatus(s)}
              >
                {attendanceStatusLabel(t, s)}
              </button>
            ))}
          </div>
        </div>

        <label className="col tiny" style={{ gap: 4 }}>
          <span className="muted">{t('common.note')}</span>
          <input
            className="input"
            placeholder={t('attendance.correctPanel.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="btn btn--primary" onClick={submit} disabled={!canSubmit}>
            {submitting ? t('common.saving') : t('attendance.correctPanel.saveCorrection')}
          </button>
          <span className="tiny muted">{t('attendance.correctPanel.scopeHint')}</span>
        </div>
      </div>
    </Card>
  );
}
