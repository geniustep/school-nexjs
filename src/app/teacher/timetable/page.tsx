'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { InfoBanner } from '@/components/ui/primitives';
import { TimetableView } from '@/features/timetable/timetable-view';
import { TeacherWeekSessions } from '@/features/teacher/jathatha/components/teacher-week-sessions';
import { TeacherAssignmentScopePanel } from '@/features/teacher/academic-context/teacher-assignment-scope-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function TeacherTimetablePage() {
  const t = useT();

  return (
    <>
      <Link href="/teacher/dashboard" className="back-link">
        ‹ {t('academic.backToDashboard')}
      </Link>
      <PageHeader title={t('timetable.title')} subtitle={t('timetable.subtitleTeacher')} />
      <TeacherAssignmentScopePanel scope="timetable" />
      <TimetableView
        todayPath={endpoints.teacher.timetableToday}
        weekPath={endpoints.teacher.timetableWeek}
        showTeacher={false}
      />
      <div className="mt-3">
        <InfoBanner
          tone="blue"
          title={t('teacher.jathatha.weeklySlotPreview')}
          description={t('teacher.jathatha.weeklySlotPreviewDescription')}
        />
        <TeacherWeekSessions />
      </div>
    </>
  );
}
