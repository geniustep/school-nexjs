'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { ClassResultsPage } from '@/features/admin/class-results/components/class-results-page';
import { useT } from '@/features/i18n/locale-context';

function ClassResultsFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminClassResultsRoutePage() {
  return (
    <Suspense fallback={<ClassResultsFallback />}>
      <ClassResultsPage />
    </Suspense>
  );
}
