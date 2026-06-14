'use client';

import { useState, type ReactNode } from 'react';
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
  const [open, setOpen] = useState(group.classes.length > 0);
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
  const bodyId = `level-body-${group.id}`;

  return (
    <article className="academic-level-card" data-has-classes={hasClasses || undefined}>
      <header className="academic-level-card__header">
        <div className="academic-level-card__main">
          <div className="academic-level-card__identity">
            {hasClasses ? (
              <button
                type="button"
                className="academic-level-card__toggle"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => setOpen((v) => !v)}
              >
                <span
                  className="academic-level-card__chevron"
                  data-open={open || undefined}
                  aria-hidden
                />
                <span className="academic-level-card__title">{levelLabel.primary}</span>
              </button>
            ) : (
              <strong className="academic-level-card__title">{levelLabel.primary}</strong>
            )}

            {(levelLabel.secondary || group.cycle?.name) && (
              <p className="academic-level-card__code">
                {levelLabel.secondary ? <span dir="ltr">{levelLabel.secondary}</span> : null}
                {levelLabel.secondary && group.cycle?.name && <span aria-hidden> · </span>}
                {group.cycle?.name}
              </p>
            )}
          </div>

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

          {!hasClasses && (
            <p className="academic-level-card__empty-hint">
              {t(levelCardEmptyHintKey(statsInput.tracks))}
            </p>
          )}
        </div>

        <div className="academic-level-card__actions">
          {canManage && onAddClass && (
            <button
              type="button"
              className="btn btn--primary btn--sm academic-level-card__add-btn"
              onClick={() => setAddDrawerOpen(true)}
            >
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

      {open && hasClasses && (
        <div id={bodyId} className="academic-level-card__body">
          <div className="academic-level-card__classes-rail">
            {group.classes.map((cls) => {
              const classLabel = formatAcademicClassLabel(cls, locale);
              return (
              <div key={cls.id} className="academic-class-card">
              <button
                type="button"
                className="academic-class-card__main"
                data-selected={selectedClassId === cls.id || undefined}
                onClick={() => onSelectClass(cls)}
              >
                <strong className="academic-class-card__name">{classLabel.primary}</strong>
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
                    <span className="academic-class-card__subjects-source">{sourceLine}</span>
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
