'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { ExamsListPage } from '@/features/admin/exams/components/exams-list-page';
import { useT } from '@/features/i18n/locale-context';

function ExamsListFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminExamsPage() {
  return (
    <Suspense fallback={<ExamsListFallback />}>
      <ExamsListPage />
    </Suspense>
  );
}
