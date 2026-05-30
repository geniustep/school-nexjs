'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, SectionHead, Avatar } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatDateTime } from '@/lib/utils/format';
import type { ParentDashboard } from '@/types/dashboard';

export default function ParentDashboardPage() {
  const user = useSession();
  const state = useResource<ParentDashboard>(endpoints.parent.dashboard);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Your family overview" />
      <ResourceView state={state} loadingLabel="Loading your dashboard…">
        {(d) => (
          <>
            <SectionHead title="My children" />
            {d.children?.length ? (
              <div className="grid grid--cards">
                {d.children.map((c) => (
                  <Link key={c.id} href={`/parent/children/${c.id}`}>
                    <Card className="row-link">
                      <div className="row">
                        <Avatar name={c.full_name} />
                        <div className="col" style={{ gap: 2 }}>
                          <strong>{c.full_name}</strong>
                          <span className="tiny muted">{c.class?.name ?? '—'}</span>
                        </div>
                      </div>
                      <div className="between mt-4">
                        <span className="tiny faint">Today</span>
                        {c.today_attendance ? (
                          <AttendanceBadge status={c.today_attendance} />
                        ) : (
                          <span className="tiny muted">Not recorded</span>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon="👧" title="No children linked" description="No children are linked to your account yet." />
            )}

            {d.latest_messages?.length ? (
              <div className="section">
                <SectionHead title="Latest messages" />
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
              </div>
            ) : null}
          </>
        )}
      </ResourceView>
    </>
  );
}
