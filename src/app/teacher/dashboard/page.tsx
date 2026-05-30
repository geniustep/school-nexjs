'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, StatCard, SectionHead, Badge } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatDateTime } from '@/lib/utils/format';
import type { TeacherDashboard } from '@/types/dashboard';

export default function TeacherDashboardPage() {
  const user = useSession();
  const state = useResource<TeacherDashboard>(endpoints.teacher.dashboard);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name}`}
        subtitle="Your teaching overview for today"
      />
      <ResourceView state={state} loadingLabel="Loading your dashboard…">
        {(d) => {
          const totalPending = d.assigned_classes?.reduce(
            (n, c) => n + (c.attendance_pending ?? 0),
            0,
          ) ?? 0;

          return (
            <>
              {/* Quick stats */}
              <div className="grid grid--stats">
                <StatCard
                  label="Assigned classes"
                  value={d.assigned_classes?.length ?? 0}
                  icon="🏫"
                />
                <StatCard
                  label="Pending attendance"
                  value={totalPending}
                  icon="🗓️"
                  tone={totalPending > 0 ? 'amber' : 'green'}
                />
              </div>

              {/* My classes */}
              <div className="section">
                <SectionHead
                  title="My classes"
                  action={
                    <Link className="btn btn--ghost btn--sm" href="/teacher/classes">
                      View all
                    </Link>
                  }
                />
                {d.assigned_classes?.length ? (
                  <div className="grid grid--cards">
                    {d.assigned_classes.map((c) => (
                      <Link key={c.id} href={`/teacher/classes/${c.id}`}>
                        <Card className="row-link">
                          <div className="between">
                            <strong style={{ fontSize: 15 }}>{c.name}</strong>
                            {c.attendance_pending ? (
                              <Badge tone="amber">{c.attendance_pending} pending</Badge>
                            ) : (
                              <Badge tone="green">Up to date</Badge>
                            )}
                          </div>
                          <div className="row mt-2" style={{ gap: 12 }}>
                            {typeof c.student_count === 'number' && (
                              <span className="tiny muted">{c.student_count} students</span>
                            )}
                            {c.attendance_pending ? (
                              <span className="tiny" style={{ color: 'var(--c-amber)' }}>
                                Attendance needed
                              </span>
                            ) : (
                              <span className="tiny" style={{ color: 'var(--c-green)' }}>
                                All recorded
                              </span>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="🏫"
                    title="No assigned classes"
                    description="You have no classes assigned yet. Contact your administrator."
                  />
                )}
              </div>

              {/* Latest messages */}
              {d.latest_messages?.length ? (
                <div className="section">
                  <SectionHead
                    title="Latest messages"
                    action={
                      <Link className="btn btn--ghost btn--sm" href="/teacher/channels">
                        All channels
                      </Link>
                    }
                  />
                  <Card pad={false}>
                    <div className="msg-feed">
                      {d.latest_messages.map((m) => (
                        <div key={m.id} className="msg-feed__item">
                          <div className="msg-feed__meta">
                            <span className="msg-feed__channel">{m.channel}</span>
                            <span className="msg-feed__time">{formatDateTime(m.created_at)}</span>
                          </div>
                          <div className="msg-feed__sender">{m.sender}</div>
                          <div className="msg-feed__body">{m.body}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              ) : null}
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
