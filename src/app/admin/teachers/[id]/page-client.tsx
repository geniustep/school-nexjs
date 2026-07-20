'use client';

import { use } from 'react';
import { TeacherProfilePage } from '@/features/admin/teachers/components/teacher-profile-page';

export default function AdminTeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeacherProfilePage id={id} />;
}
