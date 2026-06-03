'use client';

import { use, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ClassHubShell } from '@/features/teacher/class-hub-shell';
import { TeacherHomeworkCreateForm } from '@/features/teacher/teacher-homework-create-form';
import {
  TeacherContentCard,
  TeacherContentToolbar,
  TeacherEmptyState,
  TeacherWorkspaceCard,
} from '@/features/teacher/ui/teacher-primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { HomeworkSummary } from '@/types/homework';

export default function ClassHomeworksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const classId = Number(id);
  const [showCreate, setShowCreate] = useState(false);
  const state = useResource<HomeworkSummary[]>(endpoints.teacher.classHomeworks(id));

  return (
    <ClassHubShell
      classId={classId}
      activeTab="homeworks"
      title={t('academic.classHomework')}
      actions={
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? t('common.cancel') : t('teacher.createHomework')}
        </button>
      }
    >
      {showCreate && (
        <TeacherWorkspaceCard title={t('teacher.createHomework')} className="t-form-panel">
          <TeacherHomeworkCreateForm
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
          <TeacherEmptyState icon="📝" title={t('empty.homework')} description={t('empty.homework')} />
        }
      >
        {(items) => (
          <div className="grid grid--content-cards">
            {items.map((hw) => (
              <TeacherContentCard
                key={hw.id}
                href={`/teacher/homeworks/${hw.id}`}
                title={hw.name}
                badge={<WorkflowBadge state={hw.state} />}
                meta={
                  <>
                    {hw.subject?.name && <span>{hw.subject.name}</span>}
                    {hw.publish_date && (
                      <span>
                        {t('academic.publishDate')} {formatDate(hw.publish_date)}
                      </span>
                    )}
                    {hw.deadline && (
                      <span>
                        {t('academic.deadline')} {formatDate(hw.deadline)}
                      </span>
                    )}
                  </>
                }
                footer={<AttachmentListIndicator item={hw} />}
              />
            ))}
          </div>
        )}
      </ResourceView>
    </ClassHubShell>
  );
}
