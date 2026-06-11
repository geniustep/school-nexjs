'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { LevelGroup } from '../types';
import type { SchoolClass } from '@/types/class';
import { levelSupportsTracks } from '../utils/guided-flow';
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
  const [open, setOpen] = useState(true);
  const supportsTracks =
    group.supports_tracks ??
    (trackLevels ? levelSupportsTracks(group.id, trackLevels) : false);
  const classCount = group.classes_count ?? group.classes.length;
  const subjectCountDisplay = group.subjects_count ?? subjectCount;

  return (
    <div className="academic-setup-level">
      <div className="academic-setup-level__head">
        <button type="button" className="academic-setup-level__head-main" onClick={() => setOpen((v) => !v)}>
        <span>
          <strong>{group.name}</strong>
          {group.code && <span className="tiny muted"> {group.code}</span>}
          {group.cycle?.name && (
            <span className="tiny muted block mt-2">{group.cycle.name}</span>
          )}
          <span className="tiny muted block mt-2">
            {t('admin.academicSetup.levelMeta', {
              classes: classCount,
              students: group.studentCount,
            })}
          </span>
          <span className="row tiny muted mt-2" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span>{t('admin.academicSetup.guided.levelSubjectCount', { count: subjectCountDisplay })}</span>
            {supportsTracks && (
              <Badge tone="blue">{t('admin.academicSetup.guided.supportsTracks')}</Badge>
            )}
          </span>
        </span>
        <span aria-hidden>{open ? '▾' : '▸'}</span>
        </button>
        {onLevelRemoved && (
          <LevelClassActions group={group} canManage={canManage} onRemoved={onLevelRemoved} />
        )}
      </div>
      {open && (
        <div className="academic-setup-level__body">
          {group.classes.length === 0 ? (
            <p className="muted tiny">{t('admin.academicSetup.noClassesInLevel')}</p>
          ) : (
            group.classes.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  className="academic-setup-class-row"
                  data-selected={selectedClassId === cls.id || undefined}
                  onClick={() => onSelectClass(cls)}
                >
                  <span>
                    <strong>{cls.name}</strong>
                    {cls.track?.name && (
                      <span className="tiny muted block">{cls.track.name}</span>
                    )}
                    <span className="tiny muted block mt-2">
                      {t('admin.academicSetup.classMeta', {
                        students: cls.student_count ?? 0,
                        subjects: cls.subjects?.length ?? 0,
                      })}
                    </span>
                  </span>
                  <Badge tone={cls.status === 'active' ? 'green' : 'slate'}>
                    {cls.status}
                  </Badge>
                </button>
              ))
          )}
          {canManage && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {onAddClass && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onAddClass(group.id)}
                >
                  + {t('admin.addClass')}
                </button>
              )}
              {onBatchClasses && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onBatchClasses(group.id)}
                >
                  + {t('admin.academicSetup.guided.batchClasses')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
