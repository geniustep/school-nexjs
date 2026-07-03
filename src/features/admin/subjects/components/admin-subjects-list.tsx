'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils/cn';
import { EmptyState } from '@/components/states/states';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { countSubjectsByName } from '@/features/admin/academic-setup/utils/subject-display';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, Subject } from '@/types/class';
import {
  buildLevelsByIdFromLevels,
  buildSubjectRowMeta,
  computeSubjectsOverview,
  filterSubjectsForList,
  groupSubjectsForList,
  type SubjectTier,
} from '../utils/subjects-list-utils';
import '../admin-subjects.css';

const TIER_VISUAL: Record<SubjectTier, { icon: string; accent: string }> = {
  primary: { icon: '📗', accent: '#86efac' },
  middle: { icon: '📘', accent: '#93c5fd' },
  high: { icon: '🎓', accent: '#c4b5fd' },
  other: { icon: '📋', accent: '#cbd5e1' },
};

function tierTitle(tier: SubjectTier, t: ReturnType<typeof useT>): string {
  switch (tier) {
    case 'primary':
      return t('admin.subjectsList.tierPrimary');
    case 'middle':
      return t('admin.subjectsList.tierMiddle');
    case 'high':
      return t('admin.subjectsList.tierHigh');
    default:
      return t('admin.subjectsList.tierOther');
  }
}

