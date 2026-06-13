'use client';

import Link from 'next/link';
import { LoadingState } from '@/components/states/states';
import {
  AutoSetupUnavailable,
  AutoSetupWizard,
} from '@/features/admin/academic-setup/components/auto-setup-wizard';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { isAcademicAutoSetupAvailable } from '@/features/admin/academic-setup/utils/academic-auto-setup-availability';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { canManageClasses } from '@/lib/permissions/academic-setup';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

export default function AcademicAutoSetupInitializePage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const canManage = canManageClasses(user);
  const optionsState = useLevelOptions(true, { include_enabled: 'true' });
  const readinessState = useSetupReadiness();

  const available = useMemo(
    () => isAcademicAutoSetupAvailable(optionsState.options, readinessState.data),
    [optionsState.options, readinessState.data],
  );

  useEffect(() => {
    if (!canManage) {
      router.replace('/admin/settings/academic-setup');
    }
  }, [canManage, router]);

  if (!canManage) {
    return null;
  }

  const loading = optionsState.loading || readinessState.loading;

  if (loading && !optionsState.options && !readinessState.data) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (!available) {
    return (
      <div className="auto-setup-page">
        <header className="auto-setup-page__header">
          <Link href="/admin/settings/academic-setup" className="academic-setup__back">
            {t('admin.academicSetup.autoSetup.backToSetup')}
          </Link>
          <h1 className="admin-section__title">{t('admin.academicSetup.autoSetup.title')}</h1>
        </header>
        <AutoSetupUnavailable />
      </div>
    );
  }

  return (
    <div className="auto-setup-page">
      <AutoSetupWizard />
    </div>
  );
}
