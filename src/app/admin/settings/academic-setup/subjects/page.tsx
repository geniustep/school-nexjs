'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AcademicSegmentedControl } from '@/features/admin/academic-setup/components/academic-segmented-control';
import { ReferenceSubjectsDrawer } from '@/features/admin/academic-setup/components/reference-subjects-drawer';
import { SubjectsLevelPanel } from '@/features/admin/academic-setup/components/subjects-level-panel';
import { LevelEnablementDrawer } from '@/features/admin/subject-enablement/components/level-enablement-drawer';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { TracksPanel } from '@/features/admin/academic-setup/components/tracks-panel';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useDrawerActionParam } from '@/features/admin/academic-setup/hooks/use-drawer-action-param';
import { useTeachingAssignments } from '@/features/admin/academic-setup/hooks/use-teaching-assignments';
import { canManageClasses } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

type Tab = 'subjects' | 'tracks';

function tabFromParam(value: string | null): Tab {
  return value === 'tracks' ? 'tracks' : 'subjects';
}

export default function AcademicSetupSubjectsPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lists = useAcademicSetupLists();
  const readinessState = useSetupReadiness();
  const assignmentsState = useTeachingAssignments({ page_size: 500 });
  const canManage = canManageClasses(user);

  const [subjectsDrawerOpen, setSubjectsDrawerOpen] = useState(false);
  const [enablementDrawerOpen, setEnablementDrawerOpen] = useState(false);
  const [drawerLevelId, setDrawerLevelId] = useState<number | null>(null);
  const enableAction = useDrawerActionParam('enable-subjects');

  const tabFromUrl = tabFromParam(searchParams.get('tab'));
  const [tab, setTab] = useState<Tab>(tabFromUrl);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  const syncQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === '') params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function handleTabChange(next: Tab) {
    setTab(next);
    syncQuery({ tab: next === 'tracks' ? 'tracks' : null });
  }

  function refreshAll() {
    lists.reload();
    readinessState.reload();
    assignmentsState.reload();
  }

  const filterLevelId = searchParams.get('level_id');
  const focusLevelId = filterLevelId ? Number(filterLevelId) : null;
  const initialLevelId = focusLevelId ?? lists.levels[0]?.id ?? null;

  const drawerLevel =
    lists.levels.find((l) => l.id === (drawerLevelId ?? initialLevelId)) ??
    lists.levels[0] ??
    null;

  const subjectsOpen = subjectsDrawerOpen || enableAction.openFromAction;

  const subjectCount = useMemo(() => lists.subjects.length, [lists.subjects]);

  function openSubjectsDrawer(levelId: number) {
    setDrawerLevelId(levelId);
    setEnablementDrawerOpen(false);
    setSubjectsDrawerOpen(true);
  }

  function openEnablementDrawer(levelId: number) {
    setDrawerLevelId(levelId);
    setSubjectsDrawerOpen(false);
    setEnablementDrawerOpen(true);
  }

  function closeSubjectsDrawer() {
    setSubjectsDrawerOpen(false);
    enableAction.dismissActionParam();
  }

  function closeEnablementDrawer() {
    setEnablementDrawerOpen(false);
  }

  if (lists.initialLoading) {
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
        title={t('admin.subjectEnablement.pageTitle')}
        subtitle={t('admin.subjectEnablement.pageSubtitle')}
        stats={t('admin.academicSetup.subjectsPageStats', {
          subjects: subjectCount,
          levels: lists.levels.length,
        })}
      />

      <AcademicSegmentedControl
        ariaLabel={t('admin.academicSetup.subjectsTabLabel')}
        value={tab}
        onChange={handleTabChange}
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
            onManageEnablement={openEnablementDrawer}
            readinessIssues={readinessState.data?.issues ?? []}
          />
        ) : (
          <div className="academic-setup-gap-banner">
            <p>{t('admin.academicSetup.guided.lockNoLevels')}</p>
          </div>
        )
      ) : (
        <TracksPanel
          canManage={canManage}
          focusLevelId={Number.isFinite(focusLevelId) ? focusLevelId : null}
          onDataChanged={refreshAll}
        />
      )}

      <LevelEnablementDrawer
        open={enablementDrawerOpen && drawerLevel != null}
        level={drawerLevel}
        operationalSubjects={lists.subjects}
        onClose={closeEnablementDrawer}
        onSaved={refreshAll}
        onOpenReferenceEnable={
          canManage && drawerLevel
            ? () => openSubjectsDrawer(drawerLevel.id)
            : undefined
        }
      />

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
