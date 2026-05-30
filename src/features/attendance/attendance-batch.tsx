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
import { Card } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL } from '@/lib/utils/labels';
import { isoDate } from '@/lib/utils/format';
import type {
  AttendanceToday,
  AttendanceStatus,
  AttendanceBatchResult,
} from '@/types/attendance';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused_absence'];

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
    if (seen.has(r.student.id)) continue;
    seen.add(r.student.id);
    rows.push({
      student_id: r.student.id,
      full_name: r.student.full_name,
      status: r.status,
      note: r.note ?? '',
    });
  }
  for (const n of today.not_recorded ?? []) {
    if (seen.has(n.student_id)) continue;
    seen.add(n.student_id);
    rows.push({
      student_id: n.student_id,
      full_name: n.full_name,
      status: n.status ?? 'present',
      note: '',
    });
  }
  return rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function AttendanceBatch({ classId }: { classId: number }) {
  const toast = useToast();
  const [date, setDate] = useState(isoDate());
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

  async function submit() {
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
        toast.error('You can only record attendance for your assigned classes.');
      } else {
        toast.error(res.error.message || 'Could not save attendance.');
      }
      return;
    }

    const { saved, failed, errors } = res.data;
    if (failed > 0) {
      toast.error(`Saved ${saved}, but ${failed} could not be saved.`);
      // Surface the first couple of specific errors.
      errors.slice(0, 2).forEach((e) => toast.error(`Student ${e.student_id}: ${e.error}`));
    } else {
      toast.success(`Attendance saved for ${saved} student${saved === 1 ? '' : 's'}.`);
    }
    setTouched(false);
    state.reload();
  }

  return (
    <ResourceView state={state} loadingLabel="Loading roster…">
      {() => (
        <>
          <div className="toolbar">
            <label className="row tiny" style={{ gap: 6 }}>
              <span className="muted">Date</span>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <span className="spacer" />
            <span className="tiny muted">Mark all:</span>
            {STATUSES.map((s) => (
              <button key={s} className="btn btn--ghost btn--sm" onClick={() => setAll(s)}>
                {ATTENDANCE_LABEL[s]}
              </button>
            ))}
          </div>

          {roster.length === 0 ? (
            <Card>
              <p className="muted">No students to record for this class.</p>
            </Card>
          ) : (
            <>
              <div className="wrap-gap" style={{ marginBlockEnd: 12 }}>
                {STATUSES.map((s) => (
                  <span key={s} className="tiny muted">
                    {ATTENDANCE_LABEL[s]}: <strong>{counts[s] ?? 0}</strong>
                  </span>
                ))}
              </div>

              <div className="table-wrap card" style={{ padding: 0 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th style={{ width: 320 }}>Status</th>
                      <th>Note</th>
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
                                className={`btn btn--sm ${
                                  r.status === s ? 'btn--primary' : 'btn--ghost'
                                }`}
                                onClick={() => setStatus(r.student_id, s)}
                              >
                                {ATTENDANCE_LABEL[s]}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <input
                            className="input"
                            placeholder="Optional note"
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

              <div className="between mt-4">
                <span className="tiny faint">
                  {touched ? 'Unsaved changes' : 'Saved'}
                </span>
                <button
                  className="btn btn--primary"
                  onClick={submit}
                  disabled={submitting || roster.length === 0}
                >
                  {submitting ? 'Saving…' : 'Save attendance'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </ResourceView>
  );
}
