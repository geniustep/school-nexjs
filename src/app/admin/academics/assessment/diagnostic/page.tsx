'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { DiagnosticAssessmentListPage } from '@/features/admin/diagnostic-assessment/components/diagnostic-assessment-list-page';
import { useT } from '@/features/i18n/locale-context';

function Fallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminDiagnosticAssessmentPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <DiagnosticAssessmentListPage />
    </Suspense>
  );
}
