'use client';

// Parent read-only student-view (API_REPORT.md §5). The parent is NEVER acting
// as the student: every channel shows can_send=false and there is no composer
// anywhere on this page. Purely informational.

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, Badge, StatCard, SectionHead } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { endpoints } from '@/lib/api/endpoints';
import { CHANNEL_TYPE_LABEL, ATTENDANCE_LABEL } from '@/lib/utils/labels';
import { formatDate, formatDateTime } from '@/lib/utils/format';
import type { ChildStudentView } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'excused_absence'];

export default function ChildStudentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const state = useResource<ChildStudentView>(endpoints.parent.childStudentView(id));

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ Back to child
      </Link>
      <ResourceView state={state} loadingLabel="Loading student view…">
        {(d) => (
          <>
            <PageHeader
              title={d.student.full_name}
              subtitle="Read-only student view"
              actions={<Badge tone="amber">Read-only</Badge>}
            />
            <ChildSubnav id={id} />

            <div className="card--pad card" style={{ marginBlockEnd: 16, background: 'var(--c-surface-2)' }}>
              <span className="tiny muted">🔒 {d.note}</span>
            </div>

            <SectionHead title="Attendance summary" />
            <div className="grid grid--stats">
              {ATT_KEYS.map((k) => (
                <StatCard key={k} label={ATTENDANCE_LABEL[k]} value={d.attendance_summary?.[k] ?? 0} />
              ))}
              <StatCard label="Total days" value={d.attendance_summary?.total_days ?? 0} />
            </div>

            <div className="section">
              <SectionHead title="Recent attendance" />
              {d.latest_attendance?.length ? (
                <Card pad={false}>
                  {d.latest_attendance.map((a, i) => (
                    <div
                      key={i}
                      className="card--pad between"
                      style={i ? { borderTop: '1px solid var(--c-border)' } : undefined}
                    >
                      <span>{formatDate(a.date)}</span>
                      <AttendanceBadge status={a.status} />
                    </div>
                  ))}
                </Card>
              ) : (
                <Card>
                  <p className="muted">No attendance records yet.</p>
                </Card>
              )}
            </div>

            <div className="section">
              <SectionHead title="Channels" />
              {d.channels?.length ? (
                <div className="grid grid--cards">
                  {d.channels.map((ch) => (
                    <Card key={ch.id}>
                      <div className="between">
                        <strong>{ch.name}</strong>
                        <Badge tone="slate">{CHANNEL_TYPE_LABEL[ch.type as never] ?? ch.type}</Badge>
                      </div>
                      {/* can_send is always false in child-view — no composer. */}
                      <div className="mt-2">
                        <Badge tone="amber">Read-only</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <p className="muted">No channels.</p>
                </Card>
              )}
            </div>

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
                          {typeof a.channel === 'string' ? a.channel : a.channel.name}
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
