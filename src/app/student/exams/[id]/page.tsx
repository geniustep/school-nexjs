'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { ExamDetailPanel } from '@/features/academic/exam-detail-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamDetail } from '@/types/exam';

export default function StudentExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<ExamDetail>(endpoints.student.exam(id));

  return (
    <>
      <Link href="/student/exams" className="back-link">
        ‹ {t('academic.backToExams')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(exam) => (
          <>
            <PageHeader title={exam.name} subtitle={exam.subject?.name ?? undefined} />
            <ExamDetailPanel exam={exam} />
          </>
        )}
      </ResourceView>
    </>
  );
}
