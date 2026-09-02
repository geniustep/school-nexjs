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
import { filterClassesForBrowser, groupClassesByCycle, type ClassLevelBucket, type GroupedClassesByCycle } from '@/features/admin/classes/utils/group-classes-by-level';
import { resolveClassReadinessPresentation } from '@/features/admin/classes/utils/class-readiness-presentation';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { Level, SchoolClass } from '@/types/class';
import '../admin-classes.css';

function classTitle(cls: SchoolClass, locale: string, fallback: string): string {
  const code = cls.code?.trim() || '';
  const alias = cls.display_alias?.trim();
  if (alias && alias !== code) return alias;
  const displayName = cls.display_name?.trim();
  if (displayName && displayName !== code && displayName !== cls.level?.name?.trim()) return displayName;
  const section = cls.section_name?.trim();
  if (section) return locale === 'ar' && !section.startsWith('القسم') ? `القسم ${section}` : section;
  return cls.name?.trim() || fallback;
}

function occupancy(cls: SchoolClass) {
  const assigned = cls.assigned_count ?? cls.student_count ?? 0;
  const percent = cls.capacity && cls.capacity > 0 ? Math.round((assigned / cls.capacity) * 100) : null;
  return { assigned, percent, overCapacity: Boolean(cls.capacity && assigned > cls.capacity) };
}

function LevelStripButton({ level, selected, onSelect }: { level: ClassLevelBucket; selected: boolean; onSelect: () => void }) {
  const { locale } = useLocale();
  const label = formatAcademicLevelLabel(level, locale);
  return <button type="button" role="tab" aria-selected={selected} className={selected ? 'classes-browser__level-tab classes-browser__level-tab--active' : 'classes-browser__level-tab'} onClick={onSelect}>
    <span className="classes-browser__level-tab-name" dir="auto">{label.primary}</span>
    <span className="classes-browser__level-tab-count"><bdi dir="ltr">{level.classes.length}</bdi></span>
  </button>;
}

function genderSummary(cls: SchoolClass) {
  const summary = cls.gender_summary;
  if (!summary || !Number.isFinite(summary.male_count) || !Number.isFinite(summary.female_count)) return null;
  return { male: summary.male_count, female: summary.female_count };
}

