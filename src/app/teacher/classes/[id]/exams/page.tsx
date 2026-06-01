'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card } from '@/components/ui/primitives';
import { ClassActionGrid } from '@/features/teacher/class-actions';
import { TeacherExamCreateForm } from '@/features/teacher/teacher-exam-create-form';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamSummary } from '@/types/exam';

export default function ClassExamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const classId = Number(id);
  const [showCreate, setShowCreate] = useState(false);
  const state = useResource<ExamSummary[]>(endpoints.teacher.classExams(id));

  return (
    <>
      <Link href="/teacher/classes" className="back-link">
        ‹ {t('academic.backToClasses')}
      </Link>
      <PageHeader
        title={t('academic.classExams')}
        subtitle={`#${id}`}
        actions={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? t('common.cancel') : t('teacher.createExam')}
          </button>
        }
      />
      <ClassActionGrid classId={classId} />
      {showCreate && (
        <div className="section">
          <TeacherExamCreateForm
            classId={classId}
            onCancel={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              state.reload();
            }}
          />
        </div>
      )}
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState icon="📋" title={t('empty.exams')} description={t('empty.exams')} />
        }
      >
        {(items) => (
          <div className="grid grid--cards mt-2">
            {items.map((exam) => (
              <Link key={exam.id} href={`/teacher/exams/${exam.id}`}>
                <Card className="row-link">
                  <div className="between">
                    <strong>{exam.name}</strong>
                    <WorkflowBadge state={exam.state} />
                  </div>
                  <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
                    {exam.exam_type_label && <span>{exam.exam_type_label}</span>}
                    {exam.exam_date && <span>{formatDate(exam.exam_date)}</span>}
                    {exam.start_time && exam.end_time && (
                      <span>
                        {exam.start_time} – {exam.end_time}
                      </span>
                    )}
                  </div>
                  <AttachmentListIndicator item={exam} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
