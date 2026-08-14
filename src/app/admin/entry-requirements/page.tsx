'use client';

import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminEntryRequirementsWorkspace } from '@/features/admin/entry-requirements/entry-requirements-workspace';

export default function AdminEntryRequirementsPage() {
  return <RequireAdminPermission permission="entry_requirements.manage"><AdminEntryRequirementsWorkspace /></RequireAdminPermission>;
}
