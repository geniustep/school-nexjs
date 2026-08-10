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
import { formatAcademicLevelLabel } from '@/features/admin/academic-setup/utils/format-academic-label';
import {
  ORPHAN_CYCLE_ID,
  normalizeCycleCode,
} from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import {
  classesBrowserHasActiveQuery,
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

function classTitle(
  cls: SchoolClass,
  locale: string,
  fallback: string,
): string {
  const code = cls.code?.trim() || '';
  const displayAlias = cls.display_alias?.trim();
  if (displayAlias && displayAlias !== code) return displayAlias;

  const displayName = cls.display_name?.trim();
  if (displayName && displayName !== code && displayName !== cls.level?.name?.trim()) {
    return displayName;
  }

  const section = cls.section_name?.trim();
  if (section) {
    if (locale === 'ar') return section.startsWith('القسم') ? section : `القسم ${section}`;
    return section;
  }

  const name = cls.name?.trim();
  if (name && name !== code && name !== cls.level?.name?.trim()) return name;

  return fallback;
}

function ClassRow({
  cls,
  onNavigate,
}: {
  cls: SchoolClass;
  onNavigate: (id: number) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const studentCount = cls.student_count ?? 0;
  const fill = capacityPercent(studentCount, cls.capacity);
  const isActive = cls.status === 'active';
  const overCapacity = !!cls.capacity && cls.capacity > 0 && studentCount > cls.capacity;
  const title = classTitle(cls, locale, t('common.class'));

  return (
    <button
      type="button"
      className="classes-browser__class-row"
      data-status={isActive ? 'active' : 'inactive'}
      data-over-capacity={overCapacity || undefined}
      onClick={() => onNavigate(cls.id)}
    >
      <span className="classes-browser__class-main">
        <span className="classes-browser__class-title-line">
          <strong className="classes-browser__class-name" dir="auto" title={title}>
            {title}
          </strong>
          {!isActive ? <Badge tone="slate">{statusLabel(t, cls.status)}</Badge> : null}
        </span>
        <span className="classes-browser__class-meta">
          {cls.code ? (
            <span className="classes-browser__class-code mono" dir="ltr">
              {locale === 'ar' ? `القسم: ${cls.code}` : cls.code}
            </span>
          ) : null}
          {cls.track?.name ? (
            <span className="classes-browser__class-track" dir="auto">
              {cls.track.name}
            </span>
          ) : null}
        </span>
      </span>

      <span
        className="classes-browser__class-students"
        data-over-capacity={overCapacity || undefined}
      >
        <span>{t('nav.students')}</span>
        <strong className="mono" dir="ltr">
          {studentCount}{cls.capacity ? ` / ${cls.capacity}` : ''}
        </strong>
      </span>

      {fill != null ? (
        <span
          className="classes-browser__capacity"
          data-over-capacity={overCapacity || undefined}
          aria-hidden
        >
          <span className="classes-browser__capacity-bar" style={{ width: `${fill}%` }} />
        </span>
      ) : null}

      <span className="classes-browser__class-arrow" aria-hidden>‹</span>
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
  const [moreOpen, setMoreOpen] = useState(false);
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
      selectedCycleId == null
        ? []
        : structureGroups
            .filter((section) => section.cycle.id === selectedCycleId)
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
    [classes, levels, debouncedSearch, academicYear, selectedCycleId, selectedLevelId, status],
  );

  const grouped = useMemo(
    () => groupClassesByCycle(filteredClasses, levels),
    [filteredClasses, levels],
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

  const focusedLevel = useMemo(() => {
    if (selectedLevelId == null) return null;
    for (const section of grouped) {
      const level = section.levels.find((item) => item.id === selectedLevelId);
      if (level) return { section, level };
    }
    return null;
  }, [grouped, selectedLevelId]);

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
    if (academicYear || status) setMoreOpen(true);
  }, [academicYear, status]);

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
    if (selectedCycleId != null || debouncedSearch) {
      setOpenCycleIds(new Set(grouped.map((section) => section.cycle.id)));
      return;
    }
    if (isMobile) {
      setOpenCycleIds(new Set([grouped[0].cycle.id]));
      return;
    }
    setOpenCycleIds(new Set(grouped.map((section) => section.cycle.id)));
  }, [grouped, selectedCycleId, debouncedSearch, isMobile]);

  function toggleCycle(cycleIdToToggle: number) {
    setOpenCycleIds((prev) => {
      const next = new Set(prev);
      if (next.has(cycleIdToToggle)) next.delete(cycleIdToToggle);
      else next.add(cycleIdToToggle);
      return next;
    });
  }

  function selectCycle(value: string) {
    setCycleId(value);
    setLevelId('');
  }

  function clearFilters() {
    setSearch('');
    setAcademicYear('');
    setCycleId('');
    setLevelId('');
    setStatus('');
    setMoreOpen(false);
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

        <button
          type="button"
          className={moreOpen ? 'btn btn--ghost btn--sm classes-browser__more classes-browser__more--active' : 'btn btn--ghost btn--sm classes-browser__more'}
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
        >
          {moreOpen ? t('admin.studentsList.filters.hideMore') : t('admin.studentsList.filters.more')}
        </button>

        {queryActive ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
            {t('common.clear')}
          </button>
        ) : null}
      </div>

      <div className="classes-browser__academic-filters">
        <div className="classes-browser__cycle-filter" role="tablist" aria-label={t('academicContext.fields.cycle')}>
          <button
            type="button"
            role="tab"
            aria-selected={!cycleId}
            className={!cycleId ? 'classes-browser__cycle-pill classes-browser__cycle-pill--active' : 'classes-browser__cycle-pill'}
            onClick={() => selectCycle('')}
          >
            {t('admin.studentsList.filters.allCycles')}
          </button>
          {structureGroups.map((section) => {
            const active = cycleId === String(section.cycle.id);
            return (
              <button
                key={section.cycle.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? 'classes-browser__cycle-pill classes-browser__cycle-pill--active' : 'classes-browser__cycle-pill'}
                onClick={() => selectCycle(String(section.cycle.id))}
              >
                {cycleTitle(section.cycle, t)}
              </button>
            );
          })}
        </div>

        <select
          className="input classes-browser__level-filter"
          value={levelId}
          onChange={(event) => setLevelId(event.target.value)}
          disabled={selectedCycleId == null || !levelOptions.length}
          aria-label={t('academicContext.fields.level')}
        >
          <option value="">{t('academicContext.fields.level')}</option>
          {levelOptions.map((level) => {
            const label = formatAcademicLevelLabel(level, locale);
            return <option key={level.id} value={level.id}>{label.primary}</option>;
          })}
        </select>
      </div>

      {moreOpen ? (
        <div className="classes-browser__more-filters">
          <label>
            <span>{t('academicContext.fields.academicYear')}</span>
            <select
              className="input"
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              disabled={!academicYears.length}
            >
              <option value="">{t('academicContext.fields.academicYear')}</option>
              {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>
            <span>{t('common.status')}</span>
            <select
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={!statuses.length}
            >
              <option value="">{t('common.allStatuses')}</option>
              {statuses.map((value) => (
                <option key={value} value={value}>{statusLabel(t, value)}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {!grouped.length ? (
        <EmptyState
          icon="🔍"
          title={t('admin.classesBrowser.noMatch.title')}
          description={t('admin.classesBrowser.noMatch.description')}
          action={queryActive ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
              {t('common.clear')}
            </button>
          ) : undefined}
        />
      ) : focusedLevel ? (
        <section className="classes-browser__focus" data-tone={cycleTone(focusedLevel.section.cycle.code)}>
          <div className="classes-browser__focus-context">
            <span>{cycleTitle(focusedLevel.section.cycle, t)}</span>
          </div>
          <div className="classes-browser__focus-head">
            {(() => {
              const levelLabel = formatAcademicLevelLabel(focusedLevel.level, locale);
              return (
                <>
                  <Link href={`/admin/levels/${focusedLevel.level.id}`} className="classes-browser__focus-title" dir="auto">
                    {levelLabel.primary}
                  </Link>
                  {levelLabel.secondary ? (
                    <span className="classes-browser__level-code mono" dir="ltr">{levelLabel.secondary}</span>
                  ) : null}
                </>
              );
            })()}
          </div>
          <div className="classes-browser__class-list">
            {focusedLevel.level.classes.map((cls) => (
              <ClassRow key={cls.id} cls={cls} onNavigate={(id) => router.push(`/admin/classes/${id}`)} />
            ))}
          </div>
        </section>
      ) : (
        <div className="classes-browser__cycles">
          {grouped.map((section) => {
            const tone = cycleTone(section.cycle.code);
            const open = openCycleIds.has(section.cycle.id);
            const panelId = `classes-cycle-${section.cycle.id}`;

            return (
              <section key={section.cycle.id} className="classes-browser__cycle" data-tone={tone} data-open={open || undefined}>
                <header className="classes-browser__cycle-header">
                  <button
                    type="button"
                    className="classes-browser__cycle-toggle"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggleCycle(section.cycle.id)}
                  >
                    <span className="classes-browser__cycle-marker" aria-hidden />
                    <strong className="classes-browser__cycle-title" dir="auto">
                      {cycleTitle(section.cycle, t)}
                    </strong>
                    <span className="classes-browser__cycle-chevron" data-open={open || undefined} aria-hidden />
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
                          </div>
                          <div className="classes-browser__class-list">
                            {levelGroup.classes.map((cls) => (
                              <ClassRow key={cls.id} cls={cls} onNavigate={(id) => router.push(`/admin/classes/${id}`)} />
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
