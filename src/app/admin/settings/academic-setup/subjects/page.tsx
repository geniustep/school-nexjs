'use client';

import { useMemo } from 'react';
import { ErrorState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { SubjectsByLevel } from '@/features/admin/academic-setup/components/subjects-by-level';
import { useAcademicSetupData } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { groupSubjectsByLevel } from '@/features/admin/academic-setup/utils/summary';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupSubjectsPage() {
  const t = useT();
  const data = useAcademicSetupData(t);
  const groups = useMemo(
    () => groupSubjectsByLevel(data.levels, data.classes, data.subjects),
    [data.levels, data.classes, data.subjects],
  );

  if (data.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.subjects')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (data.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.subjects')} />
        <ErrorState
          error={{ code: 'server_error', message: t('admin.academicSetup.loadError'), details: {} }}
          onRetry={data.reload}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('admin.academicSetup.nav.subjects')} subtitle={t('admin.academicSetup.subjectsDesc')} />
      <SubjectsByLevel groups={groups} />
    </>
  );
}
