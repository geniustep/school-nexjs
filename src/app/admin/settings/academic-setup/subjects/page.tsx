'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { SubjectsByLevel } from '@/features/admin/academic-setup/components/subjects-by-level';
import { TracksPanel } from '@/features/admin/academic-setup/components/tracks-panel';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { groupSubjectsByLevel } from '@/features/admin/academic-setup/utils/summary';
import { canManageClasses } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

type Tab = 'subjects' | 'tracks';

export default function AcademicSetupSubjectsPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const lists = useAcademicSetupLists();
  const canManage = canManageClasses(user);
  const initialTab: Tab = searchParams.get('tab') === 'tracks' ? 'tracks' : 'subjects';
  const [tab, setTab] = useState<Tab>(initialTab);

  const groups = useMemo(
    () => groupSubjectsByLevel(lists.levels, lists.classes, lists.subjects),
    [lists.levels, lists.classes, lists.subjects],
  );

  if (lists.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.subjects')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (lists.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.subjects')} />
        <ErrorState error={lists.error} onRetry={lists.reload} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('admin.academicSetup.nav.subjects')} subtitle={t('admin.academicSetup.subjectsDesc')} />
      <div className="row" style={{ gap: 8, marginBottom: 16 }} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'subjects'}
          className={`btn btn--sm ${tab === 'subjects' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setTab('subjects')}
        >
          {t('admin.academicSetup.tabSubjects')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tracks'}
          className={`btn btn--sm ${tab === 'tracks' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setTab('tracks')}
        >
          {t('admin.academicSetup.tabTracks')}
        </button>
      </div>
      {tab === 'subjects' ? <SubjectsByLevel groups={groups} /> : <TracksPanel canManage={canManage} />}
    </>
  );
}
