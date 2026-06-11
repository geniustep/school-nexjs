'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { LevelGroup } from '../types';
import type { SchoolClass } from '@/types/class';

export function LevelClassGroup({
  group,
  selectedClassId,
  onSelectClass,
  onAddClass,
  canManage,
}: {
  group: LevelGroup;
  selectedClassId: number | null;
  onSelectClass: (cls: SchoolClass) => void;
  onAddClass?: (levelId: number) => void;
  canManage: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(true);

  return (
    <div className="academic-setup-level">
      <button type="button" className="academic-setup-level__head" onClick={() => setOpen((v) => !v)}>
        <span>
          <strong>{group.name}</strong>
          <span className="tiny muted">
            {' '}
            · {t('admin.academicSetup.levelMeta', {
              classes: group.classes.length,
              students: group.studentCount,
            })}
          </span>
        </span>
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
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
          {canManage && onAddClass && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onAddClass(group.id)}
            >
              + {t('admin.addClass')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
