'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { ResourceDetailPanel } from '@/features/academic/resource-detail-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ResourceDetail } from '@/types/resource';

export default function StudentResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<ResourceDetail>(endpoints.student.resource(id));

  return (
    <>
      <Link href="/student/resources" className="back-link">
        ‹ {t('academic.backToResources')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(resource) => (
          <>
            <PageHeader title={resource.name} />
            <ResourceDetailPanel
              resource={resource}
              readPath={endpoints.student.resourceRead(id)}
              onUpdated={() => state.reload()}
            />
          </>
        )}
      </ResourceView>
    </>
  );
}
