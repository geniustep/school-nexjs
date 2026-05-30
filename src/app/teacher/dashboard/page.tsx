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
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Your teaching overview" />
      <ResourceView state={state} loadingLabel="Loading your dashboard…">
        {(d) => (
          <>
            <div className="grid grid--stats">
              <StatCard label="Assigned classes" value={d.assigned_classes?.length ?? 0} icon="🏫" />
              <StatCard
                label="Pending attendance"
                value={d.assigned_classes?.reduce((n, c) => n + (c.attendance_pending ?? 0), 0) ?? 0}
                icon="🗓️"
              />
            </div>

            <div className="section">
              <SectionHead
                title="My classes"
                action={<Link className="btn btn--ghost btn--sm" href="/teacher/classes">View all</Link>}
              />
              {d.assigned_classes?.length ? (
                <div className="grid grid--cards">
                  {d.assigned_classes.map((c) => (
                    <Link key={c.id} href={`/teacher/classes/${c.id}`}>
                      <Card className="row-link">
                        <div className="between">
                          <strong>{c.name}</strong>
                          {c.attendance_pending ? (
                            <Badge tone="amber">{c.attendance_pending} to record</Badge>
                          ) : (
                            <Badge tone="green">Up to date</Badge>
                          )}
                        </div>
                        {typeof c.student_count === 'number' && (
                          <p className="muted tiny mt-2">{c.student_count} students</p>
                        )}
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon="🏫" title="No assigned classes" description="You have no classes assigned yet." />
              )}
            </div>

            <div className="section">
              <SectionHead title="Latest messages" />
              {d.latest_messages?.length ? (
                <Card pad={false}>
                  {d.latest_messages.map((m, i) => (
                    <div
                      key={m.id}
                      className="card--pad"
                      style={i ? { borderTop: '1px solid var(--c-border)' } : undefined}
                    >
                      <div className="between">
                        <strong className="tiny">{m.channel}</strong>
                        <span className="tiny faint">{formatDateTime(m.created_at)}</span>
                      </div>
                      <div className="tiny muted">{m.sender}</div>
                      <div className="mt-2">{m.body}</div>
                    </div>
                  ))}
                </Card>
              ) : (
                <Card>
                  <p className="muted">No recent messages.</p>
                </Card>
              )}
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
