'use client';

import { Suspense, use } from 'react';
import { TeacherProfilePage } from '@/features/admin/teachers/components/teacher-profile-page';
import { LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/teachers/teacher-profile-refresh.css';

function TeacherProfilePageBoot({ id }: { id: string }) {
  return <TeacherProfilePage id={id} />;
}

export default function AdminTeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  return (
    <Suspense fallback={<LoadingState label={t('common.loading')} />}>
      <TeacherProfilePageBoot id={id} />
    </Suspense>
  );
}
