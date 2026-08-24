'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import '@/features/admin/academic-setup/academic-setup-ui.css';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { EmptyState } from '@/components/states/states';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import { canViewSchoolBrandingSettings } from '@/lib/permissions/school-branding-settings';
import { canViewAdminRequestTypeSettings } from '@/lib/permissions/admin-request-types-settings';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  ADMIN_HUB_CARD_CLASS,
  ADMIN_HUB_CARD_ICON_CLASS,
  ADMIN_HUB_GRID_CLASS,
  hasAdminHubLinks,
} from '@/features/admin/hubs/academic-hub-present';

export default function AdminSettingsPage() {
  const t = useT();
  const user = useSession();
  const showAcademic = canViewAcademicSetup(user);
  const showBranding = canViewSchoolBrandingSettings(user);
  const showAdminRequestTypes = canViewAdminRequestTypeSettings(user);
  const visibleCount = Number(showBranding) + Number(showAcademic) + Number(showAdminRequestTypes);

  return (
    <div className="admin-workspace">
      <PageHeader title={t('admin.settings.title')} subtitle={t('admin.settings.subtitle')} />
      {!hasAdminHubLinks(visibleCount) ? (
        <EmptyState
          title={t('errors.forbiddenTitle')}
          description={t('admin.pageForbidden')}
        />
      ) : (
        <div className={ADMIN_HUB_GRID_CLASS}>
          {showBranding && (
            <Link href="/admin/settings/school-branding" className={ADMIN_HUB_CARD_CLASS}>
              <span className={ADMIN_HUB_CARD_ICON_CLASS} aria-hidden>
                🎨
              </span>
              <strong>{t('admin.settings.schoolBranding.card')}</strong>
              <p className="muted">{t('admin.settings.schoolBranding.cardDesc')}</p>
            </Link>
          )}
          {showAdminRequestTypes && (
            <Link href="/admin/settings/admin-request-types" className={ADMIN_HUB_CARD_CLASS}>
              <span className={ADMIN_HUB_CARD_ICON_CLASS} aria-hidden>
                🗂️
              </span>
              <strong>أنواع الطلبات الإدارية</strong>
              <p className="muted">التواصل المدرسي: إدارة الأنواع المتاحة للأسرة ومسارها الافتراضي.</p>
            </Link>
          )}
          {showAcademic && (
            <Link href="/admin/settings/academic-setup" className={ADMIN_HUB_CARD_CLASS}>
              <span className={ADMIN_HUB_CARD_ICON_CLASS} aria-hidden>
                🏛️
              </span>
              <strong>{t('admin.settings.organisationCard')}</strong>
              <p className="muted">{t('admin.settings.organisationCardDesc')}</p>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
