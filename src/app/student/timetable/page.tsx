'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { TimetableView } from '@/features/timetable/timetable-view';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function StudentTimetablePage() {
  const t = useT();

  return (
    <>
      <Link href="/student/dashboard" className="back-link">
        ‹ {t('academic.backToDashboard')}
      </Link>
      <PageHeader title={t('timetable.title')} subtitle={t('timetable.subtitleStudent')} />
      <TimetableView
        todayPath={endpoints.student.timetableToday}
        weekPath={endpoints.student.timetableWeek}
        showTeacher
      />
    </>
  );
}
