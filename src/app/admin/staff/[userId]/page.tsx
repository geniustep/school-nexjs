import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import {
  isViewingOwnStaffUserId,
  shouldUseTeacherWorkspace,
  teacherProfilePath,
} from '@/lib/auth/teacher-workspace';
import { StaffDetailRoutePage } from '@/features/admin/staff/components/staff-detail-page';

export default async function AdminStaffDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const user = await getCurrentUser();
  const { userId } = await params;
  const parsed = Number(userId);

  if (
    user &&
    shouldUseTeacherWorkspace(user) &&
    Number.isFinite(parsed) &&
    isViewingOwnStaffUserId(user, parsed)
  ) {
    redirect(teacherProfilePath(user));
  }

  return <StaffDetailRoutePage params={params} />;
}
