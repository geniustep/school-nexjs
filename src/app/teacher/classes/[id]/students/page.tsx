'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { ClassHubShell } from '@/features/teacher/class-hub-shell';
import { TeacherStudentCard } from '@/features/teacher/teacher-student-card';
import { useTeacherStudentsWithAttendance } from '@/features/teacher/use-teacher-student-detail';
import {
  TeacherContentToolbar,
  TeacherEmptyState,
  TeacherPageHeader,
} from '@/features/teacher/ui/teacher-primitives';
import { LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';

export default function ClassStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const classId = Number(id);
  const [query, setQuery] = useState('');
  const { students, attendanceByStudent, loading } = useTeacherStudentsWithAttendance(classId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => getStudentDisplayName(s).toLowerCase().includes(q));
  }, [students, query]);

  return (
    <ClassHubShell classId={classId} activeTab="students" title={t('academic.classStudents')}>
      <TeacherPageHeader
        title={t('nav.students')}
        subtitle={t('teacher.classStudentsDesc')}
        actions={
          students.length > 4 ? (
            <input
              className="input t-search"
              type="search"
              placeholder={t('teacher.searchStudents')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('teacher.searchStudents')}
            />
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : students.length === 0 ? (
        <TeacherEmptyState icon="🎓" title={t('empty.students')} description={t('empty.students')} />
      ) : filtered.length === 0 ? (
        <TeacherEmptyState
          compact
          icon="🔍"
          title={t('teacher.noStudentMatch')}
          description={t('teacher.searchStudents')}
        />
      ) : (
        <>
          <TeacherContentToolbar>
            <span className="muted t-content-count">
              {t('academic.pupilCount', { count: filtered.length })}
            </span>
            <Link className="btn btn--ghost btn--sm" href={`/teacher/attendance?class=${classId}`}>
              {t('academic.takeAttendance')}
            </Link>
          </TeacherContentToolbar>
          <div className="t-students-grid">
            {filtered.map((s) => (
              <TeacherStudentCard
                key={s.id}
                classId={classId}
                student={s}
                todayAttendance={attendanceByStudent.get(s.id)}
              />
            ))}
          </div>
        </>
      )}
    </ClassHubShell>
  );
}
