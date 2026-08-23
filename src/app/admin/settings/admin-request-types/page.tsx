'use client';

import { EmptyState } from '@/components/states/states';
import { AdminRequestTypesSettingsPage } from '@/features/admin-requests/components/admin-request-types-settings-page';
import { useSession } from '@/features/auth/session-context';
import { canViewAdminRequestTypeSettings } from '@/lib/permissions/admin-request-types-settings';

export default function AdminRequestTypesPage() {
  const user = useSession();
  if (!canViewAdminRequestTypeSettings(user)) {
    return (
      <EmptyState
        title="غير مسموح"
        description="لا تملك صلاحية إدارة أنواع الطلبات الإدارية لهذه المؤسسة."
      />
    );
  }
  return <AdminRequestTypesSettingsPage />;
}
