'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { RequireAdminAcademicHub } from '@/components/admin/require-admin-academic-hub';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { RequireAcademicSetupAccess } from '@/features/admin/academic-setup/permissions/require-academic-setup';
import { isAdminAcademicPath, permissionForAdminPath } from '@/lib/permissions/admin-pages';
import { isAcademicSetupPath, isSettingsPath } from '@/lib/permissions/academic-setup';

/** Enforces view_* permission for the current /admin route (direct URL access). */
export function AdminPageGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isAcademicSetupPath(pathname) || isSettingsPath(pathname)) {
    return <RequireAcademicSetupAccess>{children}</RequireAcademicSetupAccess>;
  }
  if (isAdminAcademicPath(pathname)) {
    return <RequireAdminAcademicHub>{children}</RequireAdminAcademicHub>;
  }
  const permission = permissionForAdminPath(pathname);
  if (!permission) return <>{children}</>;
  return <RequireAdminPermission permission={permission}>{children}</RequireAdminPermission>;
}
