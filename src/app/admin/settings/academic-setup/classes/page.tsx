'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState, EmptyState } from '@/components/states/states';
import { IconPlus } from '@/components/icons/admin-icons';
import { ClassesPageHero } from '@/features/admin/academic-setup/components/classes-page-hero';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { BatchClassDrawer } from '@/features/admin/academic-setup/components/batch-class-drawer';
import { ClassDrawer } from '@/features/admin/academic-setup/components/class-drawer';
import { LevelsByCycleList } from '@/features/admin/academic-setup/components/levels-by-cycle-list';
import { LevelsToolbar } from '@/features/admin/academic-setup/components/levels-toolbar';
import { ReferenceLevelsDrawer } from '@/features/admin/academic-setup/components/reference-levels-drawer';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useDrawerActionParam } from '@/features/admin/academic-setup/hooks/use-drawer-action-param';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { useTrackOptions } from '@/features/admin/academic-setup/hooks/use-tracks';
import { filterLevelGroups, type LevelFilterMode } from '@/features/admin/academic-setup/utils/level-filters';
import { buildLevelGroups, groupSubjectsByLevel } from '@/features/admin/academic-setup/utils/summary';
import { parseNumericFilter } from '@/features/admin/academic-setup/utils/search';
import { canManageClasses } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';

