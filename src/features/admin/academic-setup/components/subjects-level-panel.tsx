'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { Level, SchoolClass, Subject } from '@/types/class';
import { groupSubjectsByLevel } from '../utils/summary';

function countClassesForLevel(classes: SchoolClass[], levelId: number): number {
  return classes.filter((c) => c.level?.id === levelId).length;
}

export function SubjectsLevelPanel({
  levels,
  subjects,
  classes,
  canManage,
  onEnableSubjects,
}: {
  levels: Level[];
  subjects: Subject[];
  classes: SchoolClass[];
  canManage: boolean;
  onEnableSubjects: (levelId: number) => void;
}) {
  const t = useT();
  const [levelId, setLevelId] = useState<string>(levels[0] ? String(levels[0].id) : '');

  const groups = useMemo(
    () => groupSubjectsByLevel(levels, classes, subjects),
    [levels, classes, subjects],
  );

  const activeLevel = levels.find((l) => String(l.id) === levelId) ?? null;
  const activeGroup = groups.find((g) => String(g.levelId) === levelId) ?? null;
  const subjectCount =
    activeGroup?.subjects.length ??
    activeLevel?.subjects_count ??
    subjects.filter((s) => s.level_id === activeLevel?.id).length;
  const classCount = activeLevel ? countClassesForLevel(classes, activeLevel.id) : 0;

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
    <div className="col" style={{ gap: 16 }}>
      <label className="col" style={{ gap: 6 }}>
        <span className="tiny muted">{t('admin.selectLevel')}</span>
        <select
          className="input"
          value={levelId}
          onChange={(e) => setLevelId(e.target.value)}
        >
          {levels.map((l) => {
            const group = groups.find((g) => g.levelId === l.id);
            const count = group?.subjects.length ?? l.subjects_count ?? 0;
            const clsCount = countClassesForLevel(classes, l.id);
            return (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.code ? ` (${l.code})` : ''}
                {l.cycle?.name ? ` · ${l.cycle.name}` : ''}
                {` · ${t('admin.academicSetup.guided.levelSubjectCount', { count })}`}
                {` · ${t('admin.academicSetup.guided.levelClassCount', { count: clsCount })}`}
                {l.supports_tracks ? ` · ${t('admin.academicSetup.guided.supportsTracks')}` : ''}
              </option>
            );
          })}
        </select>
      </label>

      {activeLevel && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="tiny muted">
            {t('admin.academicSetup.subjectsActive', { count: subjectCount })}
          </span>
          {activeLevel.supports_tracks && (
            <Badge tone="blue">{t('admin.academicSetup.guided.supportsTracks')}</Badge>
          )}
          {canManage && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => onEnableSubjects(activeLevel.id)}
            >
              {t('admin.academicSetup.guided.actionEnableSubjects')}
            </button>
          )}
        </div>
      )}

      {activeGroup ? (
        <div>
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
