import { requireAdminPermission } from '@/lib/auth/require-admin-permission';

export default async function AdminTimetableLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPermission('view_timetable');
  return children;
}
