'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Card, DefinitionList, Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { ResourceDetail } from '@/types/resource';

interface ResourceDetailPanelProps {
  resource: ResourceDetail;
  readPath: string;
  onUpdated: () => void;
}

export function ResourceDetailPanel({
  resource,
  readPath,
  onUpdated,
}: ResourceDetailPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const toast = useToast();
  const [acting, setActing] = useState(false);

  async function markRead() {
    if (resource.is_read) return;
    setActing(true);
    const res = await api.post(readPath);
    setActing(false);
    if (res.success) {
      toast.success(t('academic.readSuccess'));
      onUpdated();
    } else {
      toast.error(res.error.message);
    }
  }

  return (
    <>
      <Card>
        <DefinitionList
          items={[
            { label: t('academic.status'), value: <WorkflowBadge state={resource.state} /> },
            { label: t('academic.type'), value: resource.resource_type?.toUpperCase() ?? t('common.dash') },
            { label: t('academic.subject'), value: resource.subject?.name ?? t('common.dash') },
            { label: t('academic.teacher'), value: resource.teacher?.name ?? t('common.dash') },
            {
              label: t('academic.publishDate'),
              value: formatDate(resource.publish_date),
            },
            {
              label: t('academic.readStatus'),
              value: resource.is_read ? (
                <Badge tone="green">{t('common.yes')}</Badge>
              ) : (
                <Badge tone="amber">{t('common.no')}</Badge>
              ),
            },
            {
              label: t('academic.externalLink'),
              value: resource.url ? (
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  {t('academic.openLink')}
                </a>
              ) : (
                t('common.dash')
              ),
            },
          ]}
        />
        {resource.description && (
          <div className="mt-2">
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>{t('academic.description')}</h3>
            <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
              {resource.description}
            </p>
          </div>
        )}
      </Card>

      {resource.attachments && resource.attachments.length > 0 && (
        <div className="section">
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('academic.attachments')}</h2>
          <Card>
            <AttachmentList attachments={resource.attachments} />
          </Card>
        </div>
      )}

      {!resource.is_read && (
        <div className="section">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={acting}
            onClick={markRead}
          >
            {t('common.markRead')}
          </button>
        </div>
      )}
    </>
  );
}
