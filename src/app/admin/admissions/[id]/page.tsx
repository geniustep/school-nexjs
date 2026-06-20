'use client';

import { Suspense, use } from 'react';
import { LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { AdmissionDetailShell } from '@/features/admin/admissions/components/admission-detail-shell';

function AdmissionDetailFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminAdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense fallback={<AdmissionDetailFallback />}>
      <AdmissionDetailShell admissionId={id} />
    </Suspense>
  );
}
