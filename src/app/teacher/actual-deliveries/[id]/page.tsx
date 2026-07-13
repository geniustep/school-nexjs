'use client';

import { use } from 'react';
import { TeacherDeliveryEditor } from '@/features/teacher/delivery/components/teacher-delivery-editor';

export default function TeacherActualDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeacherDeliveryEditor deliveryId={id} />;
}
