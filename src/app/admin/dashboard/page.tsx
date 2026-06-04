'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { PermissionDeniedState } from '@/components/states/states';
import { Card, InfoBanner } from '@/components/ui/primitives';
import { AdminCommandDashboard } from '@/features/admin/command-center/admin-command-dashboard';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  canAccessScopedAdminDashboard,
  isMultiSchoolAdmin,
  shouldShowMultiSchoolPortfolioNotice,
} from '@/lib/admin/admin-ux';
import { AdminReadonlyDashboard } from '@/features/admin/dashboard/admin-readonly-dashboard';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { hasPermission } from '@/lib/permissions/permissions';
import { isConfiguredAdmin, isScopedAdmin } from '@/lib/permissions/scope';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDashboard } from '@/types/dashboard';

export default function AdminDashboardPage() {
  const user = useSession();
  const { activeSchoolId, schools } = useAdminSession();
  const t = useT();
  const fullDashboard = hasPermission(user, 'view_dashboard');
  const scopedDashboard = canAccessScopedAdminDashboard(user);
  const state = useAdminResource<AdminDashboard>(
    fullDashboard ? endpoints.admin.dashboard : null,
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

  if (!fullDashboard && !scopedDashboard) {
    return (
      <div className="admin-workspace">
        <Card>
          <PermissionDeniedState description={t('admin.dashboardNoPermissions')} />
        </Card>
      </div>
    );
  }

  const scoped = isScopedAdmin(user) || user.admin_kind === 'general_supervisor';
  const multiSchool = isMultiSchoolAdmin(user);
  const activeRef =
    schools.find((s) => s.id === activeSchoolId) ?? user.school ?? null;
  const schoolLabel = formatSchoolLabel(activeRef, t);

  const scopeBanner = scoped ? (
    <InfoBanner
      tone="amber"
      icon="&#128274;"
      title={t('admin.limitedAccess')}
      description={t('admin.scopedDashboardDesc')}
    />
  ) : null;

  if (!fullDashboard && scopedDashboard) {
    return (
      <div className="admin-workspace admin-workspace--dashboard">
        {scopeBanner}
        <AdminReadonlyDashboard />
      </div>
    );
  }

  return (
    <div className="admin-workspace admin-workspace--dashboard">
      {shouldShowMultiSchoolPortfolioNotice(user) && (
        <InfoBanner
          tone="blue"
          icon="&#127979;"
          title={t('admin.multiSchoolContext')}
          description={t('admin.multiSchoolPortfolioPending')}
        />
      )}

      {multiSchool && (
        <InfoBanner
          tone="blue"
          title={t('admin.activeSchool')}
          description={t('admin.activeSchoolWorking', { school: schoolLabel })}
        />
      )}

      {scopeBanner}

      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(d) => <AdminCommandDashboard data={d} user={user} />}
      </ResourceView>
    </div>
  );
}
