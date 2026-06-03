import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { ADMIN_NAV_BY_PERMISSION } from '@/components/navigation/nav-config';
import { hasPermission } from '@/lib/permissions/permissions';

/** Send admins to the first module they can access (not always dashboard). */
export default async function AdminIndexPage() {
  const user = await requireRole('admin');
  if (hasPermission(user, 'view_dashboard')) {
    redirect('/admin/dashboard');
  }
  const first = ADMIN_NAV_BY_PERMISSION.find((item) => hasPermission(user, item.permission));
  redirect(first?.href ?? '/admin/dashboard');
}
