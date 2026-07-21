'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { IconChevronDown } from '@/components/icons/admin-icons';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { SetupReadinessIssue } from '@/types/academic-setup';
import { AcademicSubjectCard } from './academic-subject-card';
import { formatAcademicLevelLabel } from '../utils/format-academic-label';
import { dedupeSubjectsForDisplay } from '../utils/subject-present';
import { groupSubjectsByLevel } from '../utils/summary';

function countClassesForLevel(classes: SchoolClass[], levelId: number): number {
  return classes.filter((c) => c.level?.id === levelId).length;
}

function subjectHasAssignmentGap(
  subjectId: number,
  issues: SetupReadinessIssue[],
): boolean {
  return issues.some(
    (i) =>
      i.code === 'assignment_missing' &&
      (i.entity?.type === 'subject' ? Number(i.entity.id) === subjectId : false),
  );
}

export function SubjectsLevelPanel({
  levels,
  subjects,
  classes,
  canManage,
  onEnableSubjects,
  onManageEnablement,
  readinessIssues = [],
}: {
  levels: Level[];
  subjects: Subject[];
  classes: SchoolClass[];
  canManage: boolean;
  onEnableSubjects: (levelId: number) => void;
  /** Read-only enablement matrix (write awaits Odoo contract). */
  onManageEnablement?: (levelId: number) => void;
  readinessIssues?: SetupReadinessIssue[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const [levelId, setLevelId] = useState<string>(levels[0] ? String(levels[0].id) : '');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const groups = useMemo(
    () => groupSubjectsByLevel(levels, classes, subjects),
    [levels, classes, subjects],
  );

  const activeLevel = levels.find((l) => String(l.id) === levelId) ?? null;
  const activeGroup = groups.find((g) => String(g.levelId) === levelId) ?? null;
  const displaySubjects = useMemo(
    () => dedupeSubjectsForDisplay(activeGroup?.subjects ?? []),
    [activeGroup?.subjects],
  );
  const classCount = activeLevel ? countClassesForLevel(classes, activeLevel.id) : 0;
  const activeLevelLabel = activeLevel ? formatAcademicLevelLabel(activeLevel, locale) : null;

  if (!levels.length) {
    return (
      <div className="academic-setup-gap-banner" role="status">
        <p>{t('admin.academicSetup.guided.lockNoLevels')}</p>
        <Link href="/admin/settings/academic-setup/classes" className="btn btn--primary btn--sm mt-2">
          {t('admin.academicSetup.guided.actionAddLevels')}
        </Link>
      </div>
    );
  }

  return (
    <div className="academic-subjects-panel">
      <div className="academic-subjects-panel__toolbar">
        <label className="academic-subjects-panel__level-select">
          <span className="academic-setup-sr-only">{t('admin.selectLevel')}</span>
          <select
            className="input academic-subjects-panel__level-input"
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            aria-label={t('admin.selectLevel')}
          >
            {levels.map((l) => {
              const label = formatAcademicLevelLabel(l, locale);
              return (
              <option key={l.id} value={l.id}>
                {label.secondary ? `${label.primary} (${label.secondary})` : label.primary}
              </option>
              );
            })}
          </select>
          <IconChevronDown size={16} className="academic-subjects-panel__level-chevron" aria-hidden />
        </label>

        {activeLevel && (
          <div className="academic-subjects-panel__level-context">
            <strong className="academic-subjects-panel__level-name">{activeLevelLabel?.primary ?? activeLevel.name}</strong>
            <span className="academic-subjects-panel__level-meta">
              {activeLevelLabel?.secondary && <span dir="ltr">{activeLevelLabel.secondary}</span>}
              {activeLevel.cycle?.name && (
                <span>
                  {activeLevelLabel?.secondary ? ' · ' : ''}
                  {activeLevel.cycle.name}
                </span>
              )}
            </span>
            <span className="academic-subjects-panel__level-stats">
              {t('admin.academicSetup.subjectsActive', { count: displaySubjects.length })}
              {' · '}
              {t('admin.academicSetup.guided.levelClassCount', { count: classCount })}
            </span>
          </div>
        )}

        {activeLevel && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {onManageEnablement ? (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => onManageEnablement(activeLevel.id)}
              >
                {t('admin.subjectEnablement.manageSubjectsAction')}
              </button>
            ) : null}
            {canManage ? (
              <button
                type="button"
                className="btn btn--primary btn--sm academic-subjects-panel__enable-btn"
                onClick={() => onEnableSubjects(activeLevel.id)}
              >
                {t('admin.academicSetup.enableSubjects')}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {displaySubjects.length > 0 ? (
        <ul className="academic-subjects-panel__list" role="list">
          {displaySubjects
            .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name))
            .map((subject) => (
              <li key={subject.id}>
                <AcademicSubjectCard
                  subject={subject}
                  missingAssignment={subjectHasAssignmentGap(subject.id, readinessIssues)}
                />
              </li>
            ))}
        </ul>
      ) : (
        <div className="academic-empty-state">
          <p className="academic-empty-state__title">{t('admin.academicSetup.noSubjectsForLevel')}</p>
          <p className="academic-empty-state__desc">{t('admin.academicSetup.noSubjectsForLevelDesc')}</p>
          {canManage && activeLevel && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onEnableSubjects(activeLevel.id)}
            >
              {t('admin.academicSetup.enableSubjects')}
            </button>
          )}
        </div>
      )}

      {canManage && (
        <div className="academic-subjects-panel__advanced">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {t('admin.academicSetup.advancedOptions')}
          </button>
          {advancedOpen && (
            <p className="academic-subjects-panel__advanced-hint">
              {t('admin.academicSetup.guided.subjectsSecondaryHint')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
