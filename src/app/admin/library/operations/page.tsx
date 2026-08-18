'use client';

import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { LibraryOperationsWorkspace } from '@/features/admin/library/library-operations-workspace';

export default function LibraryOperationsPage() {
  return <RequireAdminPermission permission="library.view"><LibraryOperationsWorkspace /></RequireAdminPermission>;
}
