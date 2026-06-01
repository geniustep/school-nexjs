'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState, LoadingState } from '@/components/states/states';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useTeacherClassAggregate } from '@/features/teacher/use-teacher-class-aggregate';
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
    <>
      <PageHeader title={t('nav.exams')} subtitle={t('teacher.navExamsDesc')} />
      <ResourceView
        state={classesState}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon="🏫"
            title={t('empty.classes')}
            action={
              <Link className="btn btn--primary btn--sm mt-2" href="/teacher/classes">
                {t('nav.myClasses')}
              </Link>
            }
          />
        }
      >
        {() => {
          if (loading) return <LoadingState label={t('common.loading')} />;
          if (loadError) {
            return (
              <EmptyState icon="!" title={t('errors.serverErrorTitle')} description={loadError} />
            );
          }
          if (items.length === 0) {
            return (
              <EmptyState
                icon="📋"
                title={t('empty.exams')}
                action={
                  <Link className="btn btn--ghost btn--sm mt-2" href="/teacher/classes">
                    {t('nav.myClasses')}
                  </Link>
                }
              />
            );
          }
          return (
            <div className="grid grid--cards">
              {items.map(({ item: exam, className }) => (
                <Link key={exam.id} href={`/teacher/exams/${exam.id}`}>
                  <Card className="row-link">
                    <div className="between">
                      <strong>{exam.name}</strong>
                      <WorkflowBadge state={exam.state} />
                    </div>
                    <p className="tiny muted mt-2">{className}</p>
                    <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
                      {exam.exam_date && <span>{formatDate(exam.exam_date)}</span>}
                      {exam.subject?.name && <span>{exam.subject.name}</span>}
                    </div>
                    <AttachmentListIndicator item={exam} />
                  </Card>
                </Link>
              ))}
            </div>
          );
        }}
      </ResourceView>
    </>
  );
}
