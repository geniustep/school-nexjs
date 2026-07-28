'use client';

import type { ReactNode } from 'react';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { NoActiveSchoolState, PermissionDeniedState } from '@/components/states/states';
import { canReviewCommunication } from '@/lib/permissions/communication';

/** UX gate for /admin/communication — Backend remains final authority. */
export function RequireCommunicationReviewAccess({ children }: { children: ReactNode }) {
  const user = useSession();
  const { requiresActiveSchool, activeSchoolId } = useAdminSession();
  const t = useT();

  if (user.role !== 'admin' || !canReviewCommunication(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  if (requiresActiveSchool && activeSchoolId == null) {
    return <NoActiveSchoolState />;
  }
  return <>{children}</>;
}
