import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import {
  resolveTeacherId,
  shouldUseTeacherWorkspace,
  teacherProfilePath,
} from '@/lib/auth/teacher-workspace';
import AdminTeacherDetailPage from './page-client';

export default async function AdminTeacherDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  const parsed = Number(id);

  if (
    user &&
    shouldUseTeacherWorkspace(user) &&
    Number.isFinite(parsed) &&
    resolveTeacherId(user) === parsed
  ) {
    redirect(teacherProfilePath(user));
  }

  return <AdminTeacherDetailPage params={params} />;
}
