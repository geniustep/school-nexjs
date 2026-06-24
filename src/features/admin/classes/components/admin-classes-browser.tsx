'use client';

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
  computeClassesOverview,
  filterClassesForSearch,
  groupClassesByCycle,
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
  const fill = capacityPercent(cls.student_count ?? 0, cls.capacity);
  const isActive = cls.status === 'active';

  return (
    <button
      type="button"
      className="classes-browser__class-card"
      data-status={isActive ? 'active' : 'inactive'}
      onClick={() => onNavigate(cls.id)}
    >
      <div className="classes-browser__class-card-head">
        <strong className="classes-browser__class-name">{label.primary}</strong>
        <Badge tone={isActive ? 'green' : 'slate'}>{statusLabel(t, cls.status)}</Badge>
      </div>

      {label.secondary ? (
        <span className="classes-browser__class-code mono" dir="ltr">
          {label.secondary}
        </span>
      ) : null}

      {cls.track?.name ? (
        <span className="classes-browser__class-track">{cls.track.name}</span>
      ) : null}

      <div className="classes-browser__class-stats">
        <span className="classes-browser__class-students">
          <span className="classes-browser__class-students-icon" aria-hidden>
            👥
          </span>
          <span className="mono">
            {cls.student_count ?? 0}
            {cls.capacity ? ` / ${cls.capacity}` : ''}
          </span>
        </span>
        {cls.teachers?.length ? (
          <span className="classes-browser__class-teachers mono">
            {cls.teachers.length} {t('nav.teachers')}
          </span>
        ) : null}
      </div>

      {fill != null ? (
        <div className="classes-browser__capacity" aria-hidden>
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
  const [isMobile, setIsMobile] = useState(false);
  const [openCycleIds, setOpenCycleIds] = useState<Set<number>>(() => new Set());

  const filteredClasses = useMemo(
    () => filterClassesForSearch(classes, debouncedSearch),
    [classes, debouncedSearch],
  );

  const grouped = useMemo(
    () => groupClassesByCycle(filteredClasses, levels),
    [filteredClasses, levels],
  );

  const overview = useMemo(
    () => computeClassesOverview(filteredClasses, grouped),
    [filteredClasses, grouped],
  );

  const searchActive = debouncedSearch.trim().length > 0;

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

    if (searchActive) {
      setOpenCycleIds(new Set(grouped.map((section) => section.cycle.id)));
      return;
    }

    if (isMobile) {
      setOpenCycleIds(new Set([grouped[0].cycle.id]));
      return;
    }

    setOpenCycleIds(new Set(grouped.map((section) => section.cycle.id)));
  }, [grouped, searchActive, isMobile]);

  function toggleCycle(cycleId: number) {
    setOpenCycleIds((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) next.delete(cycleId);
      else next.add(cycleId);
      return next;
    });
  }

  if (!classes.length) {
    return <EmptyState icon="🏫" title={t('empty.classes')} />;
  }

  return (
    <div className="classes-browser">
      <div className="classes-browser__toolbar">
        <div className="classes-browser__overview" aria-label={t('admin.classesBrowser.overviewLabel')}>
          <div className="classes-browser__stat">
            <span className="classes-browser__stat-value">{overview.classCount}</span>
            <span className="classes-browser__stat-label">{t('nav.classes')}</span>
          </div>
          <div className="classes-browser__stat">
            <span className="classes-browser__stat-value">{overview.levelCount}</span>
            <span className="classes-browser__stat-label">{t('nav.levels')}</span>
          </div>
          <div className="classes-browser__stat">
            <span className="classes-browser__stat-value">{overview.studentCount}</span>
            <span className="classes-browser__stat-label">{t('nav.students')}</span>
          </div>
          <div className="classes-browser__stat">
            <span className="classes-browser__stat-value">{overview.activeCount}</span>
            <span className="classes-browser__stat-label">{t('admin.classesBrowser.activeClasses')}</span>
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
          />
          {search ? (
            <button
              type="button"
              className="classes-browser__search-clear"
              onClick={() => setSearch('')}
              aria-label={t('common.clear')}
            >
              ×
            </button>
          ) : null}
        </label>
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
                  <strong>{cycleTitle(section.cycle, t)}</strong>
                  <span>{section.classCount}</span>
                </span>
              </button>
            );
          })}
        </nav>
      ) : null}

      {!grouped.length ? (
        <EmptyState
          icon="🔍"
          title={t('admin.classesBrowser.noMatch')}
          description={t('admin.academicSetup.levelsFilterEmpty')}
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
                      <strong className="classes-browser__cycle-title">
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
