'use client';

import { use } from 'react';
import { ActualDeliveryPrintView } from '@/features/teaching-planning/print/views/actual-delivery-print-view';

export default function AdminActualDeliveryPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ActualDeliveryPrintView deliveryId={id} audience="admin" />;
}
