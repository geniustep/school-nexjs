'use client';

import { use } from 'react';
import { TeacherJathathaPrintView } from '@/features/teaching-planning/print/views/teacher-jathatha-print-view';

export default function AdminTeacherJathathaPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TeacherJathathaPrintView jathathaId={id} audience="admin" />;
}
