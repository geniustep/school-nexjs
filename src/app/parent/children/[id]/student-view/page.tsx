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
import { useT } from '@/features/i18n/locale-context';
import { channelTypeLabel, attendanceStatusLabel } from '@/lib/utils/labels';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
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
  const t = useT();
  const state = useResource<ChildStudentView>(endpoints.parent.childStudentView(id));

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ {t('parent.backToChildOverview')}
      </Link>
      <ResourceView state={state} loadingLabel={t('parent.loadingChildInfo')}>
        {(d) => (
          <>
            <PageHeader
              title={getStudentDisplayName(d.student)}
              subtitle={t('parent.viewingAsParent')}
            />

            <ChildSubnav id={id} />

            <InfoBanner
              tone="blue"
              icon="ℹ"
              title={t('parent.readOnlyBannerTitle')}
              description={t('parent.readOnlyBannerDesc')}
            />

            <SectionHead title={t('parent.attendanceSummary')} />
            <div className="grid grid--stats">
              {ATT_KEYS.map((k) => (
                <StatCard
                  key={k}
                  label={attendanceStatusLabel(t, k)}
                  value={d.attendance_summary?.[k] ?? 0}
                  tone={ATT_TONE[k]}
                />
              ))}
              <StatCard
                label={t('parent.totalDays')}
                value={d.attendance_summary?.total_days ?? d.attendance_summary?.total ?? 0}
                tone="slate"
              />
            </div>

            <div className="section">
              <SectionHead title={t('parent.recentAttendance')} />
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
                  <p className="muted">{t('empty.attendanceRecordsYet')}</p>
                </Card>
              )}
            </div>

            <div className="section">
              <SectionHead title={t('channels.title')} />
              {d.channels?.length ? (
                <div className="grid grid--cards">
                  {d.channels.map((ch) => (
                    <Card key={ch.id}>
                      <div className="between">
                        <strong>{ch.name}</strong>
                        <Badge tone="slate">{channelTypeLabel(t, ch.type)}</Badge>
                      </div>
                      <div className="mt-2">
                        <Badge tone="amber">{t('channels.readOnly')}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <p className="muted">{t('empty.noChannelsAvailable')}</p>
                </Card>
              )}
            </div>

            <div className="section">
              <SectionHead title={t('nav.announcements')} />
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
                  <p className="muted">{t('dashboard.noAnnouncements')}</p>
                </Card>
              )}
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
