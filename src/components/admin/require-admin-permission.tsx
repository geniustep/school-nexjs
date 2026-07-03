'use client';

import type { ReactNode } from 'react';
import { canAccessAdminDashboard } from '@/lib/admin/admin-ux';
import { canAccessStaffCenter } from '@/lib/permissions/academic-setup';
import { hasPermission } from '@/lib/permissions/permissions';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { NoActiveSchoolState, PermissionDeniedState } from '@/components/states/states';
import type { Permission } from '@/types/permissions';

export function RequireAdminPermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const user = useSession();
  const { requiresActiveSchool, activeSchoolId } = useAdminSession();
  const t = useT();

  if (user.role !== 'admin') return <PermissionDeniedState />;
  const allowed =
    permission === 'view_dashboard'
      ? canAccessAdminDashboard(user)
      : hasPermission(user, permission);

  if (!allowed) {
    const description =
      permission === 'view_dashboard' && user.admin_kind === 'admin_staff'
        ? t('admin.staffNoDashboardDesc')
        : t('admin.pageForbidden');
    const title =
      permission === 'view_dashboard' && user.admin_kind === 'admin_staff'
        ? t('admin.staffNoDashboardTitle')
        : undefined;
    return <PermissionDeniedState title={title} description={description} />;
  }
  if (requiresActiveSchool && activeSchoolId == null) {
    return <NoActiveSchoolState />;
  }
  return <>{children}</>;
}

export function RequireStaffCenterAccess({ children }: { children: ReactNode }) {
  const user = useSession();
  const { requiresActiveSchool, activeSchoolId } = useAdminSession();
  const t = useT();

  if (user.role !== 'admin' || !canAccessStaffCenter(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  if (requiresActiveSchool && activeSchoolId == null) {
    return <NoActiveSchoolState />;
  }
  return <>{children}</>;
}
