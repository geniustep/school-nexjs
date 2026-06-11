'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { SubjectsByLevel } from '@/features/admin/academic-setup/components/subjects-by-level';
import { SubjectsLevelPanel } from '@/features/admin/academic-setup/components/subjects-level-panel';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
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
  const readinessState = useSetupReadiness();
  const canManage = canManageClasses(user);

  function refreshAll() {
    lists.reload();
    readinessState.reload();
  }
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
        <ErrorState error={lists.error} onRetry={refreshAll} />
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
      {tab === 'subjects' ? (
        lists.levels.length ? (
          <>
            <SubjectsLevelPanel
              levels={lists.levels}
              subjects={lists.subjects}
              classes={lists.classes}
              canManage={canManage}
            />
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--c-border)' }} />
            <SubjectsByLevel groups={groups} />
          </>
        ) : (
          <div className="academic-setup-gap-banner">
            <p>{t('admin.academicSetup.guided.lockNoLevels')}</p>
          </div>
        )
      ) : (
        <TracksPanel canManage={canManage} />
      )}
    </>
  );
}
