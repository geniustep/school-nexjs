'use client';

import Link from 'next/link';
import { use } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { ChildAcademicActions } from '@/features/parent/child-academic-actions';
import { ExamListPanel } from '@/features/academic/exam-list-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function ParentChildExamsPage({
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
      <PageHeader title={t('academic.childExams')} />
      <ChildSubnav id={id} />
      <ChildAcademicActions childId={id} />
      <ExamListPanel
        allPath={endpoints.parent.childExams(id)}
        upcomingPath={endpoints.parent.childExamsUpcoming(id)}
        detailHref={(examId) => `/parent/children/${id}/exams/${examId}`}
      />
    </>
  );
}
