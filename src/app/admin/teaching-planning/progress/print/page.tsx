'use client';

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { TeachingProgressReportPrintView } from '@/features/teaching-planning/print/views/teaching-progress-print-views';
import { useT } from '@/features/i18n/locale-context';

function Inner() {
  return <TeachingProgressReportPrintView audience="admin" />;
}

export default function AdminTeachingProgressReportPrintPage() {
  const t = useT();
  return (
    <Suspense fallback={<LoadingState label={t('common.loading')} />}>
      <Inner />
    </Suspense>
  );
}
