'use client';

import { use, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ClassHubShell } from '@/features/teacher/class-hub-shell';
import { TeacherExamCreateForm } from '@/features/teacher/teacher-exam-create-form';
import {
  TeacherContentCard,
  TeacherContentToolbar,
  TeacherEmptyState,
  TeacherWorkspaceCard,
} from '@/features/teacher/ui/teacher-primitives';
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
    <ClassHubShell
      classId={classId}
      activeTab="exams"
      title={t('academic.classExams')}
      actions={
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? t('common.cancel') : t('teacher.createExam')}
        </button>
      }
    >
      {showCreate && (
        <TeacherWorkspaceCard title={t('teacher.createExam')} className="t-form-panel">
          <TeacherExamCreateForm
            classId={classId}
            onCancel={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              state.reload();
            }}
          />
        </TeacherWorkspaceCard>
      )}

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
          <TeacherEmptyState icon="📋" title={t('empty.exams')} description={t('empty.exams')} />
        }
      >
        {(items) => (
          <div className="grid grid--content-cards">
            {items.map((exam) => (
              <TeacherContentCard
                key={exam.id}
                href={`/teacher/exams/${exam.id}`}
                title={exam.name}
                badge={<WorkflowBadge state={exam.state} />}
                meta={
                  <>
                    {exam.exam_type_label && <span>{exam.exam_type_label}</span>}
                    {exam.exam_date && <span>{formatDate(exam.exam_date)}</span>}
                    {exam.start_time && exam.end_time && (
                      <span>
                        {exam.start_time} – {exam.end_time}
                      </span>
                    )}
                  </>
                }
                footer={<AttachmentListIndicator item={exam} />}
              />
            ))}
          </div>
        )}
      </ResourceView>
    </ClassHubShell>
  );
}
