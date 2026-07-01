'use client';

import { Suspense, use } from 'react';
import { LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { StudentEditShell } from '@/features/admin/students/components/student-edit-shell';

function StudentEditFallback() {
  const t = useT();
  return <LoadingState label={t('common.loading')} />;
}

export default function AdminStudentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense fallback={<StudentEditFallback />}>
      <StudentEditShell studentId={id} />
    </Suspense>
  );
}
