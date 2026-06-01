'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card } from '@/components/ui/primitives';
import { ClassActionGrid } from '@/features/teacher/class-actions';
import { TeacherResourceLinkForm } from '@/features/teacher/teacher-resource-link-form';
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
    <>
      <Link href="/teacher/classes" className="back-link">
        ‹ {t('academic.backToClasses')}
      </Link>
      <PageHeader
        title={t('academic.classResources')}
        subtitle={`#${id}`}
        actions={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? t('common.cancel') : t('teacher.createResource')}
          </button>
        }
      />
      <ClassActionGrid classId={classId} />
      {showCreate && (
        <div className="section">
          <TeacherResourceLinkForm
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
          <EmptyState icon="📚" title={t('empty.resources')} description={t('empty.resources')} />
        }
      >
        {(items) => (
          <div className="grid grid--cards mt-2">
            {items.map((r) => (
              <Link key={r.id} href={`/teacher/resources/${r.id}`}>
                <Card className="row-link">
                  <div className="between">
                    <strong>{r.name}</strong>
                    <WorkflowBadge state={r.state} />
                  </div>
                  <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
                    {r.resource_type && <span>{r.resource_type.toUpperCase()}</span>}
                    {r.publish_date && (
                      <span>
                        {t('academic.publishDate')} {formatDate(r.publish_date)}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
