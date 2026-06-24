'use client';

import '@/features/admin/academic-setup/academic-setup-ui.css';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import { canViewSchoolBrandingSettings } from '@/lib/permissions/school-branding-settings';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AdminSettingsPage() {
  const t = useT();
  const user = useSession();
  const showAcademic = canViewAcademicSetup(user);
  const showBranding = canViewSchoolBrandingSettings(user);

  return (
    <>
      <PageHeader title={t('admin.settings.title')} subtitle={t('admin.settings.subtitle')} />
      <div className="settings-hub-grid">
        {showBranding && (
          <Link href="/admin/settings/school-branding" className="settings-hub-card">
            <span className="settings-hub-card__icon" aria-hidden>
              🎨
            </span>
            <strong>{t('admin.settings.schoolBranding.card')}</strong>
            <p className="muted">{t('admin.settings.schoolBranding.cardDesc')}</p>
          </Link>
        )}
        {showAcademic && (
          <Link href="/admin/settings/academic-setup" className="settings-hub-card">
            <span className="settings-hub-card__icon" aria-hidden>
              🏛️
            </span>
            <strong>{t('admin.settings.organisationCard')}</strong>
            <p className="muted">{t('admin.settings.organisationCardDesc')}</p>
          </Link>
        )}
      </div>
    </>
  );
}
