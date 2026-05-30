'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PermissionDeniedState } from '@/components/states/states';
import { PageHeader, StatCard, Card, SectionHead, Badge } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { isConfiguredAdmin, isScopedAdmin } from '@/lib/permissions/scope';
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL, ATTENDANCE_TONE } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import type { AdminDashboard } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'excused_absence'];

export default function AdminDashboardPage() {
  const user = useSession();
  const state = useResource<AdminDashboard>(
    isConfiguredAdmin(user) ? endpoints.admin.dashboard : null,
  );

  // Unconfigured admin (no scope, not super) — blocked, per API_REPORT.md §4.
  if (!isConfiguredAdmin(user)) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={user.school?.name ?? undefined} />
        <Card>
          <PermissionDeniedState description="Your administrator account has no access scope configured yet. Please contact your school’s main administrator to be granted access." />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="School overview"
        actions={isScopedAdmin(user) ? <Badge tone="amber">Limited access</Badge> : undefined}
      />
      <ResourceView state={state} loadingLabel="Loading overview…">
        {(d) => (
          <>
            <div className="grid grid--stats">
              <StatCard label="Students" value={d.total_students} icon="🎓" />
              <StatCard label="Teachers" value={d.total_teachers} icon="👩‍🏫" />
              <StatCard label="Parents" value={d.total_parents} icon="👪" />
              <StatCard label="Classes" value={d.total_classes} icon="🏫" />
            </div>

            <div className="section">
              <SectionHead title="Today’s attendance" />
              <div className="grid grid--stats">
                {ATT_KEYS.map((k) => (
                  <StatCard
                    key={k}
                    label={ATTENDANCE_LABEL[k]}
                    value={d.attendance_today?.[k] ?? 0}
                  />
                ))}
                <StatCard label="Recorded" value={d.attendance_today?.total_recorded ?? 0} />
              </div>
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
