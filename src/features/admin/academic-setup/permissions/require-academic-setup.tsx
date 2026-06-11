'use client';

import type { ReactNode } from 'react';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { NoActiveSchoolState, PermissionDeniedState } from '@/components/states/states';

export function RequireAcademicSetupAccess({ children }: { children: ReactNode }) {
  const user = useSession();
  const { requiresActiveSchool, activeSchoolId } = useAdminSession();
  const t = useT();

  if (!canViewAcademicSetup(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  if (requiresActiveSchool && activeSchoolId == null) {
    return <NoActiveSchoolState />;
  }
  return <>{children}</>;
}
