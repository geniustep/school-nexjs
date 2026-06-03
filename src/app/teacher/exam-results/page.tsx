'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useTeacherClassAggregate } from '@/features/teacher/use-teacher-class-aggregate';
import {
  TeacherOverviewClassLabel,
  TeacherOverviewLayout,
} from '@/features/teacher/teacher-global-overview';
import { TeacherContentCard } from '@/features/teacher/ui/teacher-primitives';
import type { SchoolClass } from '@/types/class';
import type { ExamSummary } from '@/types/exam';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

export default function TeacherExamResultsPage() {
  const t = useT();
  const { formatDate } = useFormat();
  const classesState = useResource<TeacherClass[]>(endpoints.teacher.classes);
  const { items, loading, loadError } = useTeacherClassAggregate<ExamSummary>(
    classesState.data,
    (classId) => endpoints.teacher.classExams(classId),
    t('errors.network'),
  );

  return (
    <TeacherOverviewLayout
      title={t('teacher.allResults')}
      subtitle={t('teacher.overviewAllClasses')}
      classesState={classesState}
      contentLoading={loading}
      contentError={loadError}
      items={items}
      emptyIcon="📊"
      emptyTitle={t('teacher.emptyResultsTitle')}
      emptyHint={t('teacher.emptyResultsHint')}
      showCreateLink={false}
    >
      {(filtered) => (
        <div className="grid grid--content-cards">
          {filtered.map(({ item: exam, classId, className }) => (
            <TeacherContentCard
              key={exam.id}
              title={exam.name}
              badge={<WorkflowBadge state={exam.state} />}
              meta={
                <>
                  <TeacherOverviewClassLabel classId={classId} className={className} />
                  {exam.subject?.name && <span>{exam.subject.name}</span>}
                  {exam.exam_date && <span>{formatDate(exam.exam_date)}</span>}
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
    </TeacherOverviewLayout>
  );
}
