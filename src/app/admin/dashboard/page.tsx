'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PermissionDeniedState } from '@/components/states/states';
import {
  PageHeader,
  StatCard,
  Card,
  SectionHead,
  InfoBanner,
} from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { isConfiguredAdmin, isScopedAdmin } from '@/lib/permissions/scope';
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import type { AdminDashboard } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';
import type { StatTone } from '@/components/ui/primitives';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

// Maps each attendance status to a stat card accent color.
const ATT_TONE: Record<AttendanceStatus, StatTone> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

export default function AdminDashboardPage() {
  const user = useSession();
  const state = useResource<AdminDashboard>(
    isConfiguredAdmin(user) ? endpoints.admin.dashboard : null,
  );

  // Unconfigured admin (no scope, not super) — blocked, per API spec.
  if (!isConfiguredAdmin(user)) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={user.school?.name ?? undefined} />
        <Card>
          <PermissionDeniedState description="Your administrator account has no access scope configured yet. Please contact your school's main administrator to be granted access." />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={user.school?.name ?? 'School overview'}
      />

      {/* Scope notice for limited admins — appears inline, not as a tiny badge */}
      {isScopedAdmin(user) && (
        <InfoBanner
          tone="amber"
          icon="&#128274;"
          title="Limited access account"
          description="You are viewing data within your assigned scope only. Some students, classes, or sections may not be visible to you."
        />
      )}

      <ResourceView state={state} loadingLabel="Loading overview…">
        {(d) => (
          <>
            {/* School totals */}
            <div className="grid grid--stats">
              <StatCard label="Students" value={d.total_students} icon="🎓" />
              <StatCard label="Teachers" value={d.total_teachers} icon="👩‍🏫" />
              <StatCard label="Parents" value={d.total_parents} icon="👪" />
              <StatCard label="Classes" value={d.total_classes} icon="🏫" />
            </div>

            {/* Today's attendance — color-coded per status */}
            <div className="section">
              <SectionHead title="Today's attendance" />
              <div className="grid grid--stats">
                {ATT_KEYS.map((k) => (
                  <StatCard
                    key={k}
                    label={ATTENDANCE_LABEL[k]}
                    value={d.attendance_today?.[k] ?? 0}
                    tone={ATT_TONE[k]}
                  />
                ))}
                <StatCard
                  label="Total recorded"
                  value={d.attendance_today?.total_recorded ?? d.attendance_today?.total ?? 0}
                  tone="slate"
                />
              </div>
            </div>

            {/* Latest messages */}
            <div className="section">
              <SectionHead title="Latest messages" />
              {d.latest_messages?.length ? (
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
              ) : (
                <Card>
                  <p className="muted">No recent messages.</p>
                </Card>
              )}
            </div>

            {/* Important alerts */}
            {Array.isArray(d.important_alerts) && d.important_alerts.length > 0 && (
              <div className="section">
                <SectionHead title="Alerts" />
                <Card>
                  <ul>
                    {d.important_alerts.map((a, i) => (
                      <li key={i}>{String(a)}</li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
