'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { DerivedAssignment } from '../types';
import { rankTeachersForAssignment } from '../utils/teacher-ranking';
import { SetupDrawer } from './setup-drawer';
import { TeacherSuggestionList } from './teacher-suggestion-list';

export function MissingAssignmentsDrawer({
  open,
  onClose,
  unassigned,
  classes,
  teachers,
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  unassigned: DerivedAssignment[];
  classes: SchoolClass[];
  teachers: Teacher[];
  canManage: boolean;
}) {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(null);
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const active = unassigned.find((u) => u.id === activeId) ?? null;
  const activeClass = active ? classMap.get(active.classId) : null;
  const suggestions =
    active && activeClass
      ? rankTeachersForAssignment(activeClass, active.subjectId, teachers, t)
      : [];
  const top = suggestions.find((s) => s.tier === 'best' || s.tier === 'suitable');

  return (
    <SetupDrawer
      open={open}
      title={t('admin.academicSetup.completeMissing')}
      onClose={onClose}
    >
      <p className="muted tiny">
        {t('admin.academicSetup.missingCount', { count: unassigned.length })}
      </p>
      <div className="col" style={{ gap: 8, marginTop: 12 }}>
        {unassigned.map((row) => (
          <button
            key={row.id}
            type="button"
            className="academic-setup-class-row"
            onClick={() => setActiveId(row.id)}
          >
            <span>
              <strong>
                {row.subjectName} — {row.className}
              </strong>
              {top && row.id !== activeId && (
                <span className="tiny muted block mt-2">
                  {t('admin.academicSetup.suggestedTeacher', { name: top.teacher.name })}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      {active && activeClass && (
        <div style={{ marginTop: 16 }}>
          <strong>{t('admin.academicSetup.pickTeacherHint')}</strong>
          <TeacherSuggestionList
            suggestions={suggestions}
            selectedTeacherId={top?.teacher.id}
            canConfirm={canManage}
            onConfirm={() => {}}
          />
        </div>
      )}
    </SetupDrawer>
  );
}
