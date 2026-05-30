'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, StatCard, SectionHead, Badge, Avatar } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import type { StudentDashboard } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';
import type { StatTone } from '@/components/ui/primitives';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const ATT_TONE: Record<AttendanceStatus, StatTone> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

export default function StudentDashboardPage() {
  const user = useSession();
  const state = useResource<StudentDashboard>(endpoints.student.dashboard);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Your school overview" />
      <ResourceView state={state} loadingLabel="Loading your dashboard…">
        {(d) => (
          <>
            {/* Profile card */}
            <Card>
              <div className="between">
                <div className="row" style={{ gap: 14 }}>
                  <Avatar name={d.profile.full_name} />
                  <div className="col" style={{ gap: 3 }}>
                    <strong style={{ fontSize: 16 }}>{d.profile.full_name}</strong>
                    <span className="tiny muted">
                      {d.profile.class?.name ?? '—'}
                      {d.profile.level?.name ? ` · ${d.profile.level.name}` : ''}
                    </span>
                  </div>
                </div>
                <div className="col" style={{ gap: 4, alignItems: 'flex-end' }}>
                  <span className="tiny muted">Today</span>
                  {d.today_attendance ? (
                    <AttendanceBadge status={d.today_attendance} />
                  ) : (
                    <Badge tone="slate">Not recorded</Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Attendance summary */}
            {d.attendance_summary && (
              <div className="section">
                <SectionHead
                  title="Attendance summary"
                  action={
                    <Link className="btn btn--ghost btn--sm" href="/student/attendance">
                      Full history
                    </Link>
                  }
                />
                <div className="grid grid--stats">
                  {ATT_KEYS.map((k) => (
                    <StatCard
                      key={k}
                      label={ATTENDANCE_LABEL[k]}
                      value={d.attendance_summary?.[k] ?? 0}
                      tone={ATT_TONE[k]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Announcements */}
            <div className="section">
              <SectionHead
                title="Recent announcements"
                action={
                  <Link className="btn btn--ghost btn--sm" href="/student/announcements">
                    View all
                  </Link>
                }
              />
              {d.announcements?.length ? (
                <Card pad={false}>
                  <div className="msg-feed">
                    {d.announcements.map((a) => (
                      <div key={a.id} className="msg-feed__item">
                        <div className="msg-feed__meta">
                          <span className="msg-feed__channel">
                            {typeof a.channel === 'string' ? a.channel : a.channel?.name}
                          </span>
                          <span className="msg-feed__time">{formatDateTime(a.created_at)}</span>
                        </div>
                        <div className="msg-feed__sender">{a.sender}</div>
                        <div className="msg-feed__body">{a.body}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card>
                  <p className="muted">No announcements yet.</p>
                </Card>
              )}
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
