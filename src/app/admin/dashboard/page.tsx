'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
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
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { isConfiguredAdmin, isScopedAdmin } from '@/lib/permissions/scope';
import { endpoints } from '@/lib/api/endpoints';
import { ATTENDANCE_LABEL } from '@/lib/utils/labels';
import type { AdminDashboard } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';
import type { StatTone } from '@/components/ui/primitives';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const ATT_TONE: Record<AttendanceStatus, StatTone> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

function LinkedStatCard({
  href,
  label,
  value,
  icon,
  tone = 'none',
}: {
  href: string;
  label: string;
  value: ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
}) {
  return (
    <Link href={href} className="stat-link">
      <StatCard label={label} value={value} icon={icon} tone={tone} />
    </Link>
  );
}

export default function AdminDashboardPage() {
  const user = useSession();
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const state = useResource<AdminDashboard>(
    isConfiguredAdmin(user) ? endpoints.admin.dashboard : null,
  );

  if (!isConfiguredAdmin(user)) {
    return (
      <>
        <PageHeader title={t('nav.dashboard')} subtitle={user.school?.name ?? undefined} />
        <Card>
          <PermissionDeniedState description={t('admin.noScopeDesc')} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('nav.dashboard')} subtitle={user.school?.name ?? t('admin.dashboardSubtitle')} />

      {isScopedAdmin(user) && (
        <InfoBanner
          tone="amber"
          icon="&#128274;"
          title={t('admin.limitedAccess')}
          description={t('admin.limitedAccessDesc')}
        />
      )}

      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(d) => (
          <>
            <div className="grid grid--stats">
              <LinkedStatCard href="/admin/students" label={t('nav.students')} value={d.total_students} icon="🎓" />
              <LinkedStatCard href="/admin/teachers" label={t('nav.teachers')} value={d.total_teachers} icon="👩‍🏫" />
              <LinkedStatCard href="/admin/parents" label={t('nav.parents')} value={d.total_parents} icon="👪" />
              <LinkedStatCard href="/admin/classes" label={t('nav.classes')} value={d.total_classes} icon="🏫" />
            </div>

            <div className="section">
              <SectionHead title={t('dashboard.todayAttendance')} />
              <div className="grid grid--stats">
                {ATT_KEYS.map((k) => (
                  <LinkedStatCard
                    key={k}
                    href="/admin/attendance"
                    label={ATTENDANCE_LABEL[k]}
                    value={d.attendance_today?.[k] ?? 0}
                    tone={ATT_TONE[k]}
                  />
                ))}
                <LinkedStatCard
                  href="/admin/attendance"
                  label={t('admin.totalRecorded')}
                  value={d.attendance_today?.total_recorded ?? d.attendance_today?.total ?? 0}
                  tone="slate"
                />
              </div>
            </div>

            <div className="section">
              <SectionHead
                title={t('admin.academicOverview')}
                action={
                  <Link className="btn btn--ghost btn--sm" href="/admin/academic">
                    {t('admin.academicCenter')}
                  </Link>
                }
              />
              <div className="grid grid--stats">
                <LinkedStatCard
                  href="/admin/homeworks"
                  label={t('dashboard.publishedHomeworks')}
                  value={d.published_homeworks ?? 0}
                  icon="📝"
                />
                <LinkedStatCard
                  href="/admin/resources"
                  label={t('dashboard.publishedResources')}
                  value={d.published_resources ?? 0}
                  icon="📚"
                />
                <LinkedStatCard
                  href="/admin/exams"
                  label={t('dashboard.upcomingExams')}
                  value={d.upcoming_exams_count ?? 0}
                  icon="📋"
                />
                <LinkedStatCard
                  href="/admin/exam-results"
                  label={t('dashboard.draftExamResults')}
                  value={d.draft_exam_results_count ?? 0}
                  icon="✏️"
                  tone={(d.draft_exam_results_count ?? 0) > 0 ? 'amber' : 'none'}
                />
                <LinkedStatCard
                  href="/admin/exam-results"
                  label={t('dashboard.publishedExamResults')}
                  value={d.published_exam_results_count ?? 0}
                  icon="✅"
                />
                <LinkedStatCard
                  href="/admin/exams"
                  label={t('dashboard.examsMissingResults')}
                  value={d.exams_missing_results ?? 0}
                  icon="⚠️"
                  tone={(d.exams_missing_results ?? 0) > 0 ? 'amber' : 'none'}
                />
              </div>
            </div>

            {d.next_exam && (
              <div className="section">
                <SectionHead title={t('dashboard.nextExam')} />
                <Card>
                  <div className="between">
                    <div>
                      <strong>{d.next_exam.name}</strong>
                      <p className="tiny muted mt-2">
                        {d.next_exam.class?.name}
                        {d.next_exam.exam_date && ` · ${formatDate(d.next_exam.exam_date)}`}
                      </p>
                    </div>
                    <Link className="btn btn--ghost btn--sm" href={`/admin/exams/${d.next_exam.id}`}>
                      {t('dashboard.details')}
                    </Link>
                  </div>
                </Card>
              </div>
            )}

            <div className="section">
              <SectionHead
                title={t('dashboard.latestMessages')}
                action={
                  <Link className="btn btn--ghost btn--sm" href="/admin/channels">
                    {t('dashboard.allChannels')}
                  </Link>
                }
              />
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
                  <p className="muted">{t('empty.messages')}</p>
                </Card>
              )}
            </div>

            {Array.isArray(d.important_alerts) && d.important_alerts.length > 0 && (
              <div className="section">
                <SectionHead title={t('admin.alerts')} />
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
