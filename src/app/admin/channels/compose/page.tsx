'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Compose entry:
 * - ?studentId=… → family/student-scoped compose (existing)
 * - otherwise → admin create-message with sendable channel picker
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { LoadingState } from '@/components/states/states';
import { AdminCreateMessageWorkspace } from '@/features/channels/admin-create-message-workspace';
import { StudentChannelComposeWorkspace } from '@/features/channels/student-channel-compose-workspace';
import { useT } from '@/features/i18n/locale-context';

function AdminChannelComposeEntry() {
  const searchParams = useSearchParams();
  const hasStudentId = searchParams.has('studentId');
  if (hasStudentId) {
    return <StudentChannelComposeWorkspace />;
  }
  return <AdminCreateMessageWorkspace />;
}

export default function AdminChannelComposePage() {
  const t = useT();
  return (
    <RequireAdminPermission permission="view_channels">
      <Suspense fallback={<LoadingState label={t('channels.compose.loading')} />}>
        <AdminChannelComposeEntry />
      </Suspense>
    </RequireAdminPermission>
  );
}
