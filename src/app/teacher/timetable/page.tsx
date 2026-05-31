'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { TimetableView } from '@/features/timetable/timetable-view';
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
      <TimetableView
        todayPath={endpoints.teacher.timetableToday}
        weekPath={endpoints.teacher.timetableWeek}
        showTeacher={false}
      />
    </>
  );
}
