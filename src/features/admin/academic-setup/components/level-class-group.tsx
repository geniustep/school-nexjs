'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { LevelGroup } from '../types';
import type { SchoolClass } from '@/types/class';
import { levelSupportsTracks } from '../utils/guided-flow';
import {
  classStatusLabel,
  computeLevelStatus,
  LEVEL_STATUS_TONE,
} from '../utils/level-status';
import { AddClassesDrawer } from './add-classes-drawer';
import { LevelClassActions } from './level-class-actions';

export function LevelClassGroup({
  group,
  selectedClassId,
  onSelectClass,
  onAddClass,
  onBatchClasses,
  onLevelRemoved,
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
  canManage: boolean;
  trackLevels?: import('../utils/guided-flow').TrackLevelRef[];
  subjectCount?: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(group.classes.length > 0);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const supportsTracks =
    group.supports_tracks ??
    (trackLevels ? levelSupportsTracks(group.id, trackLevels) : false);
  const classCount = group.classes_count ?? group.classes.length;
  const subjectCountDisplay = group.subjects_count ?? subjectCount;
  const levelStatus = computeLevelStatus(group, subjectCountDisplay);
  const hasClasses = group.classes.length > 0;

  return (
    <article className="academic-setup-level">
      <header className="academic-setup-level__head">
        <button
          type="button"
          className="academic-setup-level__head-main"
          onClick={() => hasClasses && setOpen((v) => !v)}
          aria-expanded={hasClasses ? open : undefined}
          disabled={!hasClasses}
        >
          <div className="academic-setup-level__info">
            <div className="academic-setup-level__title-row">
              <strong className="academic-setup-level__name">{group.name}</strong>
              {hasClasses && (
                <span className="academic-setup-level__chevron" aria-hidden>
                  {open ? '▾' : '▸'}
                </span>
              )}
            </div>
            {(group.code || group.cycle?.name) && (
              <p className="academic-setup-level__code">
                {group.code && <span dir="ltr">{group.code}</span>}
                {group.code && group.cycle?.name && <span aria-hidden> · </span>}
                {group.cycle?.name}
              </p>
            )}
            <p className="academic-setup-level__stats">
              {t('admin.academicSetup.levelStats', {
                classes: classCount,
                students: group.studentCount,
                subjects: subjectCountDisplay,
              })}
            </p>
            <div className="academic-setup-level__badges">
              <Badge tone={LEVEL_STATUS_TONE[levelStatus]}>
                {t(`admin.academicSetup.levelStatus.${levelStatus}`)}
              </Badge>
              {supportsTracks && (
                <Badge tone="blue">
                  <span aria-hidden>◇ </span>
                  {t('admin.academicSetup.tracksAvailable')}
                </Badge>
              )}
            </div>
          </div>
        </button>

        <div className="academic-setup-level__actions">
          {canManage && onAddClass && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setAddDrawerOpen(true)}
            >
              {t('admin.academicSetup.addClasses')}
            </button>
          )}
          {onLevelRemoved && (
            <LevelClassActions
              group={group}
              canManage={canManage}
              supportsTracks={supportsTracks}
              onRemoved={onLevelRemoved}
            />
          )}
        </div>
      </header>

      {open && hasClasses && (
        <div className="academic-setup-level__body">
          {group.classes.map((cls) => (
            <div key={cls.id} className="academic-setup-class-card">
              <button
                type="button"
                className="academic-setup-class-card__main"
                data-selected={selectedClassId === cls.id || undefined}
                onClick={() => onSelectClass(cls)}
              >
                <strong>{cls.name}</strong>
                {cls.track?.name && (
                  <span className="academic-setup-class-card__track">{cls.track.name}</span>
                )}
                <span className="academic-setup-class-card__meta">
                  {t('admin.academicSetup.classMeta', {
                    students: cls.student_count ?? 0,
                    subjects: cls.subjects?.length ?? 0,
                  })}
                </span>
              </button>
              <div className="academic-setup-class-card__actions">
                <Badge tone={cls.status === 'active' ? 'green' : 'slate'}>
                  {classStatusLabel(cls.status, t)}
                </Badge>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onSelectClass(cls)}
                >
                  {t('common.view')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasClasses && (
        <div className="academic-setup-level__empty">
          <p className="academic-setup-level__empty-text">
            {t('admin.academicSetup.noClassesInLevel')}
          </p>
          {canManage && onAddClass && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setAddDrawerOpen(true)}
            >
              {t('admin.academicSetup.createFirstClass')}
            </button>
          )}
        </div>
      )}

      {onAddClass && (
        <AddClassesDrawer
          open={addDrawerOpen}
          levelName={group.name}
          onClose={() => setAddDrawerOpen(false)}
          onAddSingle={() => onAddClass(group.id)}
          onAddBatch={onBatchClasses ? () => onBatchClasses(group.id) : undefined}
          batchAvailable={!!onBatchClasses}
        />
      )}
    </article>
  );
}
