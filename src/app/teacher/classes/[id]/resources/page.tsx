'use client';

import { use, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ClassHubShell } from '@/features/teacher/class-hub-shell';
import { TeacherResourceLinkForm } from '@/features/teacher/teacher-resource-link-form';
import {
  TeacherContentCard,
  TeacherContentToolbar,
  TeacherEmptyState,
  TeacherWorkspaceCard,
} from '@/features/teacher/ui/teacher-primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ResourceSummary } from '@/types/resource';

export default function ClassResourcesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const classId = Number(id);
  const [showCreate, setShowCreate] = useState(false);
  const state = useResource<ResourceSummary[]>(endpoints.teacher.classResources(id));

  return (
    <ClassHubShell
      classId={classId}
      activeTab="resources"
      title={t('academic.classResources')}
      actions={
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? t('common.cancel') : t('teacher.createResource')}
        </button>
      }
    >
      {showCreate && (
        <TeacherWorkspaceCard title={t('teacher.createResource')} className="t-form-panel">
          <TeacherResourceLinkForm
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
          <TeacherEmptyState icon="📚" title={t('empty.resources')} description={t('empty.resources')} />
        }
      >
        {(items) => (
          <div className="grid grid--content-cards">
            {items.map((r) => (
              <TeacherContentCard
                key={r.id}
                href={`/teacher/resources/${r.id}`}
                title={r.name}
                badge={<WorkflowBadge state={r.state} />}
                meta={
                  <>
                    {r.resource_type && <span>{r.resource_type.toUpperCase()}</span>}
                    {r.publish_date && (
                      <span>
                        {t('academic.publishDate')} {formatDate(r.publish_date)}
                      </span>
                    )}
                  </>
                }
                footer={<AttachmentListIndicator item={r} />}
              />
            ))}
          </div>
        )}
      </ResourceView>
    </ClassHubShell>
  );
}
