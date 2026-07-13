'use client';

import { use } from 'react';
import { TeacherAnnualDistributionDetail } from '@/features/teacher/teaching-planning/teacher-annual-distribution-detail';

export default function TeacherAnnualDistributionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TeacherAnnualDistributionDetail id={id} />;
}
