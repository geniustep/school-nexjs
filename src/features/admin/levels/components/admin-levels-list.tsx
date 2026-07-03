'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import {
  normalizeCycleCode,
  ORPHAN_CYCLE_ID,
} from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import { formatAcademicLevelLabel } from '@/features/admin/academic-setup/utils/format-academic-label';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level } from '@/types/class';
import {
  computeLevelsOverview,
  filterLevelsByCycle,
  filterLevelsForSearch,
  groupLevelsListByCycle,
  uniqueCycleCodes,
} from '../utils/levels-list-utils';
import '../admin-levels.css';

const CYCLE_VISUAL: Record<string, { icon: string; accent: string }> = {
  preschool: { icon: '🌱', accent: '#86efac' },
  primary: { icon: '📗', accent: '#93c5fd' },
  middle_school: { icon: '📘', accent: '#fcd34d' },
  middle: { icon: '📘', accent: '#fcd34d' },
  secondary: { icon: '🎓', accent: '#c4b5fd' },
  high_school: { icon: '🎓', accent: '#c4b5fd' },
  high: { icon: '🎓', accent: '#c4b5fd' },
  other: { icon: '📋', accent: '#cbd5e1' },
};

function cycleVisual(code?: string | null) {
  const key = normalizeCycleCode(code);
  return CYCLE_VISUAL[key] ?? CYCLE_VISUAL.other;
}

function cycleTitle(
  cycle: { id: number; code: string; name: string },
  t: ReturnType<typeof useT>,
): string {
  if (cycle.id === ORPHAN_CYCLE_ID) {
    return t('admin.academicSetup.guided.category.other');
  }
  const key = normalizeCycleCode(cycle.code);
  const i18nKey = `admin.academicSetup.guided.category.${key}` as const;
  const localized = t(i18nKey);
  if (localized !== i18nKey) return localized;
  return cycle.name;
}

