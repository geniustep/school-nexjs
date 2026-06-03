import { requireRole } from '@/lib/auth/guards';
import { PortalLayout } from '@/components/layout/portal-layout';
import { AdminPageGuard } from '@/components/admin/admin-page-guard';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin');
  return (
    <PortalLayout user={user}>
      <AdminPageGuard>{children}</AdminPageGuard>
    </PortalLayout>
  );
}
