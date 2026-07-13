'use client';

import { use } from 'react';
import { AnnualDistributionPrintView } from '@/features/teaching-planning/print/views/annual-distribution-print-view';

export default function TeacherAnnualDistributionPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AnnualDistributionPrintView distributionId={id} audience="teacher" />;
}
