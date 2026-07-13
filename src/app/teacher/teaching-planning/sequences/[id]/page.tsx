'use client';

import { use } from 'react';
import { TeacherDidacticSequenceDetail } from '@/features/teacher/teaching-planning/teacher-didactic-sequence-detail';

export default function TeacherDidacticSequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TeacherDidacticSequenceDetail id={id} />;
}
