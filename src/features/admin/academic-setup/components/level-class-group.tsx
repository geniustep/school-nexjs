'use client';

import { useState, type ReactNode } from 'react';
import { IconBuilding, IconPlus } from '@/components/icons/admin-icons';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { LevelGroup } from '../types';
import type { SchoolClass } from '@/types/class';
import { levelSupportsTracks } from '../utils/guided-flow';
import {
  classEffectiveSubjectsLine,
  classReadinessBadge,
  classStudentCountLine,
  classSubjectsSourceLine,
} from '../utils/class-display';
import {
  formatAcademicClassLabel,
  formatAcademicLevelLabel,
} from '../utils/format-academic-label';
import {
  buildLevelStatsSummary,
  levelCardEmptyHintKey,
  levelCardStatsInput,
  levelCtaI18nKey,
} from '../utils/level-card-present';
import {
  classStatusLabel,
  computeLevelStatus,
  LEVEL_STATUS_TONE,
} from '../utils/level-status';
import { AddClassesDrawer } from './add-classes-drawer';
import { ClassRowActions } from './class-row-actions';
import { LevelClassActions } from './level-class-actions';

function CompactBadge({
  tone,
  variant,
  children,
}: {
  tone: 'green' | 'blue' | 'amber' | 'slate';
  variant: 'status' | 'feature';
  children: ReactNode;
}) {
  return (
    <span
      className={`academic-setup-badge academic-setup-badge--${tone} academic-setup-badge--${variant}`}
    >
      {children}
    </span>
  );
}

