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
      <PageHeader
        title={`Welcome, ${user.name}`}
        subtitle="Your family overview"
      />
      <ResourceView state={state} loadingLabel="Loading your dashboard…">
        {(d) => (
          <>
            {/* Children section */}
            <SectionHead
              title="My children"
              action={
                <Link className="btn btn--ghost btn--sm" href="/parent/children">
                  View all
                </Link>
              }
            />
            {d.children?.length ? (
              <div className="grid grid--cards">
                {d.children.map((c) => (
                  <Link key={c.id} href={`/parent/children/${c.id}`}>
                    <Card className="row-link">
                      {/* Child identity */}
                      <div className="row" style={{ gap: 12 }}>
                        <Avatar name={c.full_name} />
                        <div className="col" style={{ gap: 2, flex: 1 }}>
                          <strong style={{ fontSize: 14 }}>{c.full_name}</strong>
                          <span className="tiny muted">{c.class?.name ?? 'No class assigned'}</span>
                        </div>
                      </div>

                      {/* Today's attendance */}
                      <div
                        className="between mt-4"
                        style={{
                          paddingBlockStart: 12,
                          borderBlockStart: '1px solid var(--c-border)',
                        }}
                      >
                        <span className="tiny muted">Today's attendance</span>
                        {c.today_attendance ? (
                          <AttendanceBadge status={c.today_attendance} />
                        ) : (
                          <span className="tiny muted">Not recorded yet</span>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="👧"
                title="No children linked"
                description="No children are linked to your account yet. Contact your school administrator."
              />
            )}

            {/* Latest messages */}
            {d.latest_messages?.length ? (
              <div className="section">
                <SectionHead
                  title="Latest messages"
                  action={
                    <Link className="btn btn--ghost btn--sm" href="/parent/channels">
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
        )}
      </ResourceView>
    </>
  );
}
