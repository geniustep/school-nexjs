'use client';

import { use } from 'react';
import { TeacherSessionHub } from '@/features/teacher/jathatha/components/teacher-session-hub';

export default function TeacherSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeacherSessionHub occurrenceId={id} />;
}
