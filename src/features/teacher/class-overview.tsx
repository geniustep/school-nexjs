'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { LoadingState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { TeacherLinkingState } from '@/features/teacher/teacher-linking-state';
import { TeacherWorkspaceCard, TeacherQuickChip, TeacherEmptyState } from '@/features/teacher/ui/teacher-primitives';
import { shouldRenderTeacherLinkingState } from '@/lib/auth/teacher-workspace-api';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatTimeRange } from '@/features/timetable/utils';
import type { AttendanceToday } from '@/types/attendance';
import type { HomeworkSummary } from '@/types/homework';
import type { ResourceSummary } from '@/types/resource';
import type { ExamSummary } from '@/types/exam';
import type { TodayTimetable } from '@/types/timetable';

function AttendanceSummaryChips({
  summary,
  t,
}: {
  summary: AttendanceToday['summary'];
  t: ReturnType<typeof useT>;
}) {
  const items = [
    { key: 'present', tone: 'present' as const },
    { key: 'absent', tone: 'absent' as const },
    { key: 'late', tone: 'late' as const },
    { key: 'left_early', tone: 'left_early' as const },
  ];
  return (
    <div className="t-overview-chips">
      {items.map(({ key, tone }) => (
        <span key={key} className={`attendance-chip attendance-chip--${tone}`}>
          {t(`attendance.${key === 'left_early' ? 'leftEarly' : key}`)}:{' '}
          <strong>{summary[key as keyof typeof summary] ?? 0}</strong>
        </span>
      ))}
    </div>
  );
}

export function ClassOverview({ classId }: { classId: number }) {
  const t = useT();
  const { formatDate } = useFormat();
  const pathname = usePathname();
  const id = String(classId);

  const attendance = useResource<AttendanceToday>(endpoints.teacher.attendanceToday(classId));
  const timetable = useResource<TodayTimetable>(endpoints.teacher.timetableToday);
  const homeworks = useResource<HomeworkSummary[]>(endpoints.teacher.classHomeworks(id));
  const resources = useResource<ResourceSummary[]>(endpoints.teacher.classResources(id));
  const exams = useResource<ExamSummary[]>(endpoints.teacher.classExams(id));

  const todaySlot = timetable.data?.slots?.find((s) => s.class?.id === classId);

  return (
    <div className="t-overview-grid">
      <TeacherWorkspaceCard
        title={t('teacher.overviewAttendance')}
        icon="🗓️"
        action={
          <Link className="btn btn--ghost btn--sm" href={`/teacher/attendance?class=${classId}`}>
            {t('academic.takeAttendance')}
          </Link>
        }
      >
        <ResourceView state={attendance} loadingLabel={t('common.loading')} compactLinking>
          {(data) => (
            <>
              <AttendanceSummaryChips summary={data.summary} t={t} />
              {(data.not_recorded?.length ?? 0) > 0 && (
                <p className="t-overview-hint muted">
                  {t('teacher.pendingAttendance', { count: data.not_recorded.length })}
                </p>
              )}
            </>
          )}
        </ResourceView>
      </TeacherWorkspaceCard>

      <TeacherWorkspaceCard title={t('teacher.overviewTodayLesson')} icon="📅">
        {timetable.loading && !timetable.data ? (
          <LoadingState label={t('common.loading')} />
        ) : shouldRenderTeacherLinkingState(timetable.error, { pathname }) ? (
          <TeacherLinkingState compact onRetry={timetable.reload} />
        ) : todaySlot ? (
          <div className="t-overview-lesson">
            <strong>{todaySlot.subject?.name ?? t('common.dash')}</strong>
            {todaySlot.start_time && (
              <span className="muted">
                {formatTimeRange(todaySlot.start_time, todaySlot.end_time)}
                {todaySlot.room && ` · ${t('common.room', { room: todaySlot.room })}`}
              </span>
            )}
          </div>
        ) : (
          <p className="muted">{t('empty.timetableToday')}</p>
        )}
      </TeacherWorkspaceCard>

      <TeacherWorkspaceCard
        title={t('nav.homework')}
        icon="📝"
        action={
          <Link className="btn btn--ghost btn--sm" href={`/teacher/classes/${classId}/homeworks`}>
            {t('common.viewAll')}
          </Link>
        }
      >
        <ResourceView state={homeworks} loadingLabel={t('common.loading')} compactLinking>
          {(items) =>
            items.length === 0 ? (
              <TeacherEmptyState compact icon="📝" title={t('empty.homework')} />
            ) : (
              <ul className="t-overview-list">
                {items.slice(0, 3).map((hw) => (
                  <li key={hw.id}>
                    <Link href={`/teacher/homeworks/${hw.id}`} className="t-overview-list__item">
                      <span>{hw.name}</span>
                      <WorkflowBadge state={hw.state} />
                    </Link>
                    {hw.deadline && (
                      <span className="t-overview-list__sub muted">
                        {t('academic.deadline')} {formatDate(hw.deadline)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </ResourceView>
      </TeacherWorkspaceCard>

      <TeacherWorkspaceCard
        title={t('nav.teacherResources')}
        icon="📚"
        action={
          <Link className="btn btn--ghost btn--sm" href={`/teacher/classes/${classId}/resources`}>
            {t('common.viewAll')}
          </Link>
        }
      >
        <ResourceView state={resources} loadingLabel={t('common.loading')} compactLinking>
          {(items) =>
            items.length === 0 ? (
              <TeacherEmptyState compact icon="📚" title={t('empty.resources')} />
            ) : (
              <ul className="t-overview-list">
                {items.slice(0, 3).map((r) => (
                  <li key={r.id}>
                    <Link href={`/teacher/resources/${r.id}`} className="t-overview-list__item">
                      <span>{r.name}</span>
                      <WorkflowBadge state={r.state} />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        </ResourceView>
      </TeacherWorkspaceCard>

      <TeacherWorkspaceCard
        title={t('nav.exams')}
        icon="📋"
        action={
          <Link className="btn btn--ghost btn--sm" href={`/teacher/classes/${classId}/exams`}>
            {t('common.viewAll')}
          </Link>
        }
      >
        <ResourceView state={exams} loadingLabel={t('common.loading')} compactLinking>
          {(items) =>
            items.length === 0 ? (
              <TeacherEmptyState compact icon="📋" title={t('empty.exams')} />
            ) : (
              <ul className="t-overview-list">
                {items.slice(0, 3).map((exam) => (
                  <li key={exam.id}>
                    <Link href={`/teacher/exams/${exam.id}`} className="t-overview-list__item">
                      <span>{exam.name}</span>
                      <WorkflowBadge state={exam.state} />
                    </Link>
                    {exam.exam_date && (
                      <span className="t-overview-list__sub muted">{formatDate(exam.exam_date)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </ResourceView>
      </TeacherWorkspaceCard>

      <TeacherWorkspaceCard title={t('teacher.quickActions')} icon="⚡">
        <div className="t-overview-actions">
          <TeacherQuickChip
            href={`/teacher/attendance?class=${classId}`}
            icon="🗓️"
            label={t('actions.attendance')}
          />
          <TeacherQuickChip
            href={`/teacher/classes/${classId}/homeworks`}
            icon="📝"
            label={t('actions.homework')}
          />
          <TeacherQuickChip
            href={`/teacher/classes/${classId}/resources`}
            icon="📚"
            label={t('actions.resources')}
          />
          <TeacherQuickChip
            href={`/teacher/classes/${classId}/exams`}
            icon="📋"
            label={t('actions.exams')}
          />
        </div>
      </TeacherWorkspaceCard>
    </div>
  );
}
