'use client';

import { use } from 'react';
import { TeachingAssignmentDetailPage } from '@/features/admin/teachers/components/teaching-assignment-detail-page';

export default function AdminTeachingAssignmentDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TeachingAssignmentDetailPage id={id} />;
}
