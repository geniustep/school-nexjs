'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ClassHubShell } from '@/features/teacher/class-hub-shell';
import {
  TeacherContentCard,
  TeacherContentToolbar,
  TeacherEmptyState,
} from '@/features/teacher/ui/teacher-primitives';
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
  const classId = Number(id);
  const state = useResource<ExamSummary[]>(endpoints.teacher.classExams(id));

  return (
    <ClassHubShell classId={classId} activeTab="results" title={t('academic.classResults')}>
      <TeacherContentToolbar>
        <span className="muted t-content-count">
          {state.data ? t('teacher.itemCount', { count: state.data.length }) : null}
        </span>
      </TeacherContentToolbar>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <TeacherEmptyState icon="📊" title={t('empty.exams')} description={t('empty.results')} />
        }
      >
        {(items) => (
          <div className="grid grid--content-cards">
            {items.map((exam) => (
              <TeacherContentCard
                key={exam.id}
                title={exam.name}
                badge={<WorkflowBadge state={exam.state} />}
                meta={
                  <>
                    {exam.exam_date && <span>{formatDate(exam.exam_date)}</span>}
                    {exam.subject?.name && <span>{exam.subject.name}</span>}
                  </>
                }
                footer={
                  <Link
                    className="btn btn--primary btn--sm"
                    href={`/teacher/exams/${exam.id}/results`}
                  >
                    {t('academic.examResultsBtn')}
                  </Link>
                }
              />
            ))}
          </div>
        )}
      </ResourceView>
    </ClassHubShell>
  );
}
