'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card } from '@/components/ui/primitives';
import { ClassActionGrid } from '@/features/teacher/class-actions';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamSummary } from '@/types/exam';

export default function ClassExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const state = useResource<ExamSummary[]>(endpoints.teacher.classExams(id));

  return (
    <>
      <Link href="/teacher/classes" className="back-link">
        ‹ {t('academic.backToClasses')}
      </Link>
      <PageHeader title={t('academic.classResults')} subtitle={`#${id}`} />
      <ClassActionGrid classId={Number(id)} />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState icon="📊" title={t('empty.exams')} description={t('empty.results')} />
        }
      >
        {(items) => (
          <div className="grid grid--cards mt-2">
            {items.map((exam) => (
              <Card key={exam.id}>
                <div className="between">
                  <strong>{exam.name}</strong>
                  <WorkflowBadge state={exam.state} />
                </div>
                <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
                  {exam.exam_date && <span>{formatDate(exam.exam_date)}</span>}
                  {exam.subject?.name && <span>{exam.subject.name}</span>}
                </div>
                <div className="mt-2">
                  <Link
                    className="btn btn--primary btn--sm"
                    href={`/teacher/exams/${exam.id}/results`}
                  >
                    {t('academic.examResultsBtn')}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
