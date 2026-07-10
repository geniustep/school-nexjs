'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { ResourcesListPage } from '@/features/admin/resources/components/resources-list-page';
import { useT } from '@/features/i18n/locale-context';

function ResourcesListFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminResourcesPage() {
  return (
    <Suspense fallback={<ResourcesListFallback />}>
      <ResourcesListPage />
    </Suspense>
  );
}
