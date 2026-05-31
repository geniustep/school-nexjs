'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { ExamDetailPanel } from '@/features/academic/exam-detail-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamDetail } from '@/types/exam';

export default function ParentChildExamDetailPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id, examId } = use(params);
  const t = useT();
  const state = useResource<ExamDetail>(endpoints.parent.childExam(id, examId));

  return (
    <>
      <Link href={`/parent/children/${id}/exams`} className="back-link">
        ‹ {t('academic.backToExams')}
      </Link>
      <ChildSubnav id={id} />
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
