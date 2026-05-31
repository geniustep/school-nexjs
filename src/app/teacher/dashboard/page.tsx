'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, StatCard, SectionHead, Badge } from '@/components/ui/primitives';
import { ClassActionGrid } from '@/features/teacher/class-actions';
import { useSession } from '@/features/auth/session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatTimeRange } from '@/features/timetable/utils';
import type { TeacherDashboard } from '@/types/dashboard';

function pendingForClass(d: TeacherDashboard, classId: number): number {
  const row = d.today_attendance_pending?.find((p) => p.class_id === classId);
  return row?.pending ?? 0;
}

export default function TeacherDashboardPage() {
  const user = useSession();
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const state = useResource<TeacherDashboard>(endpoints.teacher.dashboard);

  return (
    <>
      <PageHeader
        title={t('dashboard.welcome', { name: user.name })}
        subtitle={t('dashboard.teacherSubtitle')}
      />
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(d) => {
          const examResultsHref = d.next_exam?.id
            ? `/teacher/exams/${d.next_exam.id}/results`
            : d.assigned_classes?.[0]?.id
              ? `/teacher/classes/${d.assigned_classes[0].id}/exam-results`
              : '/teacher/classes';

          return (
            <>
              <div className="grid grid--stats">
                <StatCard label={t('dashboard.classesToday')} value={d.classes_today ?? 0} icon="📅" />
                <StatCard label={t('dashboard.todaySlots')} value={d.today_slots_count ?? 0} icon="🕐" />
                <StatCard
                  label={t('dashboard.publishedHomeworks')}
                  value={d.published_homeworks ?? 0}
                  icon="📝"
                />
                <StatCard
                  label={t('dashboard.submissionsToReview')}
                  value={d.submissions_to_review ?? 0}
                  icon="📥"
                  tone={(d.submissions_to_review ?? 0) > 0 ? 'amber' : 'none'}
                />
                <StatCard
                  label={t('dashboard.publishedResources')}
                  value={d.published_resources ?? 0}
                  icon="📚"
                />
                <StatCard
                  label={t('dashboard.upcomingExams')}
                  value={d.upcoming_exams_count ?? 0}
                  icon="📋"
                />
                <StatCard
                  label={t('dashboard.examsThisWeek')}
                  value={d.exams_this_week ?? 0}
                  icon="🗓️"
                />
                <StatCard
                  label={t('dashboard.draftExamResults')}
                  value={d.draft_exam_results_count ?? 0}
                  icon="✏️"
                  tone={(d.draft_exam_results_count ?? 0) > 0 ? 'amber' : 'none'}
                />
                <StatCard
                  label={t('dashboard.publishedExamResults')}
                  value={d.published_exam_results_count ?? 0}
                  icon="✅"
                />
                <StatCard
                  label={t('dashboard.examsMissingResults')}
                  value={d.exams_missing_results ?? 0}
                  icon="⚠️"
                  tone={(d.exams_missing_results ?? 0) > 0 ? 'amber' : 'none'}
                />
              </div>

              <div className="section row" style={{ gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn btn--primary btn--sm" href="/teacher/timetable">
                  {t('nav.timetable')}
                </Link>
                {(d.submissions_to_review ?? 0) > 0 && (
                  <Link className="btn btn--primary btn--sm" href="/teacher/submissions">
                    {t('dashboard.reviewSubmissions', { count: d.submissions_to_review ?? 0 })}
                  </Link>
                )}
                {(d.draft_exam_results_count ?? 0) > 0 && (
                  <Link className="btn btn--ghost btn--sm" href={examResultsHref}>
                    {t('dashboard.draftResults', { count: d.draft_exam_results_count ?? 0 })}
                  </Link>
                )}
              </div>

              {d.next_class && (
                <div className="section">
                  <SectionHead title={t('dashboard.nextClass')} />
                  <Link href="/teacher/timetable">
                    <Card className="row-link">
                      <strong>{d.next_class.subject?.name ?? t('common.dash')}</strong>
                      <p className="tiny muted mt-2">
                        {d.next_class.class?.name ?? ''}
                        {d.next_class.start_time &&
                          ` · ${formatTimeRange(d.next_class.start_time, d.next_class.end_time)}`}
                      </p>
                    </Card>
                  </Link>
                </div>
              )}

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
                      <Link
                        className="btn btn--ghost btn--sm"
                        href={`/teacher/exams/${d.next_exam.id}`}
                      >
                        {t('dashboard.details')}
                      </Link>
                    </div>
                  </Card>
                </div>
              )}

              <div className="section">
                <SectionHead
                  title={t('nav.myClasses')}
                  action={
                    <Link className="btn btn--ghost btn--sm" href="/teacher/classes">
                      {t('common.viewAll')}
                    </Link>
                  }
                />
                {d.assigned_classes?.length ? (
                  <div className="grid grid--cards">
                    {d.assigned_classes.map((c) => {
                      const pending = pendingForClass(d, c.id);
                      const levelName =
                        typeof c.level === 'string' ? c.level : c.level?.name;
                      return (
                        <Card key={c.id}>
                          <div className="between">
                            <strong style={{ fontSize: 15 }}>{c.name}</strong>
                            {pending > 0 ? (
                              <Badge tone="amber">
                                {t('badges.pending', { count: pending })}
                              </Badge>
                            ) : (
                              <Badge tone="green">{t('badges.upToDate')}</Badge>
                            )}
                          </div>
                          <div className="row mt-2 tiny muted" style={{ gap: 12 }}>
                            {levelName && <span>{levelName}</span>}
                            {typeof c.student_count === 'number' && (
                              <span>{t('academic.pupilCount', { count: c.student_count })}</span>
                            )}
                          </div>
                          <ClassActionGrid classId={c.id} />
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon="🏫"
                    title={t('empty.classes')}
                    description={t('empty.classes')}
                  />
                )}
              </div>

              {d.latest_messages?.length ? (
                <div className="section">
                  <SectionHead
                    title={t('dashboard.latestMessages')}
                    action={
                      <Link className="btn btn--ghost btn--sm" href="/teacher/channels">
                        {t('dashboard.allChannels')}
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
          );
        }}
      </ResourceView>
    </>
  );
}
