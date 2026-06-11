'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { Level, Subject } from '@/types/class';
import { groupSubjectsByLevel } from '../utils/summary';

export function SubjectsLevelPanel({
  levels,
  subjects,
  classes,
  canManage,
}: {
  levels: Level[];
  subjects: Subject[];
  classes: import('@/types/class').SchoolClass[];
  canManage: boolean;
}) {
  const t = useT();
  const [levelId, setLevelId] = useState<string>(levels[0] ? String(levels[0].id) : '');

  const groups = useMemo(
    () => groupSubjectsByLevel(levels, classes, subjects),
    [levels, classes, subjects],
  );

  const activeGroup = groups.find((g) => String(g.levelId) === levelId) ?? null;

  if (!levels.length) {
    return (
      <div className="academic-setup-gap-banner" role="status">
        <p>{t('admin.academicSetup.guided.lockNoLevels')}</p>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <label className="col" style={{ gap: 6 }}>
        <span className="tiny muted">{t('admin.selectLevel')}</span>
        <select
          className="input"
          value={levelId}
          onChange={(e) => setLevelId(e.target.value)}
        >
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} {l.code ? `(${l.code})` : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="academic-setup-gap-banner" role="alert">
        <strong>{t('admin.academicSetup.guided.subjectsApiBlockedTitle')}</strong>
        <p className="tiny mt-2">{t('admin.academicSetup.guided.subjectsApiBlockedDesc')}</p>
      </div>

      {activeGroup ? (
        <div>
          <p className="tiny muted mb-2">
            {t('admin.academicSetup.subjectsActive', { count: activeGroup.subjects.length })}
          </p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {activeGroup.subjects.map((subject) => (
              <Badge key={subject.id} tone="blue">
                {subject.name}
              </Badge>
            ))}
            {!activeGroup.subjects.length && (
              <p className="muted tiny">{t('admin.noSubjects')}</p>
            )}
          </div>
        </div>
      ) : (
        <p className="muted">{t('admin.noSubjects')}</p>
      )}

      {canManage && (
        <p className="tiny muted">{t('admin.academicSetup.guided.subjectsSecondaryHint')}</p>
      )}
    </div>
  );
}