function ClassCard({ cls, onNavigate }: { cls: SchoolClass; onNavigate: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const readiness = resolveClassReadinessPresentation(cls.readiness, locale);
  const { assigned, percent, overCapacity } = occupancy(cls);
  const genders = genderSummary(cls);
  const code = cls.recommended_display_code?.trim() || cls.academic_code?.trim() || cls.code?.trim();
  const title = classTitle(cls, locale, t('common.class'));
  const occupancyLabel = locale === 'ar' ? 'الامتلاء' : 'Occupation';
  const readinessLabel = locale === 'ar' ? 'الجاهزية' : 'Préparation';
  const maleLabel = locale === 'ar' ? 'تلاميذ' : 'Garçons';
  const femaleLabel = locale === 'ar' ? 'تلميذات' : 'Filles';
  return <button type="button" className="classes-browser__class-card" onClick={onNavigate}>
    <span className="classes-browser__card-topline"><span className="classes-browser__class-identity"><strong dir="auto">{title}</strong>{code ? <span className="classes-browser__class-code mono" dir="ltr">{code}</span> : null}</span>{!cls.readiness ? <span className="classes-browser__readiness-unknown">{readinessLabel}: —</span> : <Badge tone={readiness.tone}>{readiness.label}</Badge>}</span>
    {cls.readiness ? <span className="classes-browser__readiness-line"><span>{readinessLabel}</span><strong className="mono" dir="ltr">{cls.readiness.completed} / {cls.readiness.total}</strong></span> : null}
    <span className="classes-browser__occupancy"><span className="classes-browser__occupancy-copy"><span>{occupancyLabel}</span><strong className="mono" dir="ltr">{assigned}{cls.capacity ? ` / ${cls.capacity}` : ''}</strong></span>{percent != null ? <><span className="classes-browser__occupancy-bar" aria-hidden><span data-over-capacity={overCapacity || undefined} style={{ width: `${Math.min(percent, 100)}%` }} /></span><span className="classes-browser__occupancy-percent" data-over-capacity={overCapacity || undefined}><bdi dir="ltr">{percent}%</bdi></span></> : <span className="classes-browser__occupancy-percent">—</span>}</span>
    {genders ? <span className="classes-browser__gender-summary" aria-label={locale === 'ar' ? `${genders.male} تلاميذ و${genders.female} تلميذات` : `${genders.male} garçons et ${genders.female} filles`}><span className="classes-browser__gender-summary-item classes-browser__gender-summary-item--male"><span aria-hidden>♂</span><strong className="mono" dir="ltr">{genders.male}</strong><small>{maleLabel}</small></span><span className="classes-browser__gender-summary-item classes-browser__gender-summary-item--female"><span aria-hidden>♀</span><strong className="mono" dir="ltr">{genders.female}</strong><small>{femaleLabel}</small></span></span> : null}
    {cls.track?.name || !['active', ''].includes(cls.status) ? <span className="classes-browser__card-footnote">{cls.track?.name ? <span dir="auto">{cls.track.name}</span> : null}{cls.status !== 'active' ? <Badge tone="slate">{statusLabel(t, cls.status)}</Badge> : null}</span> : null}
  </button>;
}

function LevelSection({ level, classes, focus }: { level: ClassLevelBucket; classes: SchoolClass[]; focus: boolean }) {
  const { locale } = useLocale();
  const router = useRouter();
  const label = formatAcademicLevelLabel(level, locale);
  const assignedTotal = classes.reduce((sum, cls) => sum + (cls.assigned_count ?? cls.student_count ?? 0), 0);
  const isArabic = locale === 'ar';
  return <section className={focus ? 'classes-browser__level-section classes-browser__level-section--focus' : 'classes-browser__level-section'}>
    <header className="classes-browser__level-section-head"><div><span className="classes-browser__eyebrow">{focus ? (isArabic ? 'المستوى المختار' : 'Niveau sélectionné') : (isArabic ? 'المستوى الدراسي' : 'Niveau scolaire')}</span><h2 dir="auto">{label.primary}</h2>{label.secondary ? <span className="classes-browser__level-code mono" dir="ltr">{label.secondary}</span> : null}</div><div className="classes-browser__level-summary"><span><strong className="mono" dir="ltr">{classes.length}</strong>{isArabic ? ' أقسام' : ' classes'}</span><span><strong className="mono" dir="ltr">{assignedTotal}</strong>{isArabic ? ' تلميذًا/ة' : ' élèves'}</span></div></header>
    <div className="classes-browser__class-grid">{classes.map((cls) => <ClassCard key={cls.id} cls={cls} onNavigate={() => router.push(`/admin/classes/${cls.id}`)} />)}</div>
  </section>;
}

function flattenLevels(groups: GroupedClassesByCycle[]) { return groups.flatMap((section) => section.levels.map((level) => ({ section, level }))); }

export function AdminClassesBrowser({ classes, levels }: { classes: SchoolClass[]; levels: Level[] }) {
  const t = useT(); const { locale } = useLocale();
  const [search, setSearch] = useState(''); const [academicYear, setAcademicYear] = useState(''); const [status, setStatus] = useState(''); const [moreOpen, setMoreOpen] = useState(false); const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);
  const academicYears = useMemo(() => [...new Set(classes.map((cls) => cls.academic_year?.trim()).filter((x): x is string => !!x))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), [classes]);
  const statuses = useMemo(() => [...new Set(classes.map((cls) => cls.status).filter(Boolean))].sort(), [classes]);
  const structureClasses = useMemo(() => filterClassesForBrowser(classes, levels, { academicYear, status }), [classes, levels, academicYear, status]);
  const levelChoices = useMemo(() => flattenLevels(groupClassesByCycle(structureClasses, levels)), [structureClasses, levels]);
  useEffect(() => { if (selectedLevelId != null && !levelChoices.some(({ level }) => level.id === selectedLevelId)) setSelectedLevelId(null); }, [levelChoices, selectedLevelId]);
  const visibleLevels = useMemo(() => levelChoices.map(({ level }) => ({ level, classes: filterClassesForBrowser(level.classes, levels, { search: debouncedSearch }) })).filter(({ classes }) => classes.length > 0).filter(({ level }) => selectedLevelId == null || level.id === selectedLevelId), [levelChoices, levels, debouncedSearch, selectedLevelId]);
  const isArabic = locale === 'ar';
  if (!classes.length) return <EmptyState icon="🏫" title={t('admin.classesBrowser.noData.title')} description={t('admin.classesBrowser.noData.description')} />;
  return <div className="classes-browser classes-browser--level-browser">
    <div className="classes-browser__toolbar"><label className="classes-browser__search"><span className="classes-browser__search-icon" aria-hidden>⌕</span><input className="input classes-browser__search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.classesBrowser.searchPlaceholder')} aria-label={t('common.search')} autoComplete="off" dir="auto" />{search ? <button type="button" className="classes-browser__search-clear" onClick={() => setSearch('')} aria-label={t('admin.classesBrowser.clearSearch')}>×</button> : null}</label><button type="button" className={moreOpen ? 'btn btn--ghost btn--sm classes-browser__more classes-browser__more--active' : 'btn btn--ghost btn--sm classes-browser__more'} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>{moreOpen ? t('admin.studentsList.filters.hideMore') : t('admin.studentsList.filters.more')}</button></div>
    {moreOpen ? <div className="classes-browser__more-filters"><label><span>{t('academicContext.fields.academicYear')}</span><select className="input" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}><option value="">{t('academicContext.fields.academicYear')}</option>{academicYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label><span>{t('common.status')}</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t('common.allStatuses')}</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel(t, value)}</option>)}</select></label></div> : null}
    {!levelChoices.length ? <EmptyState icon="🔍" title={t('admin.classesBrowser.noMatch.title')} description={t('admin.classesBrowser.noMatch.description')} /> : <><div className="classes-browser__levels-wrap"><div className="classes-browser__levels" role="tablist" aria-label={isArabic ? 'المستويات الدراسية' : 'Niveaux scolaires'}><button type="button" role="tab" aria-selected={selectedLevelId == null} className={selectedLevelId == null ? 'classes-browser__level-tab classes-browser__level-tab--active' : 'classes-browser__level-tab'} onClick={() => setSelectedLevelId(null)}><span className="classes-browser__level-tab-name">{isArabic ? 'عرض الكل' : 'Tout afficher'}</span><span className="classes-browser__level-tab-count"><bdi dir="ltr">{structureClasses.length}</bdi></span></button>{levelChoices.map(({ level }) => <LevelStripButton key={level.id} level={level} selected={level.id === selectedLevelId} onSelect={() => setSelectedLevelId(level.id)} />)}</div></div>
    {visibleLevels.length ? <div className="classes-browser__all-levels">{visibleLevels.map(({ level, classes: levelClasses }) => <LevelSection key={level.id} level={level} classes={levelClasses} focus={selectedLevelId === level.id} />)}</div> : <EmptyState icon="🔍" title={t('admin.classesBrowser.noMatch.title')} description={t('admin.classesBrowser.noMatch.description)} />}</>}</div>;
}
