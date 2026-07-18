'use client';

import { use } from 'react';
import { AdminCommunicationDetailPage } from '@/features/admin/communication/components/admin-communication-detail-page';

export default function AdminCommunicationContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  return <AdminCommunicationDetailPage id={Number.isFinite(numericId) ? numericId : 0} />;
}
