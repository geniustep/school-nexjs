'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { PermissionDeniedState } from '@/components/states/states';
import { Card, InfoBanner } from '@/components/ui/primitives';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminCommandDashboard } from '@/features/admin/command-center/admin-command-dashboard';
import { AdminReadonlyDashboard } from '@/features/admin/dashboard/admin-readonly-dashboard';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { isConfiguredAdmin, isScopedAdmin } from '@/lib/permissions/scope';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDashboard } from '@/types/dashboard';

export default function AdminDashboardPage() {
  const user = useSession();
  const t = useT();
  const state = useAdminResource<AdminDashboard>(
    hasPermission(user, 'view_dashboard') ? endpoints.admin.dashboard : null,
  );

  if (!isConfiguredAdmin(user)) {
    return (
      <div className="admin-workspace">
        <Card>
          <PermissionDeniedState description={t('admin.noScopeDesc')} />
        </Card>
      </div>
    );
  }

  if (!hasPermission(user, 'view_dashboard')) {
    return <AdminReadonlyDashboard />;
  }

  return (
    <RequireAdminPermission permission="view_dashboard">
      <div className="admin-workspace admin-workspace--dashboard">
        {isScopedAdmin(user) && (
          <InfoBanner
            tone="amber"
            icon="&#128274;"
            title={t('admin.limitedAccess')}
            description={t('admin.limitedAccessDesc')}
          />
        )}

        <ResourceView state={state} loadingLabel={t('common.loading')}>
          {(d) => <AdminCommandDashboard data={d} user={user} />}
        </ResourceView>
      </div>
    </RequireAdminPermission>
  );
}
