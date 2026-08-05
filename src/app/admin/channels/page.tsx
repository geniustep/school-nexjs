'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminChannelsWorkspace } from '@/features/channels/admin-channels-workspace';

export default function AdminChannelsPage() {
  return (
    <RequireAdminPermission permission="view_channels">
      <AdminChannelsWorkspace />
    </RequireAdminPermission>
  );
}
