'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AcademicSegmentedControl } from '@/features/admin/academic-setup/components/academic-segmented-control';
import { CreateSchoolSubjectDrawer } from '@/features/admin/academic-setup/components/create-school-subject-drawer';
import { ManageLevelSubjectsDrawer } from '@/features/admin/academic-setup/components/manage-level-subjects-drawer';
import { ReferenceSubjectsDrawer } from '@/features/admin/academic-setup/components/reference-subjects-drawer';
import { SubjectsLevelPanel } from '@/features/admin/academic-setup/components/subjects-level-panel';
import { SubjectsPageHero } from '@/features/admin/academic-setup/components/subjects-page-hero';
import { LevelEnablementDrawer } from '@/features/admin/subject-enablement/components/level-enablement-drawer';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { TracksPanel } from '@/features/admin/academic-setup/components/tracks-panel';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useDrawerActionParam } from '@/features/admin/academic-setup/hooks/use-drawer-action-param';
import { useTeachingAssignments } from '@/features/admin/academic-setup/hooks/use-teaching-assignments';
import { useTracksList } from '@/features/admin/academic-setup/hooks/use-tracks';
import {
  buildLevelSubjectsRows,
  summarizeLevelSubjects,
} from '@/features/admin/academic-setup/utils/level-subjects-overview';
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
  const tracksState = useTracksList({ limit: 200 });
  const readinessState = useSetupReadiness();
  const assignmentsState = useTeachingAssignments({ page_size: 500 });
  const canManage = canManageClasses(user);

  const [subjectsDrawerOpen, setSubjectsDrawerOpen] = useState(false);
  const [enablementDrawerOpen, setEnablementDrawerOpen] = useState(false);
  const [manageDrawerOpen, setManageDrawerOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [drawerLevelId, setDrawerLevelId] = useState<number | null>(null);
  const [manageLevelId, setManageLevelId] = useState<number | null>(null);
  const [drawerTrackId, setDrawerTrackId] = useState<number | null>(null);
  const [continueLevelId, setContinueLevelId] = useState<number | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const enableAction = useDrawerActionParam('enable-subjects');
  const manageAction = useDrawerActionParam('manage-subjects');
  const createAction = useDrawerActionParam('add-subject');

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

  const tabFromUrl = tabFromParam(searchParams.get('tab'));
  const [tab, setTab] = useState<Tab>(tabFromUrl);

  const filterLevelId = searchParams.get('level_id');
  const focusLevelId = filterLevelId ? Number(filterLevelId) : null;

  const levelRows = useMemo(
    () => buildLevelSubjectsRows(lists.levels, lists.classes, lists.subjects),
    [lists.levels, lists.classes, lists.subjects],
  );
  const overview = useMemo(() => summarizeLevelSubjects(levelRows), [levelRows]);

  const effectiveLevelId =
    selectedLevelId ??
    (Number.isFinite(focusLevelId) ? focusLevelId : null) ??
    overview.firstPendingId ??
    lists.levels[0]?.id ??
    null;

  const selectedLevel =
    lists.levels.find((l) => l.id === effectiveLevelId) ?? null;
  const showTracksTab = selectedLevel?.supports_tracks === true;

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    if (tab === 'tracks' && !showTracksTab) {
      setTab('subjects');
      syncQuery({ tab: null });
    }
  }, [tab, showTracksTab, syncQuery]);

  function handleTabChange(next: Tab) {
    if (next === 'tracks' && !showTracksTab) return;
    setTab(next);
    syncQuery({ tab: next === 'tracks' ? 'tracks' : null });
  }

  function refreshAll() {
    lists.reload();
    tracksState.reload();
    readinessState.reload();
    assignmentsState.reload();
  }

  const resolvedDrawerLevelId =
    drawerLevelId ??
    (enableAction.openFromAction ? overview.firstPendingId : null) ??
    effectiveLevelId;

  const drawerLevel =
    lists.levels.find((l) => l.id === resolvedDrawerLevelId) ??
    lists.levels[0] ??
    null;

  const resolvedManageLevelId =
    manageLevelId ??
    (manageAction.openFromAction ? effectiveLevelId : null);

  const manageLevel =
    lists.levels.find((l) => l.id === resolvedManageLevelId) ?? null;

  const manageSubjects = useMemo(() => {
    if (manageLevel == null) return [];
    return (
      levelRows.find((r) => r.level.id === manageLevel.id)?.subjects ??
      manageLevel.subjects ??
      []
    );
  }, [manageLevel, levelRows]);

  const subjectsOpen = subjectsDrawerOpen || enableAction.openFromAction;
  const manageOpen = manageDrawerOpen || manageAction.openFromAction;
  const createOpen = createDrawerOpen || createAction.openFromAction;

  const statChips = useMemo(
    () => [
      {
        tone: 'subjects' as const,
        value: overview.subjectCount,
        label: t('admin.academicSetup.subjectsStatSubjects'),
      },
      {
        tone: 'ready' as const,
        value: overview.readyLevels,
        label: t('admin.academicSetup.subjectsStatReady'),
      },
      {
        tone: 'pending' as const,
        value: overview.pendingLevels,
        label: t('admin.academicSetup.subjectsStatPending'),
      },
    ],
    [overview, t],
  );

  function openSubjectsDrawer(levelId: number, trackId?: number | null) {
    setDrawerLevelId(levelId);
    setSelectedLevelId(levelId);
    setDrawerTrackId(trackId ?? null);
    setEnablementDrawerOpen(false);
    setSubjectsDrawerOpen(true);
    setContinueLevelId(null);
    if (tab !== 'subjects') handleTabChange('subjects');
  }

  function openManageSubjects(levelId: number) {
    setManageLevelId(levelId);
    setSelectedLevelId(levelId);
    setManageDrawerOpen(true);
    if (tab !== 'subjects') handleTabChange('subjects');
  }

  function openEnablementDrawer(levelId: number) {
    setDrawerLevelId(levelId);
    setSelectedLevelId(levelId);
    setSubjectsDrawerOpen(false);
    setEnablementDrawerOpen(true);
    if (tab !== 'subjects') handleTabChange('subjects');
  }

  function closeSubjectsDrawer() {
    setSubjectsDrawerOpen(false);
    setDrawerTrackId(null);
    enableAction.dismissActionParam();
  }

  function closeEnablementDrawer() {
    setEnablementDrawerOpen(false);
  }

  function closeManageDrawer() {
    setManageDrawerOpen(false);
    setManageLevelId(null);
    manageAction.dismissActionParam();
  }

  function openCreateSubject() {
    setCreateDrawerOpen(true);
    if (tab !== 'subjects') handleTabChange('subjects');
  }

  function closeCreateDrawer() {
    setCreateDrawerOpen(false);
    createAction.dismissActionParam();
  }

  function handleSubjectsEnabled(outcome: {
    enabledCount: number;
    fullSuccess: boolean;
    partialSuccess: boolean;
  }) {
    refreshAll();
    if (outcome.enabledCount <= 0) return;

    const enabledLevelId = drawerLevelId ?? drawerLevel?.id ?? null;
    const nextPending = levelRows.find(
      (r) => r.needsEnable && r.level.id !== enabledLevelId,
    );
    setContinueLevelId(nextPending?.level.id ?? null);
  }

  if (lists.initialLoading) {
    return (
      <>
        <SubjectsPageHero title={t('admin.academicSetup.nav.subjects')} skeleton />
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
    <div className="academic-subjects-page">
      <SubjectsPageHero
        title={t('admin.academicSetup.nav.subjects')}
        subtitle={t('admin.academicSetup.subjectsPageSubtitle')}
        statChips={statChips}
        actions={
          <div className="academic-subjects-hero__actions-stack">
            {canManage && (
              <button
                type="button"
                className="btn btn--primary academic-subjects-hero__manage-btn"
                onClick={openCreateSubject}
              >
                {t('admin.addSubject')}
              </button>
            )}
            {canManage && effectiveLevelId != null && (
              <button
                type="button"
                className="btn btn--secondary academic-subjects-hero__manage-btn"
                onClick={() => openManageSubjects(effectiveLevelId)}
              >
                {t('admin.academicSetup.manageSubjects')}
              </button>
            )}
            <Link
              href="/admin/subjects"
              className="btn btn--ghost academic-subjects-hero__catalog-btn"
            >
              {t('admin.academicSetup.subjectsCatalog')}
            </Link>
          </div>
        }
        toolbar={
          showTracksTab ? (
            <AcademicSegmentedControl
              ariaLabel={t('admin.academicSetup.subjectsTabLabel')}
              value={tab === 'tracks' ? 'tracks' : 'subjects'}
              onChange={handleTabChange}
              options={[
                { value: 'subjects', label: t('admin.academicSetup.tabSubjects') },
                { value: 'tracks', label: t('admin.academicSetup.tabTracks') },
              ]}
            />
          ) : undefined
        }
      />

      {tab === 'tracks' && showTracksTab ? (
        <div className="academic-subjects-surface">
          <TracksPanel
            canManage={canManage}
            focusLevelId={effectiveLevelId}
            onDataChanged={refreshAll}
          />
        </div>
      ) : (
        <div className="academic-subjects-surface">
          {lists.levels.length ? (
            <SubjectsLevelPanel
              levels={lists.levels}
              subjects={lists.subjects}
              classes={lists.classes}
              tracks={tracksState.tracks}
              canManage={canManage}
              onEnableSubjects={openSubjectsDrawer}
              onManageSubjects={openManageSubjects}
              onManageEnablement={openEnablementDrawer}
              readinessIssues={readinessState.data?.issues ?? []}
              focusLevelId={Number.isFinite(focusLevelId) ? focusLevelId : null}
              continueLevelId={continueLevelId}
              onDismissContinue={() => setContinueLevelId(null)}
              onSelectedLevelChange={setSelectedLevelId}
            />
          ) : (
            <div className="academic-setup-gap-banner">
              <p>{t('admin.academicSetup.guided.lockNoLevels')}</p>
            </div>
          )}
        </div>
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
        initialTrackId={drawerTrackId}
        schoolSubjects={lists.subjects}
        onClose={closeSubjectsDrawer}
        onEnabled={handleSubjectsEnabled}
      />

      <ManageLevelSubjectsDrawer
        open={manageOpen && manageLevel != null}
        level={manageLevel}
        subjects={manageSubjects}
        tracks={tracksState.tracks}
        canManage={canManage}
        onClose={closeManageDrawer}
        onSaved={refreshAll}
      />

      <CreateSchoolSubjectDrawer
        open={createOpen}
        levels={lists.levels}
        defaultLevelIds={effectiveLevelId != null ? [effectiveLevelId] : []}
        onClose={closeCreateDrawer}
        onSaved={() => refreshAll()}
      />
    </div>
  );
}
