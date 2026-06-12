'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AcademicSegmentedControl } from '@/features/admin/academic-setup/components/academic-segmented-control';
import { ReferenceSubjectsDrawer } from '@/features/admin/academic-setup/components/reference-subjects-drawer';
import { SubjectsLevelPanel } from '@/features/admin/academic-setup/components/subjects-level-panel';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { TracksPanel } from '@/features/admin/academic-setup/components/tracks-panel';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useDrawerActionParam } from '@/features/admin/academic-setup/hooks/use-drawer-action-param';
import { useTeachingAssignments } from '@/features/admin/academic-setup/hooks/use-teaching-assignments';
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
  const assignmentsState = useTeachingAssignments({ page_size: 500 });
  const canManage = canManageClasses(user);

  const [subjectsDrawerOpen, setSubjectsDrawerOpen] = useState(false);
  const [drawerLevelId, setDrawerLevelId] = useState<number | null>(null);
  const enableAction = useDrawerActionParam('enable-subjects');

  function refreshAll() {
    lists.reload();
    readinessState.reload();
    assignmentsState.reload();
  }

  const initialTab: Tab = searchParams.get('tab') === 'tracks' ? 'tracks' : 'subjects';
  const [tab, setTab] = useState<Tab>(initialTab);

  const filterLevelId = searchParams.get('level_id');
  const initialLevelId = filterLevelId ? Number(filterLevelId) : lists.levels[0]?.id ?? null;

  const drawerLevel =
    lists.levels.find((l) => l.id === (drawerLevelId ?? initialLevelId)) ??
    lists.levels[0] ??
    null;

  const subjectsOpen = subjectsDrawerOpen || enableAction.openFromAction;

  const subjectCount = useMemo(() => lists.subjects.length, [lists.subjects]);

  function openSubjectsDrawer(levelId: number) {
    setDrawerLevelId(levelId);
    setSubjectsDrawerOpen(true);
  }

  function closeSubjectsDrawer() {
    setSubjectsDrawerOpen(false);
    enableAction.dismissActionParam();
  }

  if (lists.loading) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.subjects')} skeleton />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (lists.error) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.subjects')} />
        <ErrorState error={lists.error} onRetry={refreshAll} />
      </>
    );
  }

  return (
    <>
      <AcademicPageHeader
        title={t('admin.academicSetup.nav.subjects')}
        subtitle={t('admin.academicSetup.subjectsPageSubtitle')}
        stats={t('admin.academicSetup.subjectsPageStats', {
          subjects: subjectCount,
          levels: lists.levels.length,
        })}
      />

      <AcademicSegmentedControl
        ariaLabel={t('admin.academicSetup.subjectsTabLabel')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'subjects', label: t('admin.academicSetup.tabSubjects') },
          { value: 'tracks', label: t('admin.academicSetup.tabTracks') },
        ]}
      />

      {tab === 'subjects' ? (
        lists.levels.length ? (
          <SubjectsLevelPanel
            levels={lists.levels}
            subjects={lists.subjects}
            classes={lists.classes}
            canManage={canManage}
            onEnableSubjects={openSubjectsDrawer}
            readinessIssues={readinessState.data?.issues ?? []}
          />
        ) : (
          <div className="academic-setup-gap-banner">
            <p>{t('admin.academicSetup.guided.lockNoLevels')}</p>
          </div>
        )
      ) : (
        <TracksPanel canManage={canManage} />
      )}

      <ReferenceSubjectsDrawer
        open={subjectsOpen && drawerLevel != null}
        level={drawerLevel}
        readiness={readinessState.data}
        teachersCount={lists.teachers.length}
        onClose={closeSubjectsDrawer}
        onEnabled={() => {
          refreshAll();
        }}
      />
    </>
  );
}
