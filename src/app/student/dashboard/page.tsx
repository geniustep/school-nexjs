'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, StatCard, SectionHead, Badge, Avatar } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { RecipientAnnouncementsDashboardSection } from '@/features/announcements/components/recipient-announcements-dashboard-section';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { StudentDashboard } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';
import type { StatTone } from '@/components/ui/primitives';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const ATT_LABEL_KEY: Record<AttendanceStatus, string> = {
  present: 'attendance.present',
  absent: 'attendance.absent',
  late: 'attendance.late',
  left_early: 'attendance.leftEarly',
};

const ATT_TONE: Record<AttendanceStatus, StatTone> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

function todayStatus(
  att: StudentDashboard['today_attendance'],
): AttendanceStatus | null {
  if (!att) return null;
  if (typeof att === 'string') return att;
  return att.status ?? null;
}

export default function StudentDashboardPage() {
  const user = useSession();
  const t = useT();
  const state = useResource<StudentDashboard>(endpoints.student.dashboard);

  return (
    <>
      <PageHeader
        title={t('dashboard.welcome', { name: user.name })}
        subtitle={t('dashboard.studentSubtitle')}
      />
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(d) => {
          const status = todayStatus(d.today_attendance);

          return (
            <>
              <Card>
                <div className="between">
                  <div className="row" style={{ gap: 14 }}>
                    <Avatar name={getStudentDisplayName(d.profile)} />
                    <div className="col" style={{ gap: 3 }}>
                      <strong style={{ fontSize: 16 }}>{getStudentDisplayName(d.profile)}</strong>
                      <span className="tiny muted">
                        {d.profile.class?.name ?? t('common.dash')}
                        {d.profile.level?.name ? ` · ${d.profile.level.name}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="col" style={{ gap: 4, alignItems: 'flex-end' }}>
                    <span className="tiny muted">{t('attendance.today')}</span>
                    {status ? (
                      <AttendanceBadge status={status} />
                    ) : (
                      <Badge tone="slate">{t('attendance.notRecorded')}</Badge>
                    )}
                  </div>
                </div>
              </Card>

              <div className="section">
                <SectionHead title={t('dashboard.shortcuts')} />
                <div className="class-actions">
                  <Link href="/student/homeworks" className="btn btn--ghost btn--sm class-actions__btn">
                    <span aria-hidden="true">📝</span>
                    {t('dashboard.myHomework')}
                    {(d.pending_homeworks ?? 0) > 0 && ` (${d.pending_homeworks})`}
                  </Link>
                  <Link href="/student/resources" className="btn btn--ghost btn--sm class-actions__btn">
                    <span aria-hidden="true">📚</span>
                    {t('dashboard.myResources')}
                    {(d.unread_resources ?? 0) > 0 && ` (${d.unread_resources})`}
                  </Link>
                  <Link href="/student/exams" className="btn btn--ghost btn--sm class-actions__btn">
                    <span aria-hidden="true">📋</span>
                    {t('dashboard.myExams')}
                  </Link>
                  <Link href="/student/exam-results" className="btn btn--ghost btn--sm class-actions__btn">
                    <span aria-hidden="true">📊</span>
                    {t('dashboard.myResults')}
                  </Link>
                  <Link href="/student/timetable" className="btn btn--ghost btn--sm class-actions__btn">
                    <span aria-hidden="true">📅</span>
                    {t('nav.timetable')}
                  </Link>
                </div>
              </div>

              {d.attendance_summary && (
                <div className="section">
                  <SectionHead
                    title={t('dashboard.attendanceSummary')}
                    action={
                      <Link className="btn btn--ghost btn--sm" href="/student/attendance">
                        {t('dashboard.fullHistory')}
                      </Link>
                    }
                  />
                  <div className="grid grid--stats">
                    {ATT_KEYS.map((k) => (
                      <StatCard
                        key={k}
                        label={t(ATT_LABEL_KEY[k])}
                        value={d.attendance_summary?.[k] ?? 0}
                        tone={ATT_TONE[k]}
                      />
                    ))}
                  </div>
                </div>
              )}

              <RecipientAnnouncementsDashboardSection
                basePath="/student/announcements"
                title={t('dashboard.recentAnnouncements')}
              />
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