export function LevelClassGroup({
  group,
  selectedClassId,
  onSelectClass,
  onAddClass,
  onBatchClasses,
  onLevelRemoved,
  onClassRemoved,
  onEditClass,
  canManage,
  trackLevels,
  subjectCount = 0,
}: {
  group: LevelGroup;
  selectedClassId: number | null;
  onSelectClass: (cls: SchoolClass) => void;
  onAddClass?: (levelId: number) => void;
  onBatchClasses?: (levelId: number) => void;
  onLevelRemoved?: () => void;
  onClassRemoved?: () => void;
  onEditClass?: (cls: SchoolClass) => void;
  canManage: boolean;
  trackLevels?: import('../utils/guided-flow').TrackLevelRef[];
  subjectCount?: number;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const supportsTracks =
    group.supports_tracks ??
    (trackLevels ? levelSupportsTracks(group.id, trackLevels) : false);
  const classCount = group.classes_count ?? group.classes.length;
  const subjectCountDisplay = group.subjects_count ?? subjectCount;
  const statsInput = levelCardStatsInput(group, subjectCountDisplay);
  const levelStatus = computeLevelStatus(group, subjectCountDisplay);
  const hasClasses = group.classes.length > 0;
  const ctaKey = levelCtaI18nKey(classCount);
  const levelLabel = formatAcademicLevelLabel(group, locale);
  const needsClasses = !hasClasses;

  return (
    <article
      className={[
        'academic-level-card',
        'academic-classes-workspace',
        needsClasses ? 'academic-classes-workspace--pending' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-has-classes={hasClasses || undefined}
      aria-labelledby={`level-workspace-title-${group.id}`}
    >
      <header className="academic-level-card__header academic-classes-workspace__header">
        <div className="academic-level-card__main academic-classes-workspace__identity">
          <span className="academic-classes-workspace__icon" aria-hidden>
            <IconBuilding size={20} />
          </span>
          <div className="academic-level-card__identity academic-classes-workspace__copy">
            <h2
              id={`level-workspace-title-${group.id}`}
              className="academic-level-card__title academic-classes-workspace__title"
            >
              {levelLabel.primary}
            </h2>

            {(levelLabel.secondary || group.cycle?.name) && (
              <p className="academic-level-card__code academic-classes-workspace__meta">
                {levelLabel.secondary ? <span dir="ltr">{levelLabel.secondary}</span> : null}
                {levelLabel.secondary && group.cycle?.name && <span aria-hidden> · </span>}
                {group.cycle?.name}
              </p>
            )}

            <div className="academic-level-card__meta">
              <div className="academic-level-card__badges">
                <CompactBadge tone={LEVEL_STATUS_TONE[levelStatus]} variant="status">
                  {t(`admin.academicSetup.levelStatus.${levelStatus}`)}
                </CompactBadge>
                {supportsTracks && (
                  <CompactBadge tone="blue" variant="feature">
                    <span className="academic-setup-badge__full">
                      {t('admin.academicSetup.tracksAvailable')}
                    </span>
                    <span className="academic-setup-badge__short">
                      {t('admin.academicSetup.tracksAvailableShort')}
                    </span>
                  </CompactBadge>
                )}
              </div>

              <p className="academic-level-card__stats">
                {buildLevelStatsSummary(t, locale, statsInput)}
              </p>
            </div>
          </div>
        </div>

        <div className="academic-level-card__actions academic-classes-workspace__actions">
          {canManage && onAddClass && (
            <button
              type="button"
              className="btn btn--primary btn--sm academic-level-card__add-btn"
              onClick={() => setAddDrawerOpen(true)}
            >
              <IconPlus size={16} aria-hidden />
              {t(ctaKey)}
            </button>
          )}
          {canManage && (
            <LevelClassActions
              group={group}
              canManage={canManage}
              supportsTracks={supportsTracks}
              onRemoved={onLevelRemoved ?? (() => {})}
            />
          )}
        </div>
      </header>

      {hasClasses ? (
        <div className="academic-level-card__body">
          <p className="academic-classes-workspace__count">
            {t('admin.academicSetup.classesActiveCount', { count: classCount })}
          </p>
          <div className="academic-level-card__classes-rail academic-classes-workspace__grid">
            {group.classes.map((cls) => {
              const classLabel = formatAcademicClassLabel(cls, locale);
              const selected = selectedClassId === cls.id;
              return (
                <div
                  key={cls.id}
                  className={[
                    'academic-class-card',
                    selected ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className="academic-class-card__main"
                    data-selected={selected || undefined}
                    onClick={() => onSelectClass(cls)}
                  >
                    <strong className="academic-class-card__name">
                      {classLabel.primary}
                    </strong>
                    {classLabel.secondary ? (
                      <span className="academic-class-card__code tiny muted mono" dir="ltr">
                        {classLabel.secondary}
                      </span>
                    ) : null}
                    {cls.track?.name && (
                      <span className="academic-class-card__track">{cls.track.name}</span>
                    )}
                    <span className="academic-class-card__subjects-primary">
                      {classEffectiveSubjectsLine(t, locale, cls)}
                    </span>
                    {(() => {
                      const sourceLine = classSubjectsSourceLine(t, locale, cls);
                      return sourceLine ? (
                        <span className="academic-class-card__subjects-source">
                          {sourceLine}
                        </span>
                      ) : null;
                    })()}
                    <span className="academic-class-card__meta">
                      {classStudentCountLine(t, locale, cls.student_count ?? 0)}
                    </span>
                    {(() => {
                      const readiness = classReadinessBadge(t, locale, cls);
                      return readiness ? (
                        <span className="academic-class-card__readiness">{readiness}</span>
                      ) : null;
                    })()}
                  </button>
                  <div className="academic-class-card__actions">
                    <CompactBadge
                      tone={cls.status === 'active' ? 'green' : 'slate'}
                      variant="status"
                    >
                      {classStatusLabel(cls.status, t)}
                    </CompactBadge>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => onSelectClass(cls)}
                    >
                      {t('common.view')}
                    </button>
                    <ClassRowActions
                      cls={cls}
                      canManage={canManage}
                      onView={() => onSelectClass(cls)}
                      onEdit={onEditClass ? () => onEditClass(cls) : undefined}
                      onRemoved={onClassRemoved}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="academic-classes-empty">
          <div className="academic-classes-empty__mark" aria-hidden>
            <IconBuilding size={28} />
          </div>
          <p className="academic-classes-empty__title academic-level-card__empty-hint">
            {t(levelCardEmptyHintKey(statsInput.tracks))}
          </p>
          <p className="academic-classes-empty__desc">
            {t('admin.academicSetup.classesEmptyDesc')}
          </p>
          {canManage && onAddClass && (
            <div className="academic-classes-empty__actions">
              <button
                type="button"
                className="btn btn--primary academic-classes-empty__cta"
                onClick={() => setAddDrawerOpen(true)}
              >
                <IconPlus size={16} aria-hidden />
                {t(ctaKey)}
              </button>
            </div>
          )}
        </div>
      )}

      {onAddClass && (
        <AddClassesDrawer
          open={addDrawerOpen}
          levelName={levelLabel.primary}
          onClose={() => setAddDrawerOpen(false)}
          onAddSingle={() => onAddClass(group.id)}
          onAddBatch={onBatchClasses ? () => onBatchClasses(group.id) : undefined}
          batchAvailable={!!onBatchClasses}
        />
      )}
    </article>
  );
}
