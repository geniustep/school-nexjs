'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { LoadingState } from '@/components/states/states';
import { StudentChannelComposeWorkspace } from '@/features/channels/student-channel-compose-workspace';
import { useT } from '@/features/i18n/locale-context';

export default function AdminChannelComposePage() {
  const t = useT();
  return (
    <RequireAdminPermission permission="view_channels">
      <Suspense fallback={<LoadingState label={t('channels.compose.loading')} />}>
        <StudentChannelComposeWorkspace />
      </Suspense>
    </RequireAdminPermission>
  );
}
