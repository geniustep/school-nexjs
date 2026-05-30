'use client';

// Parent read-only view of a child's school information. The parent is NEVER
// acting as the student. All channels show can_send=false. No composer anywhere.
// Purely informational — viewing as parent, not impersonating.

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import {
  PageHeader,
  Card,
  Badge,
  StatCard,
  SectionHead,
  InfoBanner,
} from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { endpoints } from '@/lib/api/endpoints';
import { CHANNEL_TYPE_LABEL, ATTENDANCE_LABEL } from '@/lib/utils/labels';
import { formatDate, formatDateTime } from '@/lib/utils/format';
import type { ChildStudentView } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';
import type { StatTone } from '@/components/ui/primitives';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const ATT_TONE: Record<AttendanceStatus, StatTone> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

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
        ‹ Back to child overview
      </Link>
      <ResourceView state={state} loadingLabel="Loading child information…">
        {(d) => (
          <>
            <PageHeader
              title={d.student.full_name}
              subtitle="Viewing as parent"
            />

            <ChildSubnav id={id} />

            {/* Read-only context banner — clear, non-alarming */}
            <InfoBanner
              tone="blue"
              icon="ℹ"
              title="Read-only view"
              description="You are viewing your child's school information as a parent. You cannot send messages or take actions from this view."
            />

            {/* Attendance summary — color-coded per status */}
            <SectionHead title="Attendance summary" />
            <div className="grid grid--stats">
              {ATT_KEYS.map((k) => (
                <StatCard
                  key={k}
                  label={ATTENDANCE_LABEL[k]}
                  value={d.attendance_summary?.[k] ?? 0}
                  tone={ATT_TONE[k]}
                />
              ))}
              <StatCard
                label="Total days"
                value={d.attendance_summary?.total_days ?? d.attendance_summary?.total ?? 0}
                tone="slate"
              />
            </div>

            {/* Recent attendance list */}
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
                      <span className="muted" style={{ fontSize: 13 }}>{formatDate(a.date)}</span>
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

            {/* Child's channels — listed read-only, no links to chat composer */}
            <div className="section">
              <SectionHead title="Channels" />
              {d.channels?.length ? (
                <div className="grid grid--cards">
                  {d.channels.map((ch) => (
                    <Card key={ch.id}>
                      <div className="between">
                        <strong>{ch.name}</strong>
                        <Badge tone="slate">
                          {CHANNEL_TYPE_LABEL[ch.type as never] ?? ch.type}
                        </Badge>
                      </div>
                      {/* can_send is always false in child-view — no composer link. */}
                      <div className="mt-2">
                        <Badge tone="amber">Read-only</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <p className="muted">No channels available.</p>
                </Card>
              )}
            </div>

            {/* Announcements */}
            <div className="section">
              <SectionHead title="Announcements" />
              {d.announcements?.length ? (
                <Card pad={false}>
                  <div className="msg-feed">
                    {d.announcements.map((a) => (
                      <div key={a.id} className="msg-feed__item">
                        <div className="msg-feed__meta">
                          <span className="msg-feed__channel">
                            {typeof a.channel === 'string' ? a.channel : a.channel.name}
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
