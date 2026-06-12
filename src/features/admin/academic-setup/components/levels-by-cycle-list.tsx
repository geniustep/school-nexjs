'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import type { LevelGroup } from '../types';
import type { SchoolClass } from '@/types/class';
import {
  buildInitialOpenCycleIds,
  findCycleIdForLevel,
  groupLevelsByCycle,
  ORPHAN_CYCLE_ID,
} from '../utils/group-and-sort-levels';
import { LevelClassGroup } from './level-class-group';

const MOBILE_MEDIA = '(max-width: 640px)';

export function LevelsByCycleList({
  groups,
  searchQuery,
  focusLevelId,
  selectedClassId,
  canManage,
  trackLevels,
  subjectCountsByLevel,
  onAddClass,
  onBatchClasses,
  onLevelRemoved,
  onSelectClass,
}: {
  groups: LevelGroup[];
  searchQuery: string;
  focusLevelId: number | null;
  selectedClassId: number | null;
  canManage: boolean;
  trackLevels: import('../utils/guided-flow').TrackLevelRef[];
  subjectCountsByLevel: Map<number, number>;
  onAddClass: (levelId: number) => void;
  onBatchClasses?: (levelId: number) => void;
  onLevelRemoved: () => void;
  onSelectClass: (cls: SchoolClass) => void;
}) {
  const t = useT();
  const searchActive = searchQuery.trim().length > 0;
  const cycleGroups = useMemo(() => groupLevelsByCycle(groups), [groups]);
  const [isMobile, setIsMobile] = useState(false);
  const [openCycleIds, setOpenCycleIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const focusCycleId = focusLevelId
      ? findCycleIdForLevel(cycleGroups, focusLevelId)
      : null;
    setOpenCycleIds(
      buildInitialOpenCycleIds(cycleGroups, {
        searchActive,
        focusCycleId,
        isMobile,
      }),
    );
  }, [cycleGroups, searchActive, focusLevelId, isMobile]);

  if (!cycleGroups.length) {
    return (
      <EmptyState
        icon="🔍"
        title={t('admin.academicSetup.guided.noLevelsFilterMatch')}
        description={t('admin.academicSetup.levelsFilterEmpty')}
      />
    );
  }

  function toggleCycle(cycleId: number) {
    setOpenCycleIds((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) next.delete(cycleId);
      else next.add(cycleId);
      return next;
    });
  }

  function cycleTitle(cycle: { id: number; name: string }): string {
    if (cycle.id === ORPHAN_CYCLE_ID) {
      return t('admin.academicSetup.guided.category.other');
    }
    return cycle.name;
  }

  return (
    <div className="academic-cycle-groups">
      {cycleGroups.map((section) => {
        const open = openCycleIds.has(section.cycle.id);
        const panelId = `cycle-panel-${section.cycle.id}`;

        return (
          <section
            key={section.cycle.id}
            className="academic-cycle-group"
            data-open={open || undefined}
          >
            <header className="academic-cycle-group__header">
              <button
                type="button"
                className="academic-cycle-group__toggle"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggleCycle(section.cycle.id)}
              >
                <span
                  className="academic-cycle-group__chevron"
                  data-open={open || undefined}
                  aria-hidden
                />
                <span className="academic-cycle-group__copy">
                  <strong className="academic-cycle-group__title">
                    {cycleTitle(section.cycle)}
                  </strong>
                  <span className="academic-cycle-group__stats">
                    {t('admin.academicSetup.cycleGroupStats', {
                      levels: section.levelCount,
                      classes: section.classCount,
                    })}
                  </span>
                </span>
              </button>
            </header>

            {open && (
              <div id={panelId} className="academic-cycle-group__body">
                {section.levels.map((group) => (
                  <LevelClassGroup
                    key={group.id}
                    group={group}
                    selectedClassId={selectedClassId}
                    canManage={canManage}
                    trackLevels={trackLevels}
                    subjectCount={subjectCountsByLevel.get(group.id) ?? 0}
                    onAddClass={onAddClass}
                    onBatchClasses={onBatchClasses}
                    onLevelRemoved={onLevelRemoved}
                    onSelectClass={onSelectClass}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
