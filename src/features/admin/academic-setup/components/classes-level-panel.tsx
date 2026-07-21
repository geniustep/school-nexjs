'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IconPlus, IconSearch } from '@/components/icons/admin-icons';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { LevelGroup } from '../types';
import type { SchoolClass } from '@/types/class';
import { formatAcademicLevelLabel } from '../utils/format-academic-label';
import {
  filterLevelGroups,
  uniqueCycles,
  type LevelFilterMode,
} from '../utils/level-filters';
import { computeLevelStatus } from '../utils/level-status';
import { LevelClassGroup } from './level-class-group';

function pickInitialLevelId(
  groups: LevelGroup[],
  focusLevelId: number | null,
): number | null {
  if (focusLevelId != null && groups.some((g) => g.id === focusLevelId)) {
    return focusLevelId;
  }
  const needsClasses = groups.find(
    (g) => (g.classes_count ?? g.classes.length) === 0,
  );
  if (needsClasses) return needsClasses.id;
  return groups[0]?.id ?? null;
}

export function ClassesLevelPanel({
  groups,
  canManage,
  trackLevels,
  subjectCountsByLevel,
  trackLevelIds,
  focusLevelId = null,
  selectedClassId = null,
  onAddClass,
  onBatchClasses,
  onLevelRemoved,
  onClassRemoved,
  onEditClass,
  onSelectClass,
}: {
  groups: LevelGroup[];
  canManage: boolean;
  trackLevels: import('../utils/guided-flow').TrackLevelRef[];
  subjectCountsByLevel: Map<number, number>;
  trackLevelIds: Set<number>;
  focusLevelId?: number | null;
  selectedClassId?: number | null;
  onAddClass: (levelId: number) => void;
  onBatchClasses?: (levelId: number) => void;
  onLevelRemoved: () => void;
  onClassRemoved?: () => void;
  onEditClass?: (cls: SchoolClass) => void;
  onSelectClass: (cls: SchoolClass) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const filterMode = (searchParams.get('filter') as LevelFilterMode) || 'all';
  const cycleRaw = searchParams.get('cycle');
  const cycleId = cycleRaw ? Number(cycleRaw) : null;

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const cycles = useMemo(() => uniqueCycles(groups), [groups]);

  const filteredGroups = useMemo(
    () =>
      filterLevelGroups(groups, {
        search,
        filter: filterMode,
        cycleId: Number.isFinite(cycleId) ? cycleId : null,
        trackLevelIds,
      }),
    [groups, search, filterMode, cycleId, trackLevelIds],
  );

  const counts = useMemo(() => {
    const base = filterLevelGroups(groups, {
      search,
      filter: 'all',
      cycleId: Number.isFinite(cycleId) ? cycleId : null,
      trackLevelIds,
    });
    return {
      all: base.length,
      without: base.filter((g) => (g.classes_count ?? g.classes.length) === 0).length,
      withClasses: base.filter((g) => (g.classes_count ?? g.classes.length) > 0).length,
      needsReview: base.filter(
        (g) => g.needsReview > 0 || (g.classes_count ?? g.classes.length) === 0,
      ).length,
    };
  }, [groups, search, cycleId, trackLevelIds]);

  const [levelId, setLevelId] = useState<number | null>(() =>
    pickInitialLevelId(filteredGroups, focusLevelId),
  );

  useEffect(() => {
    setLevelId((prev) => {
      if (prev != null && filteredGroups.some((g) => g.id === prev)) return prev;
      return pickInitialLevelId(filteredGroups, focusLevelId);
    });
  }, [filteredGroups, focusLevelId]);

  useEffect(() => {
    if (focusLevelId == null) return;
    if (filteredGroups.some((g) => g.id === focusLevelId)) {
      setLevelId(focusLevelId);
    }
  }, [focusLevelId, filteredGroups]);

  const activeGroup =
    filteredGroups.find((g) => g.id === levelId) ?? filteredGroups[0] ?? null;

  function selectLevel(id: number) {
    setLevelId(id);
    updateParams({ level: String(id) });
    document
      .getElementById(`classes-level-chip-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  function jumpToFirstWithoutClasses() {
    const first = filteredGroups.find(
      (g) => (g.classes_count ?? g.classes.length) === 0,
    );
    if (!first) {
      updateParams({ filter: 'without_classes' });
      return;
    }
    updateParams({ filter: 'without_classes', level: String(first.id) });
    setLevelId(first.id);
  }

  if (!groups.length) return null;

  return (
    <div className="academic-classes-panel">
      {counts.without > 0 && (
        <div className="academic-classes-progress" role="status">
          <div className="academic-classes-progress__copy">
            <strong className="academic-classes-progress__title">
              {t('admin.academicSetup.classesPendingBanner', {
                count: counts.without,
              })}
            </strong>
            <p className="academic-classes-progress__desc">
              {t('admin.academicSetup.classesPendingBannerDesc')}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn btn--primary btn--sm academic-classes-progress__cta"
              onClick={() => {
                jumpToFirstWithoutClasses();
                const first = groups.find(
                  (g) => (g.classes_count ?? g.classes.length) === 0,
                );
                if (first) onAddClass(first.id);
              }}
            >
              <IconPlus size={16} aria-hidden />
              {t('admin.academicSetup.createFirstClass')}
            </button>
          )}
        </div>
      )}

      <div className="academic-classes-rail">
        <label className="academic-classes-rail__search">
          <span className="academic-classes-rail__search-icon" aria-hidden>
            <IconSearch size={18} />
          </span>
          <span className="academic-setup-sr-only">
            {t('admin.academicSetup.levelsSearchPlaceholder')}
          </span>
          <input
            type="search"
            className="input academic-classes-rail__search-input"
            placeholder={t('admin.academicSetup.levelsSearchPlaceholder')}
            value={search}
            onChange={(e) => updateParams({ q: e.target.value || null })}
          />
        </label>

        {cycles.length > 1 && (
          <div
            className="academic-classes-rail__filters"
            role="group"
            aria-label={t('admin.academicSetup.guided.cycleFilter')}
          >
            <button
              type="button"
              className={`academic-classes-rail__filter${cycleId == null ? ' is-active' : ''}`}
              aria-pressed={cycleId == null}
              onClick={() => updateParams({ cycle: null })}
            >
              {t('admin.academicSetup.guided.allCycles')}
            </button>
            {cycles.map((cycle) => {
              const count = groups.filter((g) => g.cycle?.id === cycle.id).length;
              return (
                <button
                  key={cycle.id}
                  type="button"
                  className={`academic-classes-rail__filter${
                    cycleId === cycle.id ? ' is-active' : ''
                  }`}
                  aria-pressed={cycleId === cycle.id}
                  onClick={() => updateParams({ cycle: String(cycle.id) })}
                >
                  {cycle.name}
                  {count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
        )}

        <div
          className="academic-classes-rail__filters"
          role="group"
          aria-label={t('admin.academicSetup.levelsFilterLabel')}
        >
          {(
            [
              ['all', t('admin.academicSetup.classesFilterAll', { count: counts.all })],
              [
                'without_classes',
                t('admin.academicSetup.classesFilterWithout', { count: counts.without }),
              ],
              [
                'with_classes',
                t('admin.academicSetup.classesFilterWith', { count: counts.withClasses }),
              ],
              [
                'needs_review',
                t('admin.academicSetup.classesFilterNeedsReview', {
                  count: counts.needsReview,
                }),
              ],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`academic-classes-rail__filter${
                (value === 'all' ? filterMode === 'all' : filterMode === value)
                  ? ' is-active'
                  : ''
              }`}
              aria-pressed={value === 'all' ? filterMode === 'all' : filterMode === value}
              onClick={() =>
                updateParams({ filter: value === 'all' ? null : value })
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="academic-classes-rail__chips"
          role="listbox"
          aria-label={t('admin.selectLevel')}
        >
          {filteredGroups.length === 0 ? (
            <p className="academic-classes-rail__empty muted tiny">
              {t('admin.academicSetup.levelsFilterEmpty')}
            </p>
          ) : (
            filteredGroups.map((group) => {
              const label = formatAcademicLevelLabel(group, locale);
              const selected = group.id === activeGroup?.id;
              const classCount = group.classes_count ?? group.classes.length;
              const needsClasses = classCount === 0;
              const status = computeLevelStatus(
                group,
                subjectCountsByLevel.get(group.id) ?? 0,
              );
              return (
                <button
                  key={group.id}
                  id={`classes-level-chip-${group.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={[
                    'academic-classes-level-chip',
                    selected ? 'is-selected' : '',
                    needsClasses ? 'is-pending' : 'is-ready',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectLevel(group.id)}
                >
                  <span className="academic-classes-level-chip__name">
                    {label.primary}
                  </span>
                  {label.secondary && (
                    <span className="academic-classes-level-chip__code" dir="ltr">
                      {label.secondary}
                    </span>
                  )}
                  <span className="academic-classes-level-chip__badge">
                    {needsClasses
                      ? t('admin.academicSetup.classesChipNeedsClasses')
                      : t('admin.academicSetup.classesChipCount', {
                          count: classCount,
                        })}
                  </span>
                  {status === 'needs_review' && !needsClasses && (
                    <span className="academic-classes-level-chip__hint">
                      {t('admin.academicSetup.levelStatus.needs_review')}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {activeGroup && (
        <LevelClassGroup
          group={activeGroup}
          selectedClassId={selectedClassId}
          canManage={canManage}
          trackLevels={trackLevels}
          subjectCount={subjectCountsByLevel.get(activeGroup.id) ?? 0}
          onAddClass={onAddClass}
          onBatchClasses={onBatchClasses}
          onLevelRemoved={onLevelRemoved}
          onClassRemoved={onClassRemoved}
          onEditClass={onEditClass}
          onSelectClass={onSelectClass}
        />
      )}
    </div>
  );
}
