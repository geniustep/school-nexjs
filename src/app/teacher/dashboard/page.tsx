'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { Badge } from '@/components/ui/primitives';
import { ClassCard } from '@/features/teacher/class-card';
import {
  TeacherCommandHero,
  TeacherStatCard,
  TeacherSection,
  TeacherWorkspaceCard,
  TeacherEmptyState,
  TeacherMessageItem,
  TeacherQuickChip,
} from '@/features/teacher/ui/teacher-primitives';
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
  const { formatDateTime, formatDateLong } = useFormat();
  const state = useResource<TeacherDashboard>(endpoints.teacher.dashboard);

  const todayLabel = formatDateLong(new Date().toISOString().slice(0, 10));

  return (
    <div className="teacher-workspace">
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(d) => {
          const examResultsHref = d.next_exam?.id
            ? `/teacher/exams/${d.next_exam.id}/results`
            : d.assigned_classes?.[0]?.id
              ? `/teacher/classes/${d.assigned_classes[0].id}/exam-results`
              : '/teacher/exam-results';

          const messageCount = d.latest_messages?.length ?? 0;
          const previewClasses = d.assigned_classes ?? [];
          const nextClassId = d.next_class?.class?.id;

          const heroCta = nextClassId ? (
            <Link className="btn btn--hero" href={`/teacher/classes/${nextClassId}`}>
              {t('teacher.openNextClass')}
            </Link>
          ) : (
            <Link className="btn btn--hero btn--hero-ghost" href="/teacher/timetable">
              {t('nav.timetable')}
            </Link>
          );

          return (
            <>
              <TeacherCommandHero
                greeting={t('dashboard.welcome', { name: user.name })}
                schoolName={user.school?.name}
                roleBadge={t('roles.teacher')}
                dateLabel={todayLabel}
                cta={heroCta}
              >
                {d.next_class ? (
                  <div className="t-hero-lesson">
                    <Badge tone="blue">{t('badges.next')}</Badge>
                    <div>
                      <strong>{d.next_class.subject?.name ?? t('common.dash')}</strong>
                      <span className="t-hero-lesson__meta">
                        {d.next_class.class?.name}
                        {d.next_class.start_time &&
                          ` · ${formatTimeRange(d.next_class.start_time, d.next_class.end_time)}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="t-hero-lesson t-hero-lesson--empty">{t('empty.timetableToday')}</p>
                )}
              </TeacherCommandHero>

              <div className="t-snapshot">
                <TeacherStatCard
                  label={t('dashboard.classesToday')}
                  value={d.classes_today ?? 0}
                  icon="📅"
                />
                <TeacherStatCard
                  label={t('dashboard.todaySlots')}
                  value={d.today_slots_count ?? 0}
                  icon="🕐"
                />
                <TeacherStatCard
                  label={t('dashboard.nextClass')}
                  value={
                    d.next_class?.subject?.name ??
                    d.next_class?.class?.name ??
                    t('common.dash')
                  }
                  icon="⏭️"
                  tone={d.next_class ? 'blue' : 'none'}
                />
                <TeacherStatCard
                  label={t('dashboard.latestMessages')}
                  value={messageCount}
                  icon="💬"
                  tone={messageCount > 0 ? 'blue' : 'none'}
                  href={messageCount > 0 ? '/teacher/channels' : undefined}
                />
                {(d.submissions_to_review ?? 0) > 0 && (
                  <TeacherStatCard
                    label={t('dashboard.submissionsNew')}
                    value={d.submissions_to_review ?? 0}
                    icon="📥"
                    tone="amber"
                    href="/teacher/submissions"
                  />
                )}
                {(d.draft_exam_results_count ?? 0) > 0 && (
                  <TeacherStatCard
                    label={t('dashboard.draftExamResults')}
                    value={d.draft_exam_results_count ?? 0}
                    icon="✏️"
                    tone="amber"
                    href={examResultsHref}
                  />
                )}
              </div>

              <div className="t-workspace-grid">
                <div className="t-workspace-main">
                  {d.next_class?.class?.id && (
                    <TeacherWorkspaceCard title={t('teacher.todayWork')} icon="📋">
                      <div className="t-next-work">
                        <div>
                          <strong>{d.next_class.subject?.name}</strong>
                          <p className="muted">
                            {d.next_class.class?.name}
                            {d.next_class.start_time &&
                              ` · ${formatTimeRange(d.next_class.start_time, d.next_class.end_time)}`}
                          </p>
                        </div>
                        <div className="t-next-work__actions">
                          <Link
                            className="btn btn--primary btn--sm"
                            href={`/teacher/classes/${d.next_class.class.id}`}
                          >
                            {t('teacher.openClass')}
                          </Link>
                          <Link
                            className="btn btn--ghost btn--sm"
                            href={`/teacher/attendance?class=${d.next_class.class.id}`}
                          >
                            {t('academic.takeAttendance')}
                          </Link>
                        </div>
                      </div>
                    </TeacherWorkspaceCard>
                  )}

                  <TeacherSection
                    title={t('nav.myClasses')}
                    action={
                      <Link className="btn btn--ghost btn--sm" href="/teacher/classes">
                        {t('teacher.viewAllClasses')}
                      </Link>
                    }
                  >
                    {previewClasses.length ? (
                      <div
                        className="grid grid--class-preview"
                        data-count={previewClasses.length <= 2 ? previewClasses.length : undefined}
                      >
                        {previewClasses.slice(0, 4).map((c) => (
                          <ClassCard
                            key={c.id}
                            classInfo={c}
                            pending={pendingForClass(d, c.id)}
                            variant={previewClasses.length === 1 ? 'full' : 'compact'}
                          />
                        ))}
                      </div>
                    ) : (
                      <TeacherEmptyState
                        compact
                        icon="🏫"
                        title={t('empty.classes')}
                        description={t('empty.classes')}
                      />
                    )}
                  </TeacherSection>
                </div>

                <aside className="t-workspace-aside">
                  <TeacherWorkspaceCard
                    title={t('dashboard.latestMessages')}
                    icon="💬"
                    action={
                      <Link className="btn btn--ghost btn--sm" href="/teacher/channels">
                        {t('dashboard.allChannels')}
                      </Link>
                    }
                  >
                    {d.latest_messages?.length ? (
                      <div className="t-msg-feed">
                        {d.latest_messages.slice(0, 5).map((m) => (
                          <TeacherMessageItem
                            key={m.id}
                            channel={m.channel}
                            sender={m.sender}
                            body={m.body}
                            time={formatDateTime(m.created_at)}
                          />
                        ))}
                      </div>
                    ) : (
                      <TeacherEmptyState
                        compact
                        icon="💬"
                        title={t('empty.messages')}
                        description={t('teacher.messagesEmptyDesc')}
                      />
                    )}
                  </TeacherWorkspaceCard>

                  <TeacherWorkspaceCard title={t('teacher.quickActions')} icon="⚡">
                    <div className="t-quick-grid">
                      <TeacherQuickChip href="/teacher/classes" icon="🏫" label={t('nav.myClasses')} />
                      <TeacherQuickChip href="/teacher/timetable" icon="📅" label={t('nav.timetable')} />
                      <TeacherQuickChip href="/teacher/channels" icon="💬" label={t('nav.channels')} />
                      {(d.submissions_to_review ?? 0) > 0 && (
                        <TeacherQuickChip
                          href="/teacher/submissions"
                          icon="📥"
                          label={t('nav.submissions')}
                        />
                      )}
                    </div>
                  </TeacherWorkspaceCard>
                </aside>
              </div>
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}
