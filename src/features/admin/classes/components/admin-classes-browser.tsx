'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { formatAcademicLevelLabel } from '@/features/admin/academic-setup/utils/format-academic-label';
import { buildClassLevelGroups, filterClassesForBrowser, groupClassesByCycle, type ClassLevelBucket } from '@/features/admin/classes/utils/group-classes-by-level';
import { resolveClassReadinessPresentation } from '@/features/admin/classes/utils/class-readiness-presentation';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { Level, SchoolClass, TrackRef } from '@/types/class';
import '../admin-classes.css';

type TrackGroup = {
  key: string;
  track: TrackRef | null;
  classes: SchoolClass[];
  levels: ClassLevelBucket[];
  studentCount: number;
};

function classTitle(cls: SchoolClass, fallback: string): string {
  const code = cls.code?.trim() || '';
  const alias = cls.display_alias?.trim();
  if (alias && alias !== code) return alias;
  const displayName = cls.display_name?.trim();
  if (displayName && displayName !== code && displayName !== cls.level?.name?.trim()) return displayName;
  const section = cls.section_name?.trim();
  if (section) return section.replace(/^القسم\s+/, '');

  const name = cls.name?.trim();
  if (name) return name;

  return fallback;
}

function studentCount(cls: SchoolClass) {
  return cls.assigned_count ?? cls.student_count ?? 0;
}

function occupancy(cls: SchoolClass) {
  const assigned = studentCount(cls);
  const percent = cls.capacity && cls.capacity > 0 ? Math.round((assigned / cls.capacity) * 100) : null;
  return { assigned, percent, overCapacity: Boolean(cls.capacity && assigned > cls.capacity) };
}

function countStudents(classes: SchoolClass[]) {
  return classes.reduce((sum, cls) => sum + studentCount(cls), 0);
}

function genderSummary(cls: SchoolClass) {
  const summary = cls.gender_summary;
  if (!summary || !Number.isFinite(summary.male_count) || !Number.isFinite(summary.female_count)) return null;
  const total = summary.male_count + summary.female_count;
  if (total <= 0) return null;
  return { male: summary.male_count, female: summary.female_count, total };
}

function buildTrackGroups(classes: SchoolClass[], levels: Level[]): TrackGroup[] {
  const hasTrack = classes.some((cls) => cls.track?.id != null);
  if (!hasTrack) {
    return [{ key: 'all', track: null, classes, levels: buildClassLevelGroups(classes, levels), studentCount: countStudents(classes) }];
  }

  const byTrack = new Map<string, { track: TrackRef | null; classes: SchoolClass[] }>();
  for (const cls of classes) {
    const track = cls.track ?? null;
    const key = track?.id != null ? `track-${track.id}` : 'unassigned';
    const bucket = byTrack.get(key) ?? { track, classes: [] };
    bucket.classes.push(cls);
    byTrack.set(key, bucket);
  }

  return [...byTrack.entries()]
    .map(([key, bucket]) => ({
      key,
      track: bucket.track,
      classes: bucket.classes,
      levels: buildClassLevelGroups(bucket.classes, levels),
      studentCount: countStudents(bucket.classes),
    }))
    .sort((a, b) => (a.track?.name ?? '').localeCompare(b.track?.name ?? '', undefined, { numeric: true }));
}

function Stat({ value, label }: { value: number; label: string }) {
  return <span className="classes-browser__stat"><strong className="mono" dir="ltr">{value}</strong><span>{label}</span></span>;
}

