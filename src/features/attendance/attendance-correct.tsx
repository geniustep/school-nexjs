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
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL } from '@/lib/utils/labels';
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

  // Students for the selected class (already scope-filtered by the API).
  const studentsState = useResource<Student[]>(
    classId ? endpoints.admin.students : null,
    classId ? { class_id: classId, page_size: 200 } : undefined,
  );
  const students = studentsState.data ?? [];

  // Reset the chosen student whenever the class changes.
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
        toast.error(
          res.error.message ||
            'That correction is not valid. Check the student belongs to the selected class.',
        );
        return;
      }
      toast.error(res.error.message || 'Could not save the correction.');
      return;
    }

    const studentName =
      getStudentDisplayName(students.find((s) => String(s.id) === studentId)) || 'student';
    toast.success(`Attendance corrected for ${studentName} on ${date}.`);
    setNote('');
    onSuccess?.();
  }

  if (denied) {
    return (
      <Card>
        <PermissionDeniedState description="You do not have permission to correct attendance for this scope. Contact your school's main administrator." />
      </Card>
    );
  }

  return (
    <Card>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid grid--form">
          <label className="col tiny" style={{ gap: 4 }}>
            <span className="muted">Date (today or earlier)</span>
            {/* Admin may back-date; future dates are blocked (max = today). */}
            <input
              className="input"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="col tiny" style={{ gap: 4 }}>
            <span className="muted">Class</span>
            <select
              className="select"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Select a class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="col tiny" style={{ gap: 4 }}>
            <span className="muted">Student</span>
            <select
              className="select"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!classId || studentsState.loading}
            >
              <option value="">
                {!classId
                  ? 'Select a class first'
                  : studentsState.loading
                    ? 'Loading students…'
                    : students.length === 0
                      ? 'No students in this class'
                      : 'Select a student…'}
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
          <span className="muted">Status</span>
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
                {ATTENDANCE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <label className="col tiny" style={{ gap: 4 }}>
          <span className="muted">Note</span>
          <input
            className="input"
            placeholder="Reason for correction (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="btn btn--primary" onClick={submit} disabled={!canSubmit}>
            {submitting ? 'Saving…' : 'Save correction'}
          </button>
          <span className="tiny muted">
            Corrections apply only within your administrative scope.
          </span>
        </div>
      </div>
    </Card>
  );
}
