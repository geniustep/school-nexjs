'use client';

import { Suspense } from 'react';
import { LoadingState } from '@/components/states/states';
import { AdminCommunicationReviewPage } from '@/features/admin/communication/components/admin-communication-review-page';
import { useT } from '@/features/i18n/locale-context';

export default function AdminCommunicationPage() {
  const t = useT();
  return (
    <Suspense fallback={<LoadingState label={t('communication.loading')} />}>
      <AdminCommunicationReviewPage />
    </Suspense>
  );
}
