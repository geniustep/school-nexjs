'use client';

import type { ReactNode } from 'react';
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
  if (!hasPermission(user, permission)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  if (requiresActiveSchool && activeSchoolId == null) {
    return <NoActiveSchoolState />;
  }
  return <>{children}</>;
}
