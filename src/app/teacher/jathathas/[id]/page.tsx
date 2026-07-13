'use client';

import { use } from 'react';
import { TeacherJathathaEditor } from '@/features/teacher/jathatha/components/teacher-jathatha-editor';

export default function TeacherJathathaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeacherJathathaEditor jathathaId={id} />;
}
