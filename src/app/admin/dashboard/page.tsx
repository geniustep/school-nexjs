'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { PermissionDeniedState } from '@/components/states/states';
import { Card, InfoBanner, PageHeader } from '@/components/ui/primitives';
import { AdminExecutiveDashboard } from '@/features/admin/dashboard/admin-executive-dashboard';
import { AdminDashboardContextPanel } from '@/features/admin/dashboard/admin-dashboard-context-panel';
import { AdminPedagogicalDashboard } from '@/features/admin/dashboard/admin-pedagogical-dashboard';
import { AdminReadonlyDashboard } from '@/features/admin/dashboard/admin-readonly-dashboard';
import { AdminStaffOperationalDashboard } from '@/features/admin/dashboard/admin-staff-operational-dashboard';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { resolveDashboardVariant, shouldShowActiveSchoolBannerOnDashboard } from '@/lib/admin/dashboard-registry';
import { resolveAdminStaffWorkspace } from '@/lib/admin/admin-staff-workspace';
import { shouldShowDashboardContextPanel } from '@/lib/admin/executive-dashboard';
import { shouldUsePedagogicalDashboard } from '@/lib/admin/pedagogical-dashboard';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { isConfiguredAdmin } from '@/lib/permissions/scope';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDashboard } from '@/types/dashboard';
import type { SchoolRef } from '@/types/api';
type AllSchoolsDashboardItem = { school: SchoolRef; dashboard: AdminDashboard };

import v2Styles from '@/features/admin/dashboard/admin-executive-dashboard-v2.module.css';

export default function AdminDashboardPage() {
  const user = useSession();
  const { activeSchoolId, schools, schoolViewMode } = useAdminSession();
  const allSchoolsMode = schoolViewMode === 'all';
  const t = useT();
  const variant = resolveDashboardVariant(user);
  const staffWorkspace = resolveAdminStaffWorkspace(user);
  const state = useAdminResource<AdminDashboard>(
    !allSchoolsMode && variant.fetchFullDashboardApi ? endpoints.admin.dashboard : null,
  );
  const allSchoolsState = useAdminResource<AllSchoolsDashboardItem[]>(
    allSchoolsMode ? endpoints.admin.allSchoolsDashboard : null,
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

  if (allSchoolsMode) {
    return (
      <div className="admin-workspace admin-workspace--dashboard">
        <PageHeader title="كل المدارس" subtitle="عرض موحّد للقراءة فقط؛ تبقى كل البيانات ضمن المدرسة المصرّح بها." />
        <ResourceView state={allSchoolsState} loadingLabel={t('common.loading')}>
          {(items) => <div className="grid grid--3">{items.map(({ school, dashboard }) => (
            <Card key={school.id}>
              <h2 dir="auto">{school.name}</h2>
              <dl>
                <div><dt>{t('nav.students')}</dt><dd className="mono">{dashboard.total_students ?? 0}</dd></div>
                <div><dt>{t('nav.classes')}</dt><dd className="mono">{dashboard.total_classes ?? 0}</dd></div>
                <div><dt>{t('nav.parents')}</dt><dd className="mono">{dashboard.total_parents ?? 0}</dd></div>
                <div><dt>{t('nav.teachers')}</dt><dd className="mono">{dashboard.total_teachers ?? 0}</dd></div>
              </dl>
            </Card>
          ))}</div>}
        </ResourceView>
      </div>
    );
  }

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
      {variant.id !== 'admin_staff' && shouldShowDashboardContextPanel(user) && (
        <AdminDashboardContextPanel user={user} schoolLabel={schoolLabel} />
      )}
      {variant.showMultiSchoolPortfolioNotice && (
        <InfoBanner
          tone="blue"
          icon="&#127979;"
          title={t('admin.multiSchoolContext')}
          description={t('admin.multiSchoolPortfolioPending')}
        />
      )}

      {shouldShowActiveSchoolBannerOnDashboard(user) && (
        <InfoBanner
          tone="blue"
          title={t('admin.activeSchool')}
          description={t('admin.activeSchoolWorking', { school: schoolLabel })}
        />
      )}

      {scopeBanner}

      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(d) => (
          <div className={v2Styles.shell}>
            {staffWorkspace ? (
              <AdminStaffOperationalDashboard data={d} user={user} workspace={staffWorkspace} />
            ) : (
              <>
                <AdminExecutiveDashboard data={d} user={user} />
              </>
            )}
          </div>
        )}
      </ResourceView>
    </div>
  );
}
