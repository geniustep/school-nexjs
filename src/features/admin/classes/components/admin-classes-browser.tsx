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
import {
  formatAcademicClassLabel,
  formatAcademicLevelLabel,
} from '@/features/admin/academic-setup/utils/format-academic-label';
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

const CYCLE_TONE: Record<string, string> = {
  preschool: 'preschool',
  primary: 'primary',
  middle_school: 'middle',
  middle: 'middle',
  secondary: 'secondary',
  high_school: 'secondary',
  high: 'secondary',
  other: 'other',
};

function cycleTone(code?: string | null): string {
  return CYCLE_TONE[normalizeCycleCode(code)] ?? CYCLE_TONE.other;
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
        {!isActive ? <Badge tone="slate">{statusLabel(t, cls.status)}</Badge> : null}
      </div>

      <div className="classes-browser__class-meta">
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
      </div>

      <div className="classes-browser__class-students" data-over-capacity={overCapacity || undefined}>
        <span className="classes-browser__class-students-label">{t('nav.students')}</span>
        <strong className="mono" dir="ltr">
          {studentCount}
          {cls.capacity ? ` / ${cls.capacity}` : ''}
        </strong>
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
      <div className="classes-browser__topbar">
        <div className="classes-browser__summary" aria-live="polite">
          <span><strong dir="ltr">{overview.classCount}</strong> {t('nav.classes')}</span>
          <span aria-hidden>·</span>
          <span><strong dir="ltr">{overview.levelCount}</strong> {t('nav.levels')}</span>
          <span aria-hidden>·</span>
          <span><strong dir="ltr">{overview.studentCount}</strong> {t('nav.students')}</span>
          {queryActive ? (
            <>
              <span aria-hidden>·</span>
              <span className="classes-browser__summary-filtered mono" dir="ltr">
                {filteredClasses.length} / {classes.length}
              </span>
            </>
          ) : null}
        </div>

        <label className="classes-browser__search">
          <span className="classes-browser__search-icon" aria-hidden>⌕</span>
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
        <select
          className="input classes-browser__filter-input"
          value={academicYear}
          onChange={(event) => setAcademicYear(event.target.value)}
          disabled={!academicYears.length}
          aria-label={t('academicContext.fields.academicYear')}
        >
          <option value="">{t('academicContext.fields.academicYear')}</option>
          {academicYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          className="input classes-browser__filter-input"
          value={cycleId}
          onChange={(event) => {
            setCycleId(event.target.value);
            setLevelId('');
          }}
          disabled={!structureGroups.length}
          aria-label={t('academicContext.fields.cycle')}
        >
          <option value="">{t('academicContext.fields.cycle')}</option>
          {structureGroups.map((section) => (
            <option key={section.cycle.id} value={section.cycle.id}>
              {cycleTitle(section.cycle, t)}
            </option>
          ))}
        </select>

        <select
          className="input classes-browser__filter-input"
          value={levelId}
          onChange={(event) => setLevelId(event.target.value)}
          disabled={!levelOptions.length}
          aria-label={t('academicContext.fields.level')}
        >
          <option value="">{t('academicContext.fields.level')}</option>
          {levelOptions.map((level) => {
            const label = formatAcademicLevelLabel(level, locale);
            return <option key={level.id} value={level.id}>{label.primary}</option>;
          })}
        </select>

        <select
          className="input classes-browser__filter-input"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          disabled={!statuses.length}
          aria-label={t('common.status')}
        >
          <option value="">{t('common.allStatuses')}</option>
          {statuses.map((value) => (
            <option key={value} value={value}>{statusLabel(t, value)}</option>
          ))}
        </select>

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
            const tone = cycleTone(section.cycle.code);
            const open = openCycleIds.has(section.cycle.id);
            const panelId = `classes-cycle-${section.cycle.id}`;

            return (
              <section
                key={section.cycle.id}
                className="classes-browser__cycle"
                data-tone={tone}
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
                    <span className="classes-browser__cycle-marker" aria-hidden />
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
                    <span
                      className="classes-browser__cycle-chevron"
                      data-open={open || undefined}
                      aria-hidden
                    />
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
