'use client';

import { Suspense, use } from 'react';
import { LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { Student360CreatePage, Student360Shell } from '@/features/admin/students/components/student-360-shell';

function Student360ShellFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  if (id === 'new') {
    return <Student360CreatePage />;
  }

  return (
    <Suspense fallback={<Student360ShellFallback />}>
      <Student360Shell studentId={id} />
    </Suspense>
  );
}
