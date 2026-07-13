'use client';

import { use } from 'react';
import { TeachingProgressDetailPrintView } from '@/features/teaching-planning/print/views/teaching-progress-print-views';

export default function AdminTeachingProgressDetailPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TeachingProgressDetailPrintView lineId={id} audience="admin" />;
}
