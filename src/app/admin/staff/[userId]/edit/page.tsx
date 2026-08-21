import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import {
  isViewingOwnStaffUserId,
  shouldUseTeacherWorkspace,
  teacherProfilePath,
} from '@/lib/auth/teacher-workspace';
import { StaffEditPage } from '@/features/admin/staff/components/staff-edit-page';
import styles from './page.module.css';

export default async function AdminStaffEditPage({
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

  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return (
    <div className={styles.refined}>
      <StaffEditPage userId={parsed} />
    </div>
  );
}