function ClassCard({ cls, onNavigate }: { cls: SchoolClass; onNavigate: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const readiness = resolveClassReadinessPresentation(cls.readiness, locale);
  const { assigned, percent, overCapacity } = occupancy(cls);
  const genders = genderSummary(cls);
  const title = classTitle(cls, t('common.class'));
  const isArabic = locale === 'ar';
  const readinessLabel = isArabic ? 'جاهزية القسم' : 'Préparation de la classe';
  const occupancyLabel = isArabic ? 'التلاميذ / السعة' : 'Élèves / capacité';
  const maleLabel = isArabic ? 'تلميذ' : 'Garçons';
  const femaleLabel = isArabic ? 'تلميذة' : 'Filles';

  return <button type="button" className="classes-browser__class-card" onClick={onNavigate}>
    <span className="classes-browser__card-topline">
      <span className="classes-browser__class-identity"><span className="classes-browser__class-kicker">{isArabic ? 'القسم' : 'Classe'}</span><strong dir="auto">{title}</strong></span>
      {!cls.readiness || !readiness ? <span className="classes-browser__readiness-unknown">{isArabic ? 'الجاهزية غير متاحة' : 'Préparation indisponible'}</span> : <Badge tone={readiness.tone}>{readiness.label}</Badge>}
    </span>

    <span className="classes-browser__card-metrics">
      <span className="classes-browser__readiness-metric">
        <span className="classes-browser__readiness-value" data-status={cls.readiness?.status}><strong className="mono" dir="ltr">{cls.readiness?.completed ?? '—'}{cls.readiness ? `/${cls.readiness.total}` : ''}</strong></span>
        <span><small>{readinessLabel}</small><strong>{cls.readiness && readiness ? readiness.label : '—'}</strong></span>
      </span>
      <span className="classes-browser__occupancy">
        <span className="classes-browser__occupancy-copy"><span>{occupancyLabel}</span><strong className="mono" dir="ltr">{assigned}{cls.capacity ? ` / ${cls.capacity}` : ''}</strong></span>
        {percent != null ? <><span className="classes-browser__occupancy-bar" aria-hidden><span data-over-capacity={overCapacity || undefined} style={{ width: `${Math.min(percent, 100)}%` }} /></span><span className="classes-browser__occupancy-percent" data-over-capacity={overCapacity || undefined}><bdi dir="ltr">{percent}%</bdi></span></> : <span className="classes-browser__occupancy-percent">—</span>}
      </span>
    </span>

    {genders ? <span className="classes-browser__gender-summary" aria-label={isArabic ? `${genders.male} تلاميذ و${genders.female} تلميذات` : `${genders.male} garçons et ${genders.female} filles`}>
      <span className="classes-browser__gender-summary-copy">
        <span className="classes-browser__gender-summary-item classes-browser__gender-summary-item--male"><span aria-hidden>♂</span><strong className="mono" dir="ltr">{genders.male}</strong><small>{maleLabel}</small></span>
        <span className="classes-browser__gender-summary-item classes-browser__gender-summary-item--female"><span aria-hidden>♀</span><strong className="mono" dir="ltr">{genders.female}</strong><small>{femaleLabel}</small></span>
      </span>
      <span className="classes-browser__gender-distribution-bar" aria-hidden>
        <span className="classes-browser__gender-distribution-segment classes-browser__gender-distribution-segment--male" style={{ width: `${(genders.male / genders.total) * 100}%` }} />
        <span className="classes-browser__gender-distribution-segment classes-browser__gender-distribution-segment--female" style={{ width: `${(genders.female / genders.total) * 100}%` }} />
      </span>
    </span> : null}

    <span className="classes-browser__card-footnote">{cls.track?.name ? <span dir="auto">{cls.track.name}</span> : null}{cls.status !== 'active' ? <Badge tone="slate">{statusLabel(t, cls.status)}</Badge> : null}<span className="classes-browser__open-hint" aria-hidden>‹</span></span>
  </button>;
}

function LevelSection({ level, classes, focus }: { level: ClassLevelBucket; classes: SchoolClass[]; focus: boolean }) {
  const { locale } = useLocale();
  const router = useRouter();
  const label = formatAcademicLevelLabel(level, locale);
  const isArabic = locale === 'ar';
  const assignedTotal = countStudents(classes);

  return <section className={focus ? 'classes-browser__level-section classes-browser__level-section--focus' : 'classes-browser__level-section'}>
    <header className="classes-browser__level-section-head">
      <div><span className="classes-browser__eyebrow">{focus ? (isArabic ? 'المستوى المختار' : 'Niveau sélectionné') : (isArabic ? 'المستوى الدراسي' : 'Niveau scolaire')}</span><h2 dir="auto">{label.primary}</h2></div>
      <div className="classes-browser__level-summary"><Stat value={classes.length} label={isArabic ? 'قسمًا' : 'classes'} /><Stat value={assignedTotal} label={isArabic ? 'تلميذًا/ة' : 'élèves'} /></div>
    </header>
    <div className="classes-browser__class-grid">{classes.map((cls) => <ClassCard key={cls.id} cls={cls} onNavigate={() => router.push(`/admin/classes/${cls.id}`)} />)}</div>
  </section>;
}

export function AdminClassesBrowser({ classes, levels }: { classes: SchoolClass[]; levels: Level[] }) {
  const t = useT();
  const { locale } = useLocale();
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [status, setStatus] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [trackId, setTrackId] = useState<number | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);
  const isArabic = locale === 'ar';

  const academicYears = useMemo(() => [...new Set(classes.map((cls) => cls.academic_year?.trim()).filter((x): x is string => !!x))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), [classes]);
  const statuses = useMemo(() => [...new Set(classes.map((cls) => cls.status).filter(Boolean))].sort(), [classes]);
  const structureClasses = useMemo(() => filterClassesForBrowser(classes, levels, { academicYear, status }), [classes, levels, academicYear, status]);
  const cycleGroups = useMemo(() => groupClassesByCycle(structureClasses, levels), [structureClasses, levels]);
  const cycleChoices = useMemo(() => cycleGroups.map((group) => group.cycle), [cycleGroups]);
  const cycleScopedClasses = useMemo(() => filterClassesForBrowser(structureClasses, levels, { cycleId }), [structureClasses, levels, cycleId]);
  const trackChoices = useMemo(() => {
    const byId = new Map<number, TrackRef>();
    cycleScopedClasses.forEach((cls) => { if (cls.track?.id != null) byId.set(cls.track.id, cls.track); });
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [cycleScopedClasses]);
  const trackIsRelevant = trackChoices.length > 0;
  const scopedClasses = useMemo(() => trackId == null ? cycleScopedClasses : cycleScopedClasses.filter((cls) => cls.track?.id === trackId), [cycleScopedClasses, trackId]);
  const levelChoices = useMemo(() => buildClassLevelGroups(scopedClasses, levels), [scopedClasses, levels]);

  useEffect(() => {
    if (trackId != null && !trackChoices.some((track) => track.id === trackId)) setTrackId(null);
    if (selectedLevelId != null && !levelChoices.some((level) => level.id === selectedLevelId)) setSelectedLevelId(null);
  }, [trackId, trackChoices, selectedLevelId, levelChoices]);

  const resultClasses = useMemo(() => filterClassesForBrowser(scopedClasses, levels, { search: debouncedSearch, levelId: selectedLevelId }), [scopedClasses, levels, debouncedSearch, selectedLevelId]);
  const resultCycleGroups = useMemo(() => groupClassesByCycle(resultClasses, levels), [resultClasses, levels]);
  const overview = useMemo(() => ({
    levels: new Set(resultClasses.map((cls) => cls.level?.id).filter((id): id is number => id != null)).size,
    classes: resultClasses.length,
    students: countStudents(resultClasses),
  }), [resultClasses]);

  if (!classes.length) return <EmptyState icon="🏫" title={t('admin.classesBrowser.noData.title')} description={t('admin.classesBrowser.noData.description')} />;

  return <div className="classes-browser classes-browser--level-browser">
    <div className="classes-browser__primary-filters">
      <label className="classes-browser__search"><span className="classes-browser__search-icon" aria-hidden>⌕</span><input className="input classes-browser__search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.classesBrowser.searchPlaceholder')} aria-label={t('common.search')} autoComplete="off" dir="auto" />{search ? <button type="button" className="classes-browser__search-clear" onClick={() => setSearch('')} aria-label={t('admin.classesBrowser.clearSearch')}>×</button> : null}</label>
      <label className="classes-browser__filter-field"><span>{isArabic ? 'السلك' : 'Cycle'}</span><select className="input" value={cycleId ?? ''} onChange={(event) => { setCycleId(event.target.value ? Number(event.target.value) : null); setTrackId(null); setSelectedLevelId(null); }}><option value="">{isArabic ? 'كل الأسلاك' : 'Tous les cycles'}</option>{cycleChoices.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select></label>
      {trackIsRelevant ? <label className="classes-browser__filter-field"><span>{isArabic ? 'الشعبة' : 'Filière'}</span><select className="input" value={trackId ?? ''} onChange={(event) => { setTrackId(event.target.value ? Number(event.target.value) : null); setSelectedLevelId(null); }}><option value="">{isArabic ? 'كل الشعب' : 'Toutes les filières'}</option>{trackChoices.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</select></label> : null}
      <label className="classes-browser__filter-field"><span>{isArabic ? 'المستوى' : 'Niveau'}</span><select className="input" value={selectedLevelId ?? ''} onChange={(event) => setSelectedLevelId(event.target.value ? Number(event.target.value) : null)}><option value="">{isArabic ? 'كل المستويات' : 'Tous les niveaux'}</option>{levelChoices.map((level) => <option key={level.id} value={level.id}>{formatAcademicLevelLabel(level, locale).primary}</option>)}</select></label>
      <button type="button" className={moreOpen ? 'btn btn--ghost btn--sm classes-browser__more classes-browser__more--active' : 'btn btn--ghost btn--sm classes-browser__more'} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>{moreOpen ? t('admin.studentsList.filters.hideMore') : t('admin.studentsList.filters.more')}</button>
    </div>

    {moreOpen ? <div className="classes-browser__more-filters"><label><span>{t('academicContext.fields.academicYear')}</span><select className="input" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}><option value="">{t('academicContext.fields.academicYear')}</option>{academicYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label><span>{t('common.status')}</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t('common.allStatuses')}</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel(t, value)}</option>)}</select></label></div> : null}

    <section className="classes-browser__overview" aria-label={isArabic ? 'إحصائيات النتائج' : 'Statistiques des résultats'}><Stat value={overview.levels} label={isArabic ? 'مستويات' : 'niveaux'} /><Stat value={overview.classes} label={isArabic ? 'أقسام' : 'classes'} /><Stat value={overview.students} label={isArabic ? 'تلميذًا/ة' : 'élèves'} /></section>

    {resultCycleGroups.length ? <div className="classes-browser__all-levels">{resultCycleGroups.map((cycleGroup) => {
      const trackGroups = buildTrackGroups(cycleGroup.levels.flatMap((level) => level.classes), levels);
      const hasTracks = trackGroups.length > 1 || trackGroups.some((group) => group.track != null);
      const cycleLabel = cycleGroup.cycle?.name ?? (isArabic ? 'مستويات غير مصنفة' : 'Niveaux non classés');
      const actualStudents = countStudents(cycleGroup.levels.flatMap((level) => level.classes));

      return <section key={cycleGroup.cycle?.id ?? 'orphan'} className="classes-browser__cycle-section">
        <header className="classes-browser__cycle-head"><div><span className="classes-browser__eyebrow">{isArabic ? 'السلك' : 'Cycle'}</span><h2 dir="auto">{cycleLabel}</h2></div><div className="classes-browser__level-summary"><Stat value={cycleGroup.classCount} label={isArabic ? 'قسمًا' : 'classes'} /><Stat value={actualStudents} label={isArabic ? 'تلميذًا/ة' : 'élèves'} /></div></header>
        {trackGroups.map((trackGroup) => <div key={trackGroup.key} className={hasTracks ? 'classes-browser__track-section' : 'classes-browser__track-section classes-browser__track-section--plain'}>
          {hasTracks ? <header className="classes-browser__track-head"><div><span>{isArabic ? 'الشعبة' : 'Filière'}</span><strong dir="auto">{trackGroup.track?.name ?? (isArabic ? 'بدون شعبة' : 'Sans filière')}</strong></div><div><Stat value={trackGroup.classes.length} label={isArabic ? 'قسمًا' : 'classes'} /><Stat value={trackGroup.studentCount} label={isArabic ? 'تلميذًا/ة' : 'élèves'} /></div></header> : null}
          {trackGroup.levels.map((level) => <LevelSection key={level.id} level={level} classes={level.classes} focus={selectedLevelId === level.id} />)}
        </div>)}
      </section>;
    })}</div> : <EmptyState icon="🔍" title={t('admin.classesBrowser.noMatch.title')} description={t('admin.classesBrowser.noMatch.description')} />}
  </div>;
}
