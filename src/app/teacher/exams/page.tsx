'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
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

export default function TeacherExamsPage() {
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
      title={t('teacher.allExams')}
      subtitle={t('teacher.overviewAllClasses')}
      classesState={classesState}
      contentLoading={loading}
      contentError={loadError}
      items={items}
      emptyIcon="📋"
      emptyTitle={t('teacher.emptyExamsTitle')}
      emptyHint={t('teacher.emptyExamsHint')}
    >
      {(filtered) => (
        <div className="grid grid--content-cards">
          {filtered.map(({ item: exam, classId, className }) => (
            <TeacherContentCard
              key={exam.id}
              href={`/teacher/exams/${exam.id}`}
              title={exam.name}
              badge={<WorkflowBadge state={exam.state} />}
              meta={
                <>
                  <TeacherOverviewClassLabel classId={classId} className={className} />
                  {exam.subject?.name && <span>{exam.subject.name}</span>}
                  {exam.exam_date && <span>{formatDate(exam.exam_date)}</span>}
                  {exam.exam_type_label && <span>{exam.exam_type_label}</span>}
                </>
              }
              footer={<AttachmentListIndicator item={exam} />}
            />
          ))}
        </div>
      )}
    </TeacherOverviewLayout>
  );
}
