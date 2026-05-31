'use client';

import Link from 'next/link';
import { use } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { ChildAcademicActions } from '@/features/parent/child-academic-actions';
import { TimetableView } from '@/features/timetable/timetable-view';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function ParentChildTimetablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ {t('academic.backToChild')}
      </Link>
      <PageHeader title={t('timetable.title')} subtitle={t('timetable.subtitleParent')} />
      <ChildSubnav id={id} />
      <ChildAcademicActions childId={id} />
      <TimetableView
        todayPath={endpoints.parent.childTimetableToday(id)}
        weekPath={endpoints.parent.childTimetableWeek(id)}
        showTeacher
      />
    </>
  );
}
