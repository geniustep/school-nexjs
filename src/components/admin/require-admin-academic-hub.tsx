'use client';

import type { ReactNode } from 'react';
import { canAccessAdminAcademic } from '@/lib/permissions/admin-pages';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { NoActiveSchoolState, PermissionDeniedState } from '@/components/states/states';

/** `/admin/academic` — requires at least one academic hub permission (not view_dashboard alone). */
export function RequireAdminAcademicHub({ children }: { children: ReactNode }) {
  const user = useSession();
  const { requiresActiveSchool, activeSchoolId } = useAdminSession();
  const t = useT();

  if (user.role !== 'admin') return <PermissionDeniedState />;
  if (!canAccessAdminAcademic(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  if (requiresActiveSchool && activeSchoolId == null) {
    return <NoActiveSchoolState />;
  }
  return <>{children}</>;
}