export default function AcademicSetupClassesPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const lists = useAcademicSetupLists();
  const readinessState = useSetupReadiness();
  const trackOptionsState = useTrackOptions();
  const canManage = canManageClasses(user);

  const [drawer, setDrawer] = useState<
    | { mode: 'create'; levelId?: number; trackId?: number }
    | { mode: 'edit' | 'view'; cls: SchoolClass }
    | null
  >(null);
  const [levelsDrawerOpen, setLevelsDrawerOpen] = useState(false);
  const [batchLevelId, setBatchLevelId] = useState<number | null>(null);
  const [nextClassLevelId, setNextClassLevelId] = useState<number | null>(null);

  const levelGroups = useMemo(
    () => buildLevelGroups(lists.levels, lists.classes),
    [lists.levels, lists.classes],
  );

  const subjectCountsByLevel = useMemo(() => {
    const groups = groupSubjectsByLevel(lists.levels, lists.classes, lists.subjects);
    const map = new Map<number, number>();
    for (const g of groups) {
      if (g.levelId != null) map.set(g.levelId, g.subjects.length);
    }
    return map;
  }, [lists.levels, lists.classes, lists.subjects]);

  const trackLevelIds = useMemo(() => {
    const ids = new Set<number>();
    for (const l of trackOptionsState.options?.levels ?? []) {
      if (l.supports_tracks) ids.add(l.id);
    }
    return ids;
  }, [trackOptionsState.options?.levels]);

  const filterLevelId = parseNumericFilter(searchParams, 'level');
  const filterClassId = parseNumericFilter(searchParams, 'class_id') ?? parseNumericFilter(searchParams, 'class');
  const searchQuery = searchParams.get('q') ?? '';
  const filterMode = (searchParams.get('filter') as LevelFilterMode) || 'all';
  const cycleRaw = searchParams.get('cycle');
  const cycleId = cycleRaw ? Number(cycleRaw) : null;

  const { openFromAction, dismissActionParam } = useDrawerActionParam('add');
  const levelsAction = useDrawerActionParam('add-levels');

  function closeDrawer() {
    setDrawer(null);
    dismissActionParam();
  }

  function refreshAll() {
    lists.reload();
    readinessState.reload();
    trackOptionsState.reload();
  }

  function handleLevelsEnabled(outcome: {
    enabledCount: number;
    newSchoolLevelIds: number[];
    fullSuccess: boolean;
    classesCreated?: number;
    createFirstClass?: boolean;
  }) {
    refreshAll();
    const autoCreated = (outcome.classesCreated ?? 0) > 0;
    const shouldPromptManualClass =
      !autoCreated && outcome.createFirstClass !== true && outcome.enabledCount > 0;
    setNextClassLevelId(
      shouldPromptManualClass ? (outcome.newSchoolLevelIds[0] ?? null) : null,
    );
  }

  const createMode = drawer?.mode === 'create' || openFromAction;
  const levelsOpen = levelsDrawerOpen || levelsAction.openFromAction;

  const filteredGroups = useMemo(() => {
    let groups = filterLevelGroups(levelGroups, {
      search: searchQuery,
      filter: filterMode,
      cycleId: Number.isFinite(cycleId) ? cycleId : null,
      trackLevelIds,
    });
    if (filterLevelId) {
      groups = groups.filter((g) => g.id === filterLevelId);
    }
    return groups;
  }, [levelGroups, searchQuery, filterMode, cycleId, trackLevelIds, filterLevelId]);

  const totalStudents = useMemo(
    () => levelGroups.reduce((sum, g) => sum + g.studentCount, 0),
    [levelGroups],
  );

  const batchLevel = batchLevelId
    ? lists.levels.find((l) => l.id === batchLevelId) ?? null
    : null;

  const headerActions = canManage ? (
    <button
      type="button"
      className="btn btn--primary academic-classes-hero__add-btn"
      onClick={() => setLevelsDrawerOpen(true)}
    >
      <IconPlus size={18} aria-hidden />
      {t('admin.academicSetup.guided.addLevels')}
    </button>
  ) : undefined;

  const statChips = [
    {
      tone: 'levels' as const,
      value: levelGroups.length,
      label: t('admin.academicSetup.classesStatLevels'),
    },
    {
      tone: 'classes' as const,
      value: lists.classes.length,
      label: t('admin.academicSetup.classesStatClasses'),
    },
    {
      tone: 'students' as const,
      value: totalStudents,
      label: t('admin.academicSetup.classesStatStudents'),
    },
  ];

  const levelsDrawer = (
    <ReferenceLevelsDrawer
      open={levelsOpen}
      onClose={() => {
        setLevelsDrawerOpen(false);
        levelsAction.dismissActionParam();
      }}
      onEnabled={handleLevelsEnabled}
      canManageClasses={canManage}
      onCreateClassForLevel={(schoolLevelId, schoolTrackId) => {
        setLevelsDrawerOpen(false);
        levelsAction.dismissActionParam();
        setDrawer({
          mode: 'create',
          levelId: schoolLevelId,
          trackId: schoolTrackId,
        });
      }}
    />
  );

  if (lists.loading) {
    return (
      <>
        <ClassesPageHero title={t('admin.academicSetup.classesPageTitle')} skeleton />
        <LoadingState label={t('common.loading')} />
        {levelsDrawer}
      </>
    );
  }

  if (lists.error) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.classesPageTitle')} />
        <ErrorState error={lists.error} onRetry={refreshAll} />
        {levelsDrawer}
      </>
    );
  }

  if (!lists.levels.length) {
    return (
      <>
        <ClassesPageHero
          title={t('admin.academicSetup.classesPageTitle')}
          subtitle={t('admin.academicSetup.classesPageSubtitle')}
          actions={headerActions}
        />
        <EmptyState
          title={t('admin.academicSetup.guided.noLevelsTitle')}
          description={t('admin.academicSetup.guided.noLevelsDesc')}
        />
        {levelsDrawer}
      </>
    );
  }

  return (
    <div className="academic-classes-page">
      <ClassesPageHero
        title={t('admin.academicSetup.classesPageTitle')}
        subtitle={t('admin.academicSetup.classesPageSubtitle')}
        statChips={statChips}
        actions={headerActions}
        toolbar={<LevelsToolbar groups={levelGroups} />}
      />

      {nextClassLevelId && (
        <div className="academic-setup-next-step__card" role="status">
          <div>
            <strong>{t('admin.academicSetup.guided.nextStepCreateClasses')}</strong>
            <p className="tiny muted mt-2">{t('admin.academicSetup.guided.nextStepCreateClassesDesc')}</p>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              setDrawer({ mode: 'create', levelId: nextClassLevelId });
              setNextClassLevelId(null);
            }}
          >
            {t('admin.academicSetup.createFirstClass')}
          </button>
        </div>
      )}

      <div className="academic-setup-classes-surface">
        <LevelsByCycleList
          groups={filteredGroups}
          searchQuery={searchQuery}
          focusLevelId={filterLevelId}
          selectedClassId={filterClassId}
          canManage={canManage}
          trackLevels={trackOptionsState.options?.levels ?? []}
          subjectCountsByLevel={subjectCountsByLevel}
          onAddClass={(levelId) => setDrawer({ mode: 'create', levelId })}
          onBatchClasses={canManage ? (levelId) => setBatchLevelId(levelId) : undefined}
          onLevelRemoved={refreshAll}
          onClassRemoved={refreshAll}
          onEditClass={(cls) => setDrawer({ mode: 'edit', cls })}
          onSelectClass={(cls) => setDrawer({ mode: 'view', cls })}
        />
      </div>

      <ClassDrawer
        open={!!drawer || openFromAction}
        mode={createMode ? 'create' : drawer?.mode ?? 'view'}
        cls={drawer && 'cls' in drawer ? drawer.cls : undefined}
        defaultLevelId={drawer && 'levelId' in drawer ? drawer.levelId : undefined}
        defaultTrackId={drawer && 'trackId' in drawer ? drawer.trackId : undefined}
        onClose={closeDrawer}
        onSaved={refreshAll}
      />
      {batchLevel && (
        <BatchClassDrawer
          open={!!batchLevel}
          level={batchLevel}
          trackLevels={trackOptionsState.options?.levels ?? []}
          onClose={() => setBatchLevelId(null)}
          onSaved={refreshAll}
        />
      )}
      {levelsDrawer}
    </div>
  );
}
