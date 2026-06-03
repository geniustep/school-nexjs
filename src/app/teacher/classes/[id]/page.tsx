'use client';

import Link from 'next/link';
import { use, useMemo } from 'react';
import { ClassHubShell } from '@/features/teacher/class-hub-shell';
import { ClassOverview } from '@/features/teacher/class-overview';
import { TeacherStudentCard } from '@/features/teacher/teacher-student-card';
import { useTeacherStudentsWithAttendance } from '@/features/teacher/use-teacher-student-detail';
import {
  TeacherEmptyState,
  TeacherSection,
} from '@/features/teacher/ui/teacher-primitives';
import { LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';

export default function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const classId = Number(id);
  const { students, attendanceByStudent, loading } = useTeacherStudentsWithAttendance(classId);
  const preview = useMemo(() => students.slice(0, 4), [students]);

  return (
    <ClassHubShell classId={classId} activeTab="overview">
      <ClassOverview classId={classId} />

      <TeacherSection
        title={t('nav.students')}
        action={
          students.length > 0 ? (
            <Link className="btn btn--ghost btn--sm" href={`/teacher/classes/${classId}/students`}>
              {t('common.viewAll')}
            </Link>
          ) : undefined
        }
      >
        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : students.length === 0 ? (
          <TeacherEmptyState
            compact
            icon="🎓"
            title={t('empty.students')}
            description={t('empty.students')}
          />
        ) : (
          <div className="t-students-grid t-students-grid--preview">
            {preview.map((s) => (
              <TeacherStudentCard
                key={s.id}
                classId={classId}
                student={s}
                todayAttendance={attendanceByStudent.get(s.id)}
              />
            ))}
          </div>
        )}
      </TeacherSection>
    </ClassHubShell>
  );
}
