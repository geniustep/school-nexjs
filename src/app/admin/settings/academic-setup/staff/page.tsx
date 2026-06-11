'use client';

import { InfoBanner, PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupStaffPage() {
  const t = useT();

  return (
    <>
      <PageHeader title={t('admin.academicSetup.nav.staff')} subtitle={t('admin.academicSetup.staffDesc')} />
      <InfoBanner
        tone="amber"
        icon="🧑‍💼"
        title={t('admin.academicSetup.staffApiGapTitle')}
        description={t('admin.academicSetup.staffApiGapDesc')}
      />
      <p className="muted">{t('admin.academicSetup.staffReadOnlyNote')}</p>
    </>
  );
}
