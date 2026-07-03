'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { RequireAdminAcademicHub } from '@/components/admin/require-admin-academic-hub';
import { RequireAdminPermission, RequireStaffCenterAccess } from '@/components/admin/require-admin-permission';
import { RequireAcademicSetupAccess } from '@/features/admin/academic-setup/permissions/require-academic-setup';
import { RequireSettingsHubAccess } from '@/features/admin/settings/permissions/require-settings-hub';
import { RequireSchoolBrandingSettingsAccess } from '@/features/admin/school-branding/permissions/require-school-branding-settings';
import { isAdminAcademicPath, permissionForAdminPath } from '@/lib/permissions/admin-pages';
import { isAcademicSetupPath } from '@/lib/permissions/academic-setup';
import { isSchoolBrandingSettingsPath } from '@/lib/permissions/school-branding-settings';

/** Enforces view_* permission for the current /admin route (direct URL access). */
export function AdminPageGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const base = pathname.split('?')[0];
  if (isSchoolBrandingSettingsPath(pathname)) {
    return <RequireSchoolBrandingSettingsAccess>{children}</RequireSchoolBrandingSettingsAccess>;
  }
  if (isAcademicSetupPath(pathname)) {
    return <RequireAcademicSetupAccess>{children}</RequireAcademicSetupAccess>;
  }
  if (base === '/admin/settings') {
    return <RequireSettingsHubAccess>{children}</RequireSettingsHubAccess>;
  }
  if (isAdminAcademicPath(pathname)) {
    return <RequireAdminAcademicHub>{children}</RequireAdminAcademicHub>;
  }
  if (base.startsWith('/admin/staff')) {
    return <RequireStaffCenterAccess>{children}</RequireStaffCenterAccess>;
  }
  const permission = permissionForAdminPath(pathname);
  if (!permission) return <>{children}</>;
  return <RequireAdminPermission permission={permission}>{children}</RequireAdminPermission>;
}