function SubjectCard({
  subject,
  meta,
}: {
  subject: Subject;
  meta: ReturnType<typeof buildSubjectRowMeta>;
}) {
  const t = useT();
  const tierVisual = TIER_VISUAL[meta.tier];

  return (
    <Link href={`/admin/subjects/${subject.id}`} className="admin-subjects-card">
      <div className="admin-subjects-card__head">
        <div className="admin-subjects-card__title-wrap">
          <h3 className="admin-subjects-card__name">{meta.displayName}</h3>
          {meta.isDuplicateName ? (
            <span className="admin-subjects-card__dup-hint">{t('admin.subjectsList.duplicateHint')}</span>
          ) : null}
        </div>
        <span
          className="admin-subjects-card__tier"
          style={{ '--tier-accent': tierVisual.accent } as CSSProperties}
        >
          {tierTitle(meta.tier, t)}
        </span>
      </div>

      <p className="admin-subjects-card__code mono" dir="ltr">
        {subject.code?.trim() || t('common.dash')}
      </p>

      <div className="admin-subjects-card__meta">
        {meta.levelLabels.length > 0 ? (
          <span className="admin-subjects-card__tag">
            {t('admin.subjectsList.levelLabel')}: {meta.levelLabels.join(' · ')}
          </span>
        ) : null}
        {meta.sourceLabel ? (
          <span className="admin-subjects-card__tag admin-subjects-card__tag--muted">{meta.sourceLabel}</span>
        ) : null}
        {subject.required ? (
          <span className="admin-subjects-card__tag admin-subjects-card__tag--required">
            {t('admin.academicSetup.guided.badgeRequired')}
          </span>
        ) : null}
        {subject.optional ? (
          <span className="admin-subjects-card__tag admin-subjects-card__tag--muted">
            {t('admin.academicSetup.guided.badgeOptional')}
          </span>
        ) : null}
        {subject.weekly_hours != null && subject.weekly_hours > 0 ? (
          <span className="admin-subjects-card__tag admin-subjects-card__tag--muted">
            {t('admin.academicSetup.guided.weeklySessions', { count: subject.weekly_hours })}
          </span>
        ) : null}
        {(subject.assignments_count ?? 0) > 0 ? (
          <span className="admin-subjects-card__tag admin-subjects-card__tag--muted">
            {t('admin.subjectsList.assignmentsCount', { count: subject.assignments_count ?? 0 })}
          </span>
        ) : null}
      </div>

      <span className="admin-subjects-card__arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

export function AdminSubjectsList({
  subjects,
  levels,
  onImportDone,
}: {
  subjects: Subject[];
  levels: Level[];
  onImportDone?: () => void;
}) {
  const t = useT();
  const user = useSession();
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<SubjectTier | ''>('');
  const debouncedSearch = useDebouncedValue(search, 250);

  const levelsById = useMemo(
    () =>
      buildLevelsByIdFromLevels(
        levels.map((level) => ({ id: level.id, name: level.name, code: level.code })),
      ),
    [levels],
  );

  const nameCounts = useMemo(() => countSubjectsByName(subjects), [subjects]);
  const overview = useMemo(() => computeSubjectsOverview(subjects), [subjects]);

  const filtered = useMemo(
    () => filterSubjectsForList(subjects, levelsById, debouncedSearch, tierFilter),
    [subjects, levelsById, debouncedSearch, tierFilter],
  );

  const grouped = useMemo(() => groupSubjectsForList(filtered, levelsById), [filtered, levelsById]);
  const hasActiveFilters = debouncedSearch.trim().length > 0 || !!tierFilter;

  function resetFilters() {
    setSearch('');
    setTierFilter('');
  }

  return (
    <div className="admin-subjects-page">
      <header className="admin-subjects-hero">
        <div className="admin-subjects-hero__glow" aria-hidden="true" />
        <div className="admin-subjects-hero__content">
          <div className="admin-subjects-hero__intro">
            <span className="admin-subjects-hero__eyebrow">
              {user.school?.name ?? t('admin.cmd.defaultSchool')}
            </span>
            <h1 className="admin-subjects-hero__title">{t('nav.subjects')}</h1>
            <p className="admin-subjects-hero__subtitle">{t('admin.subjectsList.subtitle')}</p>
            <div className="admin-subjects-hero__pills">
              <span className="admin-subjects-pill">
                <span aria-hidden="true">📖</span>
                {t('admin.subjectsList.stats', {
                  subjects: overview.subjectCount,
                  levels: overview.levelCount,
                })}
              </span>
              {overview.duplicateNameCount > 0 ? (
                <span className="admin-subjects-pill admin-subjects-pill--warn">
                  {t('admin.subjectsList.duplicateNamesCount', { count: overview.duplicateNameCount })}
                </span>
              ) : null}
            </div>
          </div>
          <div className="admin-subjects-hero__actions">
            <AdminListActions
              addHref="/admin/subjects/new"
              addLabel={t('admin.addSubject')}
              managePermission="manage_classes"
              exportPath={endpoints.admin.subjectsExport}
              exportFilename="subjects.csv"
              showImport
              importOpen={importOpen}
              onToggleImport={() => setImportOpen((v) => !v)}
            />
          </div>
        </div>
      </header>

      {importOpen ? (
        <CsvImportPanel importPath={endpoints.admin.subjectsImport} onDone={() => onImportDone?.()} />
      ) : null}

      <section className="admin-subjects-stats" aria-label={t('nav.subjects')}>
        <div className="admin-subjects-stat admin-subjects-stat--accent">
          <span className="admin-subjects-stat__icon" aria-hidden="true">
            📖
          </span>
          <span className="admin-subjects-stat__value">{overview.subjectCount}</span>
          <span className="admin-subjects-stat__label">{t('nav.subjects')}</span>
        </div>
        <div className="admin-subjects-stat">
          <span className="admin-subjects-stat__icon" aria-hidden="true">
            📚
          </span>
          <span className="admin-subjects-stat__value">{overview.levelCount}</span>
          <span className="admin-subjects-stat__label">{t('nav.levels')}</span>
        </div>
        <div className="admin-subjects-stat">
          <span className="admin-subjects-stat__icon" aria-hidden="true">
            👨‍🏫
          </span>
          <span className="admin-subjects-stat__value">{overview.withAssignmentsCount}</span>
          <span className="admin-subjects-stat__label">{t('admin.subjectsList.withAssignments')}</span>
        </div>
        <div className="admin-subjects-stat">
          <span className="admin-subjects-stat__icon" aria-hidden="true">
            ⚑
          </span>
          <span className="admin-subjects-stat__value">{overview.duplicateNameCount}</span>
          <span className="admin-subjects-stat__label">{t('admin.subjectsList.sharedNames')}</span>
        </div>
      </section>

      <section className="admin-subjects-toolbar" aria-label={t('admin.subjectsList.filterLabel')}>
        <div className="admin-subjects-toolbar__row">
          <label className="admin-subjects-search">
            <span className="admin-subjects-search__icon" aria-hidden="true">
              🔍
            </span>
            <input
              className="input admin-subjects-search__input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.subjectsList.searchPlaceholder')}
              aria-label={t('common.search')}
            />
            {search ? (
              <button
                type="button"
                className="admin-subjects-search__clear"
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

        <div className="admin-subjects-toolbar__quick">
          <button
            type="button"
            className={cn('admin-subjects-chip', !tierFilter && 'admin-subjects-chip--active')}
            onClick={() => setTierFilter('')}
          >
            {t('admin.subjectsList.tierAll')}
          </button>
          {(['primary', 'middle', 'high'] as SubjectTier[]).map((tier) => (
            <button
              key={tier}
              type="button"
              className={cn('admin-subjects-chip', tierFilter === tier && 'admin-subjects-chip--active')}
              onClick={() => setTierFilter(tierFilter === tier ? '' : tier)}
            >
              {TIER_VISUAL[tier].icon} {tierTitle(tier, t)}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState icon="📖" title={t('admin.noSubjects')} />
      ) : (
        grouped.map((group) => {
          const visual = TIER_VISUAL[group.id];
          return (
            <section key={group.id} className="admin-subjects-group">
              <header
                className="admin-subjects-group__head"
                style={{ '--group-accent': visual.accent } as CSSProperties}
              >
                <span className="admin-subjects-group__icon" aria-hidden="true">
                  {visual.icon}
                </span>
                <div>
                  <h2 className="admin-subjects-group__title">{tierTitle(group.id, t)}</h2>
                  <p className="admin-subjects-group__count">
                    {t('admin.academicSetup.subjectsCount', { count: group.subjects.length })}
                  </p>
                </div>
              </header>
              <div className="admin-subjects-grid">
                {group.subjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    meta={buildSubjectRowMeta(subject, levelsById, nameCounts, t)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
