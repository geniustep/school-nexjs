'use client';

import { use } from 'react';
import { TeacherTeachingProgressDetail } from '@/features/teacher/delivery/components/teacher-teaching-progress-detail';

export default function TeacherTeachingProgressLinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeacherTeachingProgressDetail lineId={id} />;
}
