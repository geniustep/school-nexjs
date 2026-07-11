'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { GradebooksListPage } from '@/features/admin/gradebooks/components/gradebooks-list-page';
import { useT } from '@/features/i18n/locale-context';

function GradebooksListFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminGradebooksPage() {
  return (
    <Suspense fallback={<GradebooksListFallback />}>
      <GradebooksListPage />
    </Suspense>
  );
}
