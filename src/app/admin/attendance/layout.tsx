import { requireAdminPermission } from '@/lib/auth/require-admin-permission';

export default async function AdminAttendanceLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPermission('view_attendance');
  return children;
}
