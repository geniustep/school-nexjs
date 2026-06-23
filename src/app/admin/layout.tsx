import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guards';
import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';
import { homeForUser } from '@/lib/routes/role-routes';
import { PortalLayout } from '@/components/layout/portal-layout';
import { AdminPageGuard } from '@/components/admin/admin-page-guard';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (shouldUseTeacherWorkspace(user)) redirect(homeForUser(user));
  if (user.role !== 'admin') redirect(homeForUser(user));
  return (
    <PortalLayout user={user}>
      <AdminPageGuard>{children}</AdminPageGuard>
    </PortalLayout>
  );
}