function LevelCard({ level }: { level: Level }) {
  const t = useT();
  const { locale } = useLocale();
  const label = formatAcademicLevelLabel(level, locale);
  const classes = level.classes_count ?? level.usage?.classes ?? 0;
  const students = level.usage?.students ?? 0;
  const subjects = level.subjects_count ?? 0;
  const tracks = level.tracks_count ?? 0;

  return (
    <Link href={`/admin/levels/${level.id}`} className="admin-levels-card">
      <div className="admin-levels-card__head">
        <h3 className="admin-levels-card__name">{label.primary}</h3>
        {label.secondary ? (
          <span className="admin-levels-card__code mono" dir="ltr">
            {label.secondary}
          </span>
        ) : null}
      </div>
      <p className="admin-levels-card__meta">
        {t('admin.academicSetup.levelStats', { classes, students, subjects })}
      </p>
      <div className="admin-levels-card__tags">
        {level.supports_tracks && tracks > 0 ? (
          <span className="admin-levels-card__tag">
            {t('admin.academicSetup.tracksCount', { count: tracks })}
          </span>
        ) : null}
        {level.active === false ? (
          <span className="admin-levels-card__tag">{t('admin.academicSetup.classStatus.inactive')}</span>
        ) : null}
      </div>
      <span className="admin-levels-card__arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

export function AdminLevelsList({ levels }: { levels: Level[] }) {
  const t = useT();
  const user = useSession();
  const [search, setSearch] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);

  const overview = useMemo(() => computeLevelsOverview(levels), [levels]);
  const cycleCodes = useMemo(() => uniqueCycleCodes(levels), [levels]);

  const filtered = useMemo(() => {
    let next = filterLevelsForSearch(levels, debouncedSearch);
    next = filterLevelsByCycle(next, cycleFilter);
    return next;
  }, [levels, debouncedSearch, cycleFilter]);

  const grouped = useMemo(() => groupLevelsListByCycle(filtered), [filtered]);
  const hasActiveFilters = debouncedSearch.trim().length > 0 || !!cycleFilter;

  function resetFilters() {
    setSearch('');
    setCycleFilter('');
  }

  return (
    <div className="admin-levels-page">
      <header className="admin-levels-hero">
        <div className="admin-levels-hero__glow" aria-hidden="true" />
        <div className="admin-levels-hero__content">
          <div className="admin-levels-hero__intro">
            <span className="admin-levels-hero__eyebrow">
              {user.school?.name ?? t('admin.cmd.defaultSchool')}
            </span>
            <h1 className="admin-levels-hero__title">{t('nav.levels')}</h1>
            <p className="admin-levels-hero__subtitle">{t('admin.levelsListDesc')}</p>
            <div className="admin-levels-hero__pills">
              <span className="admin-levels-pill">
                <span aria-hidden="true">📚</span>
                {t('admin.academicSetup.subjectsPageStats', {
                  subjects: overview.subjectCount,
                  levels: overview.levelCount,
                })}
              </span>
            </div>
          </div>
          <div className="admin-levels-hero__actions">
            <AdminListActions
              addHref="/admin/levels/new"
              addLabel={t('admin.addLevel')}
              managePermission="manage_classes"
              exportPath={endpoints.admin.levelsExport}
              exportFilename="levels.csv"
            />
          </div>
        </div>
      </header>

      <section className="admin-levels-stats" aria-label={t('nav.levels')}>
        <div className="admin-levels-stat admin-levels-stat--accent">
          <span className="admin-levels-stat__icon" aria-hidden="true">
            📚
          </span>
          <span className="admin-levels-stat__value">{overview.levelCount}</span>
          <span className="admin-levels-stat__label">{t('nav.levels')}</span>
        </div>
        <div className="admin-levels-stat">
          <span className="admin-levels-stat__icon" aria-hidden="true">
            🏫
          </span>
          <span className="admin-levels-stat__value">{overview.classCount}</span>
          <span className="admin-levels-stat__label">{t('nav.classes')}</span>
        </div>
        <div className="admin-levels-stat">
          <span className="admin-levels-stat__icon" aria-hidden="true">
            📖
          </span>
          <span className="admin-levels-stat__value">{overview.subjectCount}</span>
          <span className="admin-levels-stat__label">{t('nav.subjects')}</span>
        </div>
        <div className="admin-levels-stat">
          <span className="admin-levels-stat__icon" aria-hidden="true">
            ✓
          </span>
          <span className="admin-levels-stat__value">{overview.activeCount}</span>
          <span className="admin-levels-stat__label">{t('states.active')}</span>
        </div>
      </section>

      <section className="admin-levels-toolbar" aria-label={t('admin.academicSetup.levelsFilterLabel')}>
        <div className="admin-levels-toolbar__row">
          <label className="admin-levels-search">
            <span className="admin-levels-search__icon" aria-hidden="true">
              🔍
            </span>
            <input
              className="input admin-levels-search__input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.academicSetup.levelsSearchPlaceholder')}
              aria-label={t('common.search')}
            />
            {search ? (
              <button
                type="button"
                className="admin-levels-search__clear"
                onClick={() => setSearch('')}
                aria-label={t('common.clear')}
              >
                ×
              </button>
            ) : null}
          </label>
          {hasActiveFilters ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              {t('admin.academicSetup.levelsFilterClear')}
            </button>
          ) : null}
        </div>

        {cycleCodes.length > 1 ? (
          <div className="admin-levels-toolbar__quick">
            <button
              type="button"
              className={cn('admin-levels-cycle-chip', !cycleFilter && 'admin-levels-cycle-chip--active')}
              onClick={() => setCycleFilter('')}
            >
              {t('admin.academicSetup.levelsFilter.all')}
            </button>
            {cycleCodes.map((code) => {
              const visual = cycleVisual(code);
              return (
                <button
                  key={code}
                  type="button"
                  className={cn(
                    'admin-levels-cycle-chip',
                    cycleFilter === code && 'admin-levels-cycle-chip--active',
                  )}
                  onClick={() => setCycleFilter(cycleFilter === code ? '' : code)}
                >
                  <span aria-hidden="true">{visual.icon}</span>
                  {t(`admin.academicSetup.guided.category.${code}` as const) !==
                  `admin.academicSetup.guided.category.${code}`
                    ? t(`admin.academicSetup.guided.category.${code}` as const)
                    : code}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {filtered.length === 0 ? (
        <div className="admin-levels-empty">
          <span className="admin-levels-empty__icon" aria-hidden="true">
            🔍
          </span>
          <p className="admin-levels-empty__title">
            {levels.length === 0 ? t('admin.noLevels') : t('admin.academicSetup.guided.noLevelsFilterMatch')}
          </p>
          <p className="admin-levels-empty__desc">
            {levels.length === 0
              ? t('admin.levelsListDesc')
              : t('admin.academicSetup.levelsFilterEmpty')}
          </p>
          {hasActiveFilters ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={resetFilters}>
              {t('admin.academicSetup.levelsFilterClear')}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="admin-levels-sections">
            {grouped.map(({ cycle, levels: cycleLevels, classCount }) => {
              const visual = cycleVisual(cycle.code);
              return (
                <section
                  key={cycle.id}
                  className="admin-levels-cycle"
                  style={{ '--cycle-accent': visual.accent } as CSSProperties}
                >
                  <div className="admin-levels-cycle__head">
                    <div className="admin-levels-cycle__title-wrap">
                      <span className="admin-levels-cycle__icon" aria-hidden="true">
                        {visual.icon}
                      </span>
                      <div>
                        <h2 className="admin-levels-cycle__title">{cycleTitle(cycle, t)}</h2>
                        <p className="admin-levels-cycle__meta">
                          {t('admin.academicSetup.cycleGroupStats', {
                            levels: cycleLevels.length,
                            classes: classCount,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="admin-levels-cycle__grid">
                    {cycleLevels.map((level) => (
                      <LevelCard key={level.id} level={level} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <footer className="admin-levels-footer">
            {t('admin.academicSetup.subjectsPageStats', {
              subjects: overview.subjectCount,
              levels: filtered.length,
            })}
          </footer>
        </>
      )}
    </div>
  );
}
