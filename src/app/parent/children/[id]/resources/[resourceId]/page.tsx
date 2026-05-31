'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { ResourceDetailPanel } from '@/features/academic/resource-detail-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ResourceDetail } from '@/types/resource';

export default function ParentChildResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string; resourceId: string }>;
}) {
  const { id, resourceId } = use(params);
  const t = useT();
  const state = useResource<ResourceDetail>(
    endpoints.parent.childResource(id, resourceId),
  );

  return (
    <>
      <Link href={`/parent/children/${id}/resources`} className="back-link">
        ‹ {t('academic.backToResources')}
      </Link>
      <ChildSubnav id={id} />
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(resource) => (
          <>
            <PageHeader title={resource.name} />
            <ResourceDetailPanel
              resource={resource}
              readPath={endpoints.parent.childResourceRead(id, resourceId)}
              onUpdated={() => state.reload()}
            />
          </>
        )}
      </ResourceView>
    </>
  );
}
