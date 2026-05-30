'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, StatCard, SectionHead, Badge } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import type { StudentDashboard } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'excused_absence'];

export default function StudentDashboardPage() {
  const user = useSession();
  const state = useResource<StudentDashboard>(endpoints.student.dashboard);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Your overview" />
      <ResourceView state={state} loadingLabel="Loading your dashboard…">
        {(d) => (
          <>
            <Card>
              <div className="between">
                <div>
                  <strong style={{ fontSize: 16 }}>{d.profile.full_name}</strong>
                  <p className="muted tiny">
                    {d.profile.class?.name ?? '—'} · {d.profile.level?.name ?? '—'}
                  </p>
                </div>
                <div className="row">
                  <span className="tiny muted">Today</span>
                  {d.today_attendance ? (
                    <AttendanceBadge status={d.today_attendance} />
                  ) : (
                    <Badge tone="slate">Not recorded</Badge>
                  )}
                </div>
              </div>
            </Card>

            {d.attendance_summary && (
              <div className="section">
                <SectionHead title="Attendance summary" />
                <div className="grid grid--stats">
                  {ATT_KEYS.map((k) => (
                    <StatCard key={k} label={ATTENDANCE_LABEL[k]} value={d.attendance_summary?.[k] ?? 0} />
                  ))}
                </div>
              </div>
            )}

            <div className="section">
              <SectionHead title="Announcements" />
              {d.announcements?.length ? (
                <Card pad={false}>
                  {d.announcements.map((a, i) => (
                    <div
                      key={a.id}
                      className="card--pad"
                      style={i ? { borderTop: '1px solid var(--c-border)' } : undefined}
                    >
                      <div className="between">
                        <strong className="tiny">
                          {typeof a.channel === 'string' ? a.channel : a.channel?.name}
                        </strong>
                        <span className="tiny faint">{formatDateTime(a.created_at)}</span>
                      </div>
                      <div className="tiny muted">{a.sender}</div>
                      <div className="mt-2">{a.body}</div>
                    </div>
                  ))}
                </Card>
              ) : (
                <Card>
                  <p className="muted">No announcements.</p>
                </Card>
              )}
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
