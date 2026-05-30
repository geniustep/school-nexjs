import { requireRole } from '@/lib/auth/guards';
import { PortalLayout } from '@/components/layout/portal-layout';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('student');
  return <PortalLayout user={user}>{children}</PortalLayout>;
}
