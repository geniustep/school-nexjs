import { requireRole } from '@/lib/auth/guards';
import { PortalLayout } from '@/components/layout/portal-layout';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin');
  return <PortalLayout user={user}>{children}</PortalLayout>;
}
