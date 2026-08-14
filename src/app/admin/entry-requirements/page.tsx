'use client';

import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminEntryRequirementsWorkspace } from '@/features/admin/entry-requirements/entry-requirements-workspace';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';

export default function AdminEntryRequirementsPage() {
  const user = useSession();
  const permission = hasPermission(user, 'entry_requirements.manage')
    ? 'entry_requirements.manage'
    : 'entry_requirements.publish';

  return (
    <RequireAdminPermission permission={permission}>
      <AdminEntryRequirementsWorkspace />
    </RequireAdminPermission>
  );
}
