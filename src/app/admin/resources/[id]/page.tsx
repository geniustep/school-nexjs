'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceWorkflowActions } from '@/features/admin/admin-workflow-actions';
import { ResourceForm } from '@/features/admin/academic-forms';
import { PageHeader, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ResourceDetail } from '@/types/resource';

export default function AdminResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useResource<ResourceDetail>(isNew ? null : endpoints.admin.resource(id));

  if (isNew) {
    return (
      <>
        <Link href="/admin/resources" className="back-link">‹ {t('academic.backToResources')}</Link>
        <PageHeader title={t('admin.addResource')} />
        <ResourceForm onSaved={(rid) => router.push(`/admin/resources/${rid}`)} onCancel={() => router.push('/admin/resources')} />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/resources" className="back-link">‹ {t('academic.backToResources')}</Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(resource) => (
          <>
            <PageHeader
              title={resource.name}
              subtitle={resource.class?.name}
              actions={
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <ResourceWorkflowActions id={resource.id} state={resource.state} onUpdated={() => state.reload()} />
                  {resource.state !== 'archived' && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing((v) => !v)}>
                      {editing ? t('common.cancel') : t('common.edit')}
                    </button>
                  )}
                </div>
              }
            />
            {editing ? (
              <ResourceForm resource={resource} onSaved={() => { setEditing(false); state.reload(); }} onCancel={() => setEditing(false)} />
            ) : (
              <>
                <Card>
                  <DefinitionList
                    items={[
                      { label: t('academic.status'), value: <WorkflowBadge state={resource.state} /> },
                      { label: t('academic.type'), value: resource.resource_type?.toUpperCase() ?? t('common.dash') },
                      { label: t('nav.classes'), value: resource.class?.name ?? t('common.dash') },
                      { label: t('academic.subject'), value: resource.subject?.name ?? t('common.dash') },
                      { label: t('academic.teacher'), value: resource.teacher?.name ?? t('common.dash') },
                      { label: t('academic.publishDate'), value: resource.publish_date ? formatDate(resource.publish_date) : t('common.dash') },
                      {
                        label: t('academic.externalLink'),
                        value: resource.url ? (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">{t('academic.openLink')}</a>
                        ) : t('common.dash'),
                      },
                    ]}
                  />
                </Card>
                {resource.attachments && resource.attachments.length > 0 && (
                  <div className="section">
                    <SectionHead title={t('academic.attachments')} />
                    <Card><AttachmentList attachments={resource.attachments} /></Card>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
