import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { adminLandingPath } from '@/lib/admin/admin-ux';

/** Send admins to the best landing route by admin_kind + permissions. */
export default async function AdminIndexPage() {
  const user = await requireRole('admin');
  redirect(adminLandingPath(user));
}
