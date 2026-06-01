'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card, Badge } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { ChildAcademicActions } from '@/features/parent/child-academic-actions';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ResourceSummary } from '@/types/resource';

export default function ParentChildResourcesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const state = useResource<ResourceSummary[]>(endpoints.parent.childResources(id));

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ {t('academic.backToChild')}
      </Link>
      <PageHeader title={t('academic.childResources')} />
      <ChildSubnav id={id} />
      <ChildAcademicActions childId={id} />
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
              <Link key={r.id} href={`/parent/children/${id}/resources/${r.id}`}>
                <Card className="row-link">
                  <div className="between">
                    <strong>{r.name}</strong>
                    <WorkflowBadge state={r.state} />
                  </div>
                  <div className="row mt-2 tiny muted" style={{ gap: 12 }}>
                    {r.resource_type && <span>{r.resource_type.toUpperCase()}</span>}
                    {r.publish_date && <span>{formatDate(r.publish_date)}</span>}
                    {!r.is_read && <Badge tone="amber">{t('badges.unread')}</Badge>}
                  </div>
                  <AttachmentListIndicator item={r} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
