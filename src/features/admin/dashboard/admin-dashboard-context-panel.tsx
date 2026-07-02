'use client';

import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  dashboardPermissionAreaLabelKey,
  resolveDashboardContextPresentation,
} from '@/lib/admin/dashboard-registry';
import type { CurrentUser } from '@/types/user';

export function AdminDashboardContextPanel({
  user,
  schoolLabel,
}: {
  user: CurrentUser | null;
  schoolLabel: string;
}) {
  const t = useT();
  const presentation = resolveDashboardContextPresentation(user);

  if (!presentation) {
    return null;
  }

  return (
    <Card className="admin-dashboard-context" pad>
      <div className="admin-dashboard-context__header">
        <p className="admin-dashboard-context__eyebrow">{t('admin.dashboardContext.title')}</p>
        <h2 className="admin-dashboard-context__headline">{t(presentation.headlineKey)}</h2>
      </div>

      <dl className="admin-dashboard-context__meta">
        <div>
          <dt>{t('admin.dashboardContext.variantLabel')}</dt>
          <dd>{t(presentation.variantLabelKey)}</dd>
        </div>
        <div>
          <dt>{t('admin.dashboardContext.activeSchoolLabel')}</dt>
          <dd dir="auto">{schoolLabel || t('admin.dashboardContext.activeSchoolNone')}</dd>
        </div>
        <div>
          <dt>{t('admin.dashboardContext.modeLabel')}</dt>
          <dd>
            <span
              className={
                presentation.mode === 'full'
                  ? 'admin-dashboard-context__mode admin-dashboard-context__mode--full'
                  : 'admin-dashboard-context__mode admin-dashboard-context__mode--limited'
              }
            >
              {presentation.mode === 'full'
                ? t('admin.dashboardContext.modeFull')
                : t('admin.dashboardContext.modeLimited')}
            </span>
          </dd>
        </div>
      </dl>

      {presentation.hiddenReasonKey ? (
        <p className="admin-dashboard-context__reason" role="note">
          {t(presentation.hiddenReasonKey)}
        </p>
      ) : null}

      <div className="admin-dashboard-context__perms">
        <span className="admin-dashboard-context__perms-label">
          {t('admin.dashboardContext.permissionsLabel')}
        </span>
        <ul className="admin-dashboard-context__perm-list">
          {presentation.permissionAreas.map((area) => (
            <li key={area.id}>
              <span
                className={
                  area.allowed
                    ? 'admin-dashboard-context__perm admin-dashboard-context__perm--on'
                    : 'admin-dashboard-context__perm admin-dashboard-context__perm--off'
                }
              >
                <span className="admin-dashboard-context__perm-name">
                  {t(dashboardPermissionAreaLabelKey(area.id))}
                </span>
                <span className="admin-dashboard-context__perm-state">
                  {area.allowed
                    ? t('admin.dashboardContext.permAllowed')
                    : t('admin.dashboardContext.permDenied')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
