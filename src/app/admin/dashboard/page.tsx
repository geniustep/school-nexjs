'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { PermissionDeniedState } from '@/components/states/states';
import { Card, InfoBanner } from '@/components/ui/primitives';
import { AdminCommandDashboard } from '@/features/admin/command-center/admin-command-dashboard';
import { AdminDashboardContextPanel } from '@/features/admin/dashboard/admin-dashboard-context-panel';
import { AdminPedagogicalDashboard } from '@/features/admin/dashboard/admin-pedagogical-dashboard';
import { AdminReadonlyDashboard } from '@/features/admin/dashboard/admin-readonly-dashboard';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { resolveDashboardVariant } from '@/lib/admin/dashboard-registry';
import { shouldUsePedagogicalDashboard } from '@/lib/admin/pedagogical-dashboard';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { isConfiguredAdmin } from '@/lib/permissions/scope';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDashboard } from '@/types/dashboard';

export default function AdminDashboardPage() {
  const user = useSession();
  const { activeSchoolId, schools } = useAdminSession();
  const t = useT();
  const variant = resolveDashboardVariant(user);
  const state = useAdminResource<AdminDashboard>(
    variant.fetchFullDashboardApi ? endpoints.admin.dashboard : null,
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

  if (!variant.canAccess) {
    return (
      <div className="admin-workspace">
        <Card>
          <PermissionDeniedState description={t('admin.dashboardNoPermissions')} />
        </Card>
      </div>
    );
  }

  const activeRef =
    schools.find((s) => s.id === activeSchoolId) ?? user.school ?? null;
  const schoolLabel = formatSchoolLabel(activeRef, t);

  const scopeBanner = variant.showScopedAccessBanner ? (
    <InfoBanner
      tone="amber"
      icon="&#128274;"
      title={t('admin.limitedAccess')}
      description={t('admin.scopedDashboardDesc')}
    />
  ) : null;

  if (shouldUsePedagogicalDashboard(user)) {
    return (
      <div className="admin-workspace admin-workspace--dashboard">
        <AdminPedagogicalDashboard />
      </div>
    );
  }

  if (variant.shell === 'readonly') {
    return (
      <div className="admin-workspace admin-workspace--dashboard">
        <AdminDashboardContextPanel user={user} schoolLabel={schoolLabel} />
        {scopeBanner}
        <AdminReadonlyDashboard />
      </div>
    );
  }

  return (
    <div className="admin-workspace admin-workspace--dashboard">
      <AdminDashboardContextPanel user={user} schoolLabel={schoolLabel} />
      {variant.showMultiSchoolPortfolioNotice && (
        <InfoBanner
          tone="blue"
          icon="&#127979;"
          title={t('admin.multiSchoolContext')}
          description={t('admin.multiSchoolPortfolioPending')}
        />
      )}

      {variant.showActiveSchoolBanner && (
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
