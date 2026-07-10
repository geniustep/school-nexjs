'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { HomeworksListPage } from '@/features/admin/homeworks/components/homeworks-list-page';
import { useT } from '@/features/i18n/locale-context';

function HomeworksListFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminHomeworksPage() {
  return (
    <Suspense fallback={<HomeworksListFallback />}>
      <HomeworksListPage />
    </Suspense>
  );
}
