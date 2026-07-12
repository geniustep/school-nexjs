import { requireAdminAccess } from '@/lib/auth/require-admin-permission';
import { canViewSchoolBrandingSettings } from '@/lib/permissions/school-branding-settings';

export default async function AdminSchoolBrandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminAccess((user) => canViewSchoolBrandingSettings(user));
  return children;
}
