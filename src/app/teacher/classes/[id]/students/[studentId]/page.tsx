'use client';

import Link from 'next/link';
import { use } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Avatar, Badge } from '@/components/ui/primitives';
import { LoadingState } from '@/components/states/states';
import { ClassHubShell } from '@/features/teacher/class-hub-shell';
import { useTeacherStudentDetail } from '@/features/teacher/use-teacher-student-detail';
import {
  TeacherEmptyState,
  TeacherQuickChip,
  TeacherWorkspaceCard,
} from '@/features/teacher/ui/teacher-primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { AttendanceStatus } from '@/types/attendance';

const ATTENDANCE_CHIP: Record<AttendanceStatus, string> = {
  present: 't-attendance-pill--present',
  absent: 't-attendance-pill--absent',
  late: 't-attendance-pill--late',
  left_early: 't-attendance-pill--left-early',
};

function statusText(t: ReturnType<typeof useT>, status: string | undefined) {
  if (!status) return t('common.dash');
  const key = `states.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function attendanceLabel(t: ReturnType<typeof useT>, status: AttendanceStatus): string {
  const key = status === 'left_early' ? 'leftEarly' : status;
  return t(`attendance.${key}`);
}

export default function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId: studentIdStr } = use(params);
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const classId = Number(id);
  const studentId = Number(studentIdStr);

  const { student, displayName, todayAttendance, submissions, examResults, loading, notFound } =
    useTeacherStudentDetail(classId, studentId);

  if (loading && !student) {
    return (
      <ClassHubShell classId={classId} activeTab="students">
        <LoadingState label={t('common.loading')} />
      </ClassHubShell>
    );
  }

  if (notFound || !student || !displayName) {
    return (
      <ClassHubShell classId={classId} activeTab="students">
        <TeacherEmptyState
          icon="🎓"
          title={t('teacher.studentNotFound')}
          description={t('teacher.studentNotFoundHint')}
        />
        <Link href={`/teacher/classes/${classId}/students`} className="btn btn--primary btn--sm mt-2">
          {t('teacher.backToStudents')}
        </Link>
      </ClassHubShell>
    );
  }

  return (
    <ClassHubShell classId={classId} activeTab="students" title={displayName}>
      <Link href={`/teacher/classes/${classId}/students`} className="class-hub__back">
        ‹ {t('teacher.backToStudents')}
      </Link>

      <header className="t-student-hero">
        <div className="t-student-hero__pattern" aria-hidden="true" />
        <div className="t-student-hero__main">
          <div className="t-student-hero__avatar">
            <Avatar name={displayName} />
          </div>
          <div className="t-student-hero__info">
            <h1>{displayName}</h1>
            <div className="t-student-hero__meta">
              {student.code && <span className="mono t-student-hero__code">{student.code}</span>}
              {student.status && (
                <Badge tone={student.status === 'active' ? 'green' : 'slate'}>
                  {statusText(t, student.status)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {todayAttendance && (
          <div
            className={`t-attendance-pill ${ATTENDANCE_CHIP[todayAttendance.status]}`}
          >
            <span className="t-attendance-pill__label">{t('teacher.todayAttendance')}</span>
            <strong>{attendanceLabel(t, todayAttendance.status)}</strong>
            {!todayAttendance.recorded && (
              <span className="t-attendance-pill__hint">{t('teacher.notRecordedYet')}</span>
            )}
          </div>
        )}
      </header>

      <div className="t-student-actions">
        <TeacherQuickChip
          href={`/teacher/attendance?class=${classId}`}
          icon="🗓️"
          label={t('academic.takeAttendance')}
        />
        <TeacherQuickChip
          href={`/teacher/classes/${classId}`}
          icon="🏫"
          label={t('teacher.openClassHub')}
        />
      </div>

      <div className="t-student-panels">
        <TeacherWorkspaceCard title={t('teacher.todayAttendance')} icon="🗓️">
          {todayAttendance ? (
            <div className="t-student-attendance-detail">
              <div className={`t-attendance-pill ${ATTENDANCE_CHIP[todayAttendance.status]}`}>
                <strong>{attendanceLabel(t, todayAttendance.status)}</strong>
              </div>
              {todayAttendance.note && (
                <p className="t-student-note">
                  <span className="muted">{t('attendance.note')}:</span> {todayAttendance.note}
                </p>
              )}
              {!todayAttendance.recorded && (
                <p className="muted t-student-hint">{t('teacher.attendancePendingHint')}</p>
              )}
            </div>
          ) : (
            <p className="muted">{t('teacher.noAttendanceToday')}</p>
          )}
        </TeacherWorkspaceCard>

        <TeacherWorkspaceCard title={t('teacher.recentSubmissions')} icon="📥">
          {submissions.length === 0 ? (
            <TeacherEmptyState compact icon="📥" title={t('teacher.noSubmissionsYet')} />
          ) : (
            <ul className="t-student-activity">
              {submissions.map(({ homework, submission }) => (
                <li key={submission.id} className="t-student-activity__item">
                  <Link href={`/teacher/homeworks/${homework.id}/submissions`} className="t-student-activity__link">
                    <div className="t-student-activity__head">
                      <strong>{homework.name}</strong>
                      <WorkflowBadge state={submission.state} />
                    </div>
                    <div className="t-student-activity__meta muted">
                      {homework.subject?.name && <span>{homework.subject.name}</span>}
                      {submission.submission_date && (
                        <span>{formatDateTime(submission.submission_date)}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TeacherWorkspaceCard>

        <TeacherWorkspaceCard title={t('teacher.recentResults')} icon="📊">
          {examResults.length === 0 ? (
            <TeacherEmptyState compact icon="📊" title={t('teacher.noResultsYet')} />
          ) : (
            <ul className="t-student-activity">
              {examResults.map((result) => (
                <li key={result.id} className="t-student-activity__item">
                  <Link
                    href={`/teacher/exams/${result.exam.id}/results`}
                    className="t-student-activity__link"
                  >
                    <div className="t-student-activity__head">
                      <strong>{result.exam.name}</strong>
                      <WorkflowBadge state={result.state} />
                    </div>
                    <div className="t-student-activity__meta muted">
                      {result.subject?.name && <span>{result.subject.name}</span>}
                      {result.exam.exam_date && <span>{formatDate(result.exam.exam_date)}</span>}
                      <span className="t-student-score">
                        {result.score}/{result.max_score}
                        {result.grade_label && ` · ${result.grade_label}`}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TeacherWorkspaceCard>
      </div>
    </ClassHubShell>
  );
}
