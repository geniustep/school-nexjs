import { requireAdminAccess } from '@/lib/auth/require-admin-permission';
import { canAccessStaffCenter } from '@/lib/permissions/academic-setup';

/** Server gate for staff center — before staff detail/list client fetch. */
export default async function AdminStaffLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess((user) => canAccessStaffCenter(user));
  return children;
}
