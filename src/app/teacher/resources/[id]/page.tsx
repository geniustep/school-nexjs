'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { PageHeader, Card, DefinitionList, InfoBanner } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ResourceDetail } from '@/types/resource';

const FILE_TYPES = new Set(['pdf', 'image', 'document']);

function isMetadataOnlyResource(r: ResourceDetail): boolean {
  if (r.resource_type === 'link' || r.url) return false;
  if (!r.resource_type || !FILE_TYPES.has(r.resource_type)) return false;
  return !r.attachments?.length && !(r.attachment_count && r.attachment_count > 0);
}

export default function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const state = useResource<ResourceDetail>(endpoints.teacher.resource(id));

  return (
    <>
      <Link
        href={
          state.data?.class?.id
            ? `/teacher/classes/${state.data.class.id}/resources`
            : '/teacher/classes'
        }
        className="back-link"
      >
        ‹ {t('academic.backToResources')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(r) => (
          <>
            <PageHeader
              title={r.name}
              subtitle={r.class?.name}
              actions={
                r.state === 'draft' ? (
                  <ConfirmActionButton
                    label={t('teacher.publishResource')}
                    confirmMessage={t('teacher.confirmPublishResource')}
                    path={endpoints.teacher.resourcePublish(id)}
                    variant="primary"
                    onSuccess={() => state.reload()}
                  />
                ) : undefined
              }
            />
            {isMetadataOnlyResource(r) && (
              <InfoBanner
                tone="amber"
                title={t('teacher.resourceMetadataOnlyTitle')}
                description={t('teacher.resourceMetadataOnlyDesc')}
              />
            )}
            <Card>
              <DefinitionList
                items={[
                  { label: t('academic.status'), value: <WorkflowBadge state={r.state} /> },
                  { label: t('academic.type'), value: r.resource_type?.toUpperCase() },
                  { label: t('academic.subject'), value: r.subject?.name ?? t('common.dash') },
                  { label: t('academic.publishDate'), value: formatDate(r.publish_date) },
                  {
                    label: t('academic.externalLink'),
                    value: r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        {t('academic.openLink')}
                      </a>
                    ) : (
                      t('common.dash')
                    ),
                  },
                ]}
              />
              {r.description && (
                <div className="mt-2">
                  <h3 style={{ fontSize: 14, marginBottom: 6 }}>{t('academic.description')}</h3>
                  <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                    {r.description}
                  </p>
                </div>
              )}
            </Card>
            {r.attachments && r.attachments.length > 0 && (
              <div className="section">
                <h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('academic.attachments')}</h2>
                <Card>
                  <AttachmentList attachments={r.attachments} />
                </Card>
              </div>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
