'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { formatAcademicClassLabel, formatAcademicLevelLabel } from '@/features/admin/academic-setup/utils/format-academic-label';
import {
  ORPHAN_CYCLE_ID,
  normalizeCycleCode,
} from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import {
  classesBrowserHasActiveQuery,
  computeClassesOverview,
  filterClassesForBrowser,
  groupClassesByCycle,
  resolveClassesBrowserEmptyVariant,
  type GroupedClassesByCycle,
} from '@/features/admin/classes/utils/group-classes-by-level';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { Level, SchoolClass } from '@/types/class';
import '../admin-classes.css';

const MOBILE_MEDIA = '(max-width: 720px)';

const CYCLE_VISUAL: Record<string, { icon: string; tone: string }> = {
  preschool: { icon: '🌱', tone: 'preschool' },
  primary: { icon: '📗', tone: 'primary' },
  middle_school: { icon: '📘', tone: 'middle' },
  middle: { icon: '📘', tone: 'middle' },
  secondary: { icon: '🎓', tone: 'secondary' },
  high_school: { icon: '🎓', tone: 'secondary' },
  high: { icon: '🎓', tone: 'secondary' },
  other: { icon: '📋', tone: 'other' },
};

function cycleVisual(code?: string | null) {
  const key = normalizeCycleCode(code);
  return CYCLE_VISUAL[key] ?? CYCLE_VISUAL.other;
}

