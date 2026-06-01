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
import { TeacherHomeworkCreateForm } from '@/features/teacher/teacher-homework-create-form';
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
    <>
      <Link href="/teacher/classes" className="back-link">
        ‹ {t('academic.backToClasses')}
      </Link>
      <PageHeader
        title={t('academic.classHomework')}
        subtitle={`#${id}`}
        actions={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? t('common.cancel') : t('teacher.createHomework')}
          </button>
        }
      />
      <ClassActionGrid classId={classId} />
      {showCreate && (
        <div className="section">
          <TeacherHomeworkCreateForm
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
          <EmptyState icon="📝" title={t('empty.homework')} description={t('empty.homework')} />
        }
      >
        {(items) => (
          <div className="grid grid--cards mt-2">
            {items.map((hw) => (
              <Link key={hw.id} href={`/teacher/homeworks/${hw.id}`}>
                <Card className="row-link">
                  <div className="between">
                    <strong>{hw.name}</strong>
                    <WorkflowBadge state={hw.state} />
                  </div>
                  <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
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
                  </div>
                  <AttachmentListIndicator item={hw} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
