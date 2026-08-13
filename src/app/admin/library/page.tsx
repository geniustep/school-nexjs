'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { LibraryWorkspace } from '@/features/admin/library/library-workspace';

export default function LibraryPage() {
  return (
    <RequireAdminPermission permission="library.view">
      <LibraryWorkspace />
    </RequireAdminPermission>
  );
}
