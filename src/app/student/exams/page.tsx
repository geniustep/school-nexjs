'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { ExamListPanel } from '@/features/academic/exam-list-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function StudentExamsPage() {
  const t = useT();

  return (
    <>
      <Link href="/student/dashboard" className="back-link">
        ‹ {t('academic.backToDashboard')}
      </Link>
      <PageHeader title={t('dashboard.myExams')} />
      <ExamListPanel
        allPath={endpoints.student.exams}
        upcomingPath={endpoints.student.examsUpcoming}
        detailHref={(examId) => `/student/exams/${examId}`}
      />
    </>
  );
}
