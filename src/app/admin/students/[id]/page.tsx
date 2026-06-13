'use client';

import { use } from 'react';
import { Student360CreatePage, Student360Shell } from '@/features/admin/students/components/student-360-shell';

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  if (id === 'new') {
    return <Student360CreatePage />;
  }

  return <Student360Shell studentId={id} />;
}