function cycleTitle(
  cycle: GroupedClassesByCycle['cycle'],
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

function capacityPercent(studentCount: number, capacity: number | null): number | null {
  if (!capacity || capacity <= 0) return null;
  return Math.min(100, Math.round((studentCount / capacity) * 100));
}

function ClassCard({
  cls,
  onNavigate,
}: {
  cls: SchoolClass;
  onNavigate: (id: number) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const label = formatAcademicClassLabel(cls, locale);
  const studentCount = cls.student_count ?? 0;
  const fill = capacityPercent(studentCount, cls.capacity);
  const isActive = cls.status === 'active';
  const overCapacity = !!cls.capacity && cls.capacity > 0 && studentCount > cls.capacity;

  return (
    <button
      type="button"
      className="classes-browser__class-card"
      data-status={isActive ? 'active' : 'inactive'}
      data-over-capacity={overCapacity || undefined}
      onClick={() => onNavigate(cls.id)}
    >
      <div className="classes-browser__class-card-head">
        <strong className="classes-browser__class-name" dir="auto" title={label.primary}>
          {label.primary}
        </strong>
        <Badge tone={isActive ? 'green' : 'slate'}>{statusLabel(t, cls.status)}</Badge>
      </div>

      {label.secondary ? (
        <span className="classes-browser__class-code mono" dir="ltr">
          {label.secondary}
        </span>
      ) : null}

      {cls.track?.name ? (
        <span className="classes-browser__class-track" dir="auto" title={cls.track.name}>
          {cls.track.name}
        </span>
      ) : null}

      <div className="classes-browser__class-stats">
        <span
          className="classes-browser__class-students"
          data-over-capacity={overCapacity || undefined}
        >
          <span className="classes-browser__class-students-icon" aria-hidden>
            👥
          </span>
          <span className="mono" dir="ltr">
            {studentCount}
            {cls.capacity ? ` / ${cls.capacity}` : ''}
          </span>
        </span>
        {cls.teachers?.length ? (
          <span className="classes-browser__class-teachers mono" dir="ltr">
            {cls.teachers.length} {t('nav.teachers')}
          </span>
        ) : null}
      </div>

      {fill != null ? (
        <div
          className="classes-browser__capacity"
          data-over-capacity={overCapacity || undefined}
          aria-hidden
        >
          <div className="classes-browser__capacity-bar" style={{ width: `${fill}%` }} />
        </div>
      ) : null}
    </button>
  );
}

export function AdminClassesBrowser({
  classes,
  levels,
}: {
  classes: SchoolClass[];
  levels: Level[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [academicYear, setAcademicYear] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [status, setStatus] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [openCycleIds, setOpenCycleIds] = useState<Set<number>>(() => new Set());

  const academicYears = useMemo(
    () =>
      [
        ...new Set(
          classes
            .map((cls) => cls.academic_year?.trim())
            .filter((value): value is string => !!value),
        ),
      ].sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }),
      ),
    [classes],
  );

  const statuses = useMemo(
    () => [...new Set(classes.map((cls) => cls.status).filter(Boolean))].sort(),
    [classes],
  );

  const structureClasses = useMemo(
    () => filterClassesForBrowser(classes, levels, { academicYear, status }),
    [classes, levels, academicYear, status],
  );

  const structureGroups = useMemo(
    () => groupClassesByCycle(structureClasses, levels),
    [structureClasses, levels],
  );

  const selectedCycleId = cycleId ? Number(cycleId) : null;
  const selectedLevelId = levelId ? Number(levelId) : null;

  const levelOptions = useMemo(
    () =>
      structureGroups
        .filter((section) => selectedCycleId == null || section.cycle.id === selectedCycleId)
        .flatMap((section) => section.levels),
    [structureGroups, selectedCycleId],
  );

  const filteredClasses = useMemo(
    () =>
      filterClassesForBrowser(classes, levels, {
        search: debouncedSearch,
        academicYear,
        cycleId: selectedCycleId,
        levelId: selectedLevelId,
        status,
      }),
    [
      classes,
      levels,
      debouncedSearch,
      academicYear,
      selectedCycleId,
      selectedLevelId,
      status,
    ],
  );

  const grouped = useMemo(
    () => groupClassesByCycle(filteredClasses, levels),
    [filteredClasses, levels],
  );

  const overview = useMemo(
    () => computeClassesOverview(filteredClasses, grouped),
    [filteredClasses, grouped],
  );

  const queryActive = classesBrowserHasActiveQuery({
    search: debouncedSearch,
    academicYear,
    cycleId: selectedCycleId,
    levelId: selectedLevelId,
    status,
  });
  const emptyVariant = resolveClassesBrowserEmptyVariant({
    totalCount: classes.length,
    filteredCount: filteredClasses.length,
    hasActiveQuery: queryActive,
  });

  useEffect(() => {
    if (selectedCycleId == null) return;
    if (!structureGroups.some((section) => section.cycle.id === selectedCycleId)) {
      setCycleId('');
      setLevelId('');
    }
  }, [structureGroups, selectedCycleId]);

  useEffect(() => {
    if (selectedLevelId == null) return;
    if (!levelOptions.some((level) => level.id === selectedLevelId)) setLevelId('');
  }, [levelOptions, selectedLevelId]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!grouped.length) {
      setOpenCycleIds(new Set());
      return;
    }

    if (queryActive) {
      setOpenCycleIds(new Set(grouped.map((section) => section.cycle.id)));
      return;
    }

    if (isMobile) {
      setOpenCycleIds(new Set([grouped[0].cycle.id]));
      return;
    }

    setOpenCycleIds(new Set(grouped.map((section) => section.cycle.id)));
  }, [grouped, queryActive, isMobile]);

  function toggleCycle(cycleIdToToggle: number) {
    setOpenCycleIds((prev) => {
      const next = new Set(prev);
      if (next.has(cycleIdToToggle)) next.delete(cycleIdToToggle);
      else next.add(cycleIdToToggle);
      return next;
    });
  }

  function clearFilters() {
    setSearch('');
    setAcademicYear('');
    setCycleId('');
    setLevelId('');
    setStatus('');
  }

  if (emptyVariant === 'no-data' && !classes.length) {
    return (
      <EmptyState
        icon="🏫"
        title={t('admin.classesBrowser.noData.title')}
        description={t('admin.classesBrowser.noData.description')}
      />
    );
  }

  return (
    <div className="classes-browser">
      <div className="classes-browser__toolbar">
        <div className="classes-browser__overview-block">
          <div className="classes-browser__overview-context" aria-live="polite">
            <span>
              {queryActive
                ? t('common.pagination.totalRecords', { total: filteredClasses.length })
                : t('admin.classesBrowser.overviewLabel')}
            </span>
            {queryActive ? (
              <span className="mono" dir="ltr">
                {filteredClasses.length} / {classes.length}
              </span>
            ) : null}
          </div>

          <div
            className="classes-browser__overview"
            aria-label={t('admin.classesBrowser.overviewLabel')}
          >
            <div className="classes-browser__stat">
              <span className="classes-browser__stat-value" dir="ltr">
                {overview.classCount}
              </span>
              <span className="classes-browser__stat-label">{t('nav.classes')}</span>
            </div>
            <div className="classes-browser__stat">
              <span className="classes-browser__stat-value" dir="ltr">
                {overview.levelCount}
              </span>
              <span className="classes-browser__stat-label">{t('nav.levels')}</span>
            </div>
            <div className="classes-browser__stat">
              <span className="classes-browser__stat-value" dir="ltr">
                {overview.studentCount}
              </span>
              <span className="classes-browser__stat-label">{t('nav.students')}</span>
            </div>
            <div className="classes-browser__stat">
              <span className="classes-browser__stat-value" dir="ltr">
                {overview.activeCount}
              </span>
              <span className="classes-browser__stat-label">
                {t('admin.classesBrowser.activeClasses')}
              </span>
            </div>
          </div>
        </div>

        <label className="classes-browser__search">
          <span className="classes-browser__search-icon" aria-hidden>
            🔍
          </span>
          <input
            className="input classes-browser__search-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.classesBrowser.searchPlaceholder')}
            aria-label={t('common.search')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            dir="auto"
          />
          {search ? (
            <button
              type="button"
              className="classes-browser__search-clear"
              onClick={() => setSearch('')}
              aria-label={t('admin.classesBrowser.clearSearch')}
            >
              ×
            </button>
          ) : null}
        </label>
      </div>

      <div className="classes-browser__filters">
        <label className="classes-browser__filter-field">
          <span>{t('academicContext.fields.academicYear')}</span>
          <select
            className="input classes-browser__filter-input"
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            disabled={!academicYears.length}
          >
            <option value="">{t('academicContext.fields.academicYear')}</option>
            {academicYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="classes-browser__filter-field">
          <span>{t('academicContext.fields.cycle')}</span>
          <select
            className="input classes-browser__filter-input"
            value={cycleId}
            onChange={(event) => {
              setCycleId(event.target.value);
              setLevelId('');
            }}
            disabled={!structureGroups.length}
          >
            <option value="">{t('academicContext.fields.cycle')}</option>
            {structureGroups.map((section) => (
              <option key={section.cycle.id} value={section.cycle.id}>
                {cycleTitle(section.cycle, t)}
              </option>
            ))}
          </select>
        </label>

        <label className="classes-browser__filter-field">
          <span>{t('academicContext.fields.level')}</span>
          <select
            className="input classes-browser__filter-input"
            value={levelId}
            onChange={(event) => setLevelId(event.target.value)}
            disabled={!levelOptions.length}
          >
            <option value="">{t('academicContext.fields.level')}</option>
            {levelOptions.map((level) => {
              const label = formatAcademicLevelLabel(level, locale);
              return (
                <option key={level.id} value={level.id}>
                  {label.primary}
                </option>
              );
            })}
          </select>
        </label>

        <label className="classes-browser__filter-field">
          <span>{t('common.status')}</span>
          <select
            className="input classes-browser__filter-input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={!statuses.length}
          >
            <option value="">{t('common.allStatuses')}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {statusLabel(t, value)}
              </option>
            ))}
          </select>
        </label>

        {queryActive ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm classes-browser__filters-clear"
            onClick={clearFilters}
          >
            {t('common.clear')}
          </button>
        ) : null}
      </div>

      <p className="classes-browser__journey-hint">{t('admin.classesBrowser.journeyHint')}</p>

      {grouped.length > 1 ? (
        <nav className="classes-browser__journey" aria-label={t('admin.classesBrowser.journeyLabel')}>
          {grouped.map((section, index) => {
            const visual = cycleVisual(section.cycle.code);
            const open = openCycleIds.has(section.cycle.id);
            return (
              <button
                key={section.cycle.id}
                type="button"
                className="classes-browser__journey-step"
                data-tone={visual.tone}
                data-active={open || undefined}
                onClick={() => toggleCycle(section.cycle.id)}
              >
                <span className="classes-browser__journey-index">{index + 1}</span>
                <span className="classes-browser__journey-icon" aria-hidden>
                  {visual.icon}
                </span>
                <span className="classes-browser__journey-copy">
                  <strong dir="auto">{cycleTitle(section.cycle, t)}</strong>
                  <span dir="ltr">{section.classCount}</span>
                </span>
              </button>
            );
          })}
        </nav>
      ) : null}

      {!grouped.length ? (
        <EmptyState
          icon="🔍"
          title={t('admin.classesBrowser.noMatch.title')}
          description={t('admin.classesBrowser.noMatch.description')}
          action={
            queryActive ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
                {t('common.clear')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="classes-browser__cycles">
          {grouped.map((section) => {
            const visual = cycleVisual(section.cycle.code);
            const open = openCycleIds.has(section.cycle.id);
            const panelId = `classes-cycle-${section.cycle.id}`;

            return (
              <section
                key={section.cycle.id}
                className="classes-browser__cycle"
                data-tone={visual.tone}
                data-open={open || undefined}
              >
                <header className="classes-browser__cycle-header">
                  <button
                    type="button"
                    className="classes-browser__cycle-toggle"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggleCycle(section.cycle.id)}
                  >
                    <span
                      className="classes-browser__cycle-chevron"
                      data-open={open || undefined}
                      aria-hidden
                    />
                    <span className="classes-browser__cycle-icon" aria-hidden>
                      {visual.icon}
                    </span>
                    <span className="classes-browser__cycle-copy">
                      <strong className="classes-browser__cycle-title" dir="auto">
                        {cycleTitle(section.cycle, t)}
                      </strong>
                      <span className="classes-browser__cycle-stats">
                        {t('admin.academicSetup.cycleGroupStats', {
                          levels: section.levelCount,
                          classes: section.classCount,
                        })}
                        {' · '}
                        {t('admin.classesBrowser.studentCount', { count: section.studentCount })}
                      </span>
                    </span>
                  </button>
                </header>

                {open ? (
                  <div id={panelId} className="classes-browser__cycle-body">
                    {section.levels.map((levelGroup) => {
                      const levelLabel = formatAcademicLevelLabel(levelGroup, locale);
                      return (
                        <article key={levelGroup.id} className="classes-browser__level">
                          <div className="classes-browser__level-head">
                            <div className="classes-browser__level-identity">
                              <Link
                                href={`/admin/levels/${levelGroup.id}`}
                                className="classes-browser__level-title"
                                dir="auto"
                                title={levelLabel.primary}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {levelLabel.primary}
                              </Link>
                              {levelLabel.secondary ? (
                                <span className="classes-browser__level-code mono" dir="ltr">
                                  {levelLabel.secondary}
                                </span>
                              ) : null}
                            </div>
                            <span className="classes-browser__level-meta">
                              {t('admin.classesBrowser.levelMeta', {
                                classes: levelGroup.classes.length,
                                students: levelGroup.studentCount ?? 0,
                              })}
                            </span>
                          </div>

                          <div className="classes-browser__class-rail">
                            {levelGroup.classes.map((cls) => (
                              <ClassCard
                                key={cls.id}
                                cls={cls}
                                onNavigate={(id) => router.push(`/admin/classes/${id}`)}
                              />
                            ))}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
