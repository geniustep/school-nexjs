'use client';

import type { ReactNode } from 'react';
import { NoActiveSchoolState, PermissionDeniedState } from '@/components/states/states';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { canManageEdgeSettings } from '@/features/admin/edge/permissions/edge-settings';

export function RequireEdgeSettingsAccess({ children }: { children: ReactNode }) {
  const user = useSession();
  const { requiresActiveSchool, activeSchoolId } = useAdminSession();
  const t = useT();

  if (!canManageEdgeSettings(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  if (requiresActiveSchool && activeSchoolId == null) {
    return <NoActiveSchoolState />;
  }
  return <>{children}</>;
}
