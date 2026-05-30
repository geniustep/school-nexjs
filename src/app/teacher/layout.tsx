import { requireRole } from '@/lib/auth/guards';
import { PortalLayout } from '@/components/layout/portal-layout';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('teacher');
  return <PortalLayout user={user}>{children}</PortalLayout>;
}
