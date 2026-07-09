'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { ExamResultsListPage } from '@/features/admin/exam-results/components/exam-results-list-page';
import { useT } from '@/features/i18n/locale-context';

function ExamResultsListFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminExamResultsPage() {
  return (
    <Suspense fallback={<ExamResultsListFallback />}>
      <ExamResultsListPage />
    </Suspense>
  );
}
