'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { ResourceLinkSection } from '@/components/attachments/resource-link-section';
import { TeacherResourceAttachmentsUpload } from '@/features/teacher/teacher-resource-attachments-upload';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { PageHeader, Card, DefinitionList, InfoBanner } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { canUploadResourceAttachments } from '@/lib/attachments/resource-upload';
import type { ResourceDetail } from '@/types/resource';

const FILE_TYPES = new Set(['pdf', 'image', 'document']);

function isLinkResource(r: ResourceDetail): boolean {
  return r.resource_type === 'link' || Boolean(r.url);
}

function isMetadataOnlyResource(r: ResourceDetail): boolean {
  if (isLinkResource(r)) return false;
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
            {isLinkResource(r) && canUploadResourceAttachments(r) && (
              <InfoBanner
                tone="blue"
                title={t('teacher.resourceLinkAttachmentsTitle')}
                description={t('teacher.resourceLinkAttachmentsDesc')}
              />
            )}
            {isMetadataOnlyResource(r) && canUploadResourceAttachments(r) && (
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
            <ResourceLinkSection url={r.url} urlMeta={r.url_meta} />
            {(r.attachments?.length || canUploadResourceAttachments(r)) && (
              <div className="section">
                <h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('teacher.resourceAttachments')}</h2>
                <Card>
                  {r.attachments && r.attachments.length > 0 ? (
                    <AttachmentList
                      attachments={r.attachments}
                      manageRole="teacher"
                      onChanged={() => state.reload()}
                    />
                  ) : (
                    <p className="tiny muted">{t('teacher.noAttachmentsYet')}</p>
                  )}
                  {canUploadResourceAttachments(r) && (
                    <TeacherResourceAttachmentsUpload
                      resourceId={r.id}
                      existingCount={r.attachments?.length ?? 0}
                      onUploaded={() => state.reload()}
                    />
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
