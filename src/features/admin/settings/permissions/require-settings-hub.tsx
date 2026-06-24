'use client';

import type { ReactNode } from 'react';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import { canViewSchoolBrandingSettings } from '@/lib/permissions/school-branding-settings';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { PermissionDeniedState } from '@/components/states/states';

export function canViewSettingsHub(user: Parameters<typeof canViewAcademicSetup>[0]): boolean {
  return canViewAcademicSetup(user) || canViewSchoolBrandingSettings(user);
}

export function RequireSettingsHubAccess({ children }: { children: ReactNode }) {
  const user = useSession();
  const t = useT();

  if (!canViewSettingsHub(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  return <>{children}</>;
}
