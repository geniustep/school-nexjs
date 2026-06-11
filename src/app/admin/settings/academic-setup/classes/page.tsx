'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState, EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { BatchClassDrawer } from '@/features/admin/academic-setup/components/batch-class-drawer';
import { ClassDrawer } from '@/features/admin/academic-setup/components/class-drawer';
import { LevelClassGroup } from '@/features/admin/academic-setup/components/level-class-group';
import { ReferenceLevelsDrawer } from '@/features/admin/academic-setup/components/reference-levels-drawer';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useDrawerActionParam } from '@/features/admin/academic-setup/hooks/use-drawer-action-param';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { useTrackOptions } from '@/features/admin/academic-setup/hooks/use-tracks';
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
    | { mode: 'create'; levelId?: number }
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

  const filterLevelId = parseNumericFilter(searchParams, 'level');
  const filterClassId = parseNumericFilter(searchParams, 'class_id') ?? parseNumericFilter(searchParams, 'class');
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
  }) {
    refreshAll();
    if (outcome.newSchoolLevelIds[0]) {
      setNextClassLevelId(outcome.newSchoolLevelIds[0]);
    }
  }

  const createMode = drawer?.mode === 'create' || openFromAction;
  const levelsOpen = levelsDrawerOpen || levelsAction.openFromAction;

  const visibleGroups = filterLevelId
    ? levelGroups.filter((g) => g.id === filterLevelId)
    : levelGroups;

  const batchLevel = batchLevelId
    ? lists.levels.find((l) => l.id === batchLevelId) ?? null
    : null;

  const headerActions = canManage ? (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        onClick={() => setLevelsDrawerOpen(true)}
      >
        + {t('admin.academicSetup.guided.addLevels')}
      </button>
      {lists.levels.length > 0 && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setDrawer({ mode: 'create' })}
          disabled={!lists.levels.length}
        >
          + {t('admin.addClass')}
        </button>
      )}
    </div>
  ) : undefined;

  const levelsDrawer = (
    <ReferenceLevelsDrawer
      open={levelsOpen}
      schoolLevels={lists.levels}
      onClose={() => {
        setLevelsDrawerOpen(false);
        levelsAction.dismissActionParam();
      }}
      onEnabled={handleLevelsEnabled}
    />
  );

  if (lists.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.classes')} />
        <LoadingState label={t('common.loading')} />
        {levelsDrawer}
      </>
    );
  }

  if (lists.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.classes')} />
        <ErrorState error={lists.error} onRetry={refreshAll} />
        {levelsDrawer}
      </>
    );
  }

  if (!lists.levels.length) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.classes')} actions={headerActions} />
        <EmptyState
          icon="📚"
          title={t('admin.academicSetup.guided.noLevelsTitle')}
          description={t('admin.academicSetup.guided.noLevelsDesc')}
        />
        {levelsDrawer}
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('admin.academicSetup.nav.classes')} actions={headerActions} />
      {nextClassLevelId && (
        <div
          className="academic-setup-next-step__card"
          role="status"
        >
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
            {t('admin.academicSetup.guided.actionAddClasses')}
          </button>
        </div>
      )}
      <div className="col" style={{ gap: 12 }}>
        {visibleGroups.map((group) => (
          <LevelClassGroup
            key={group.id}
            group={group}
            selectedClassId={filterClassId}
            canManage={canManage}
            trackLevels={trackOptionsState.options?.levels ?? []}
            subjectCount={subjectCountsByLevel.get(group.id) ?? 0}
            onAddClass={(levelId) => setDrawer({ mode: 'create', levelId })}
            onBatchClasses={canManage ? (levelId) => setBatchLevelId(levelId) : undefined}
            onLevelRemoved={refreshAll}
            onSelectClass={(cls) => setDrawer({ mode: 'view', cls })}
          />
        ))}
      </div>
      <ClassDrawer
        open={!!drawer || openFromAction}
        mode={createMode ? 'create' : drawer?.mode ?? 'view'}
        cls={drawer && 'cls' in drawer ? drawer.cls : undefined}
        defaultLevelId={drawer && 'levelId' in drawer ? drawer.levelId : undefined}
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
    </>
  );
}
