'use client';

import type { ReactNode } from 'react';
import { NoActiveSchoolState, PermissionDeniedState } from '@/components/states/states';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { hasStudentImportCapability } from './student-import-capability';

export function RequireStudentImportCapability({ children }: { children: ReactNode }) {
  const user = useSession();
  const { requiresActiveSchool, activeSchoolId } = useAdminSession();
  const t = useT();

  if (user.role !== 'admin') {
    return <PermissionDeniedState />;
  }

  if (!hasStudentImportCapability(user)) {
    return (
      <PermissionDeniedState
        title={t('admin.studentImport.server.noPermissionTitle')}
        description={t('admin.studentImport.server.noPermission')}
      />
    );
  }

  if (requiresActiveSchool && activeSchoolId == null) {
    return <NoActiveSchoolState />;
  }

  return <>{children}</>;
}
