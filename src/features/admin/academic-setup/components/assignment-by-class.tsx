'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { DerivedAssignment } from '../types';
import { rankTeachersForAssignment } from '../utils/teacher-ranking';
import { TeacherSuggestionList } from './teacher-suggestion-list';
import { SetupDrawer } from './setup-drawer';

export function AssignmentByClass({
  classes,
  teachers,
  assignments,
  canManage,
  initialClassId,
  initialSubjectId,
}: {
  classes: SchoolClass[];
  teachers: Teacher[];
  assignments: DerivedAssignment[];
  canManage: boolean;
  initialClassId?: number | null;
  initialSubjectId?: number | null;
}) {
  const t = useT();
  const [pick, setPick] = useState<DerivedAssignment | null>(() => {
    if (initialClassId && initialSubjectId) {
      return (
        assignments.find(
          (a) => a.classId === initialClassId && a.subjectId === initialSubjectId,
        ) ?? null
      );
    }
    return null;
  });

  const byClass = useMemo(() => {
    const map = new Map<number, DerivedAssignment[]>();
    for (const row of assignments) {
      const list = map.get(row.classId) ?? [];
      list.push(row);
      map.set(row.classId, list);
    }
    return map;
  }, [assignments]);

  const activeClass = pick ? classes.find((c) => c.id === pick.classId) : null;

  return (
    <>
      {classes.map((cls) => {
        const rows = byClass.get(cls.id) ?? [];
        const assigned = rows.filter((r) => r.status === 'assigned').length;
        const missing = rows.length - assigned;
        return (
          <div key={cls.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
            <div className="between mb-2">
              <strong>{cls.name}</strong>
              <span className="tiny muted">
                {t('admin.academicSetup.classAssignmentMeta', {
                  total: rows.length,
                  assigned,
                  missing,
                })}
              </span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="academic-setup-assignment-row">
                <span>{row.subjectName}</span>
                {row.teacherName ? (
                  <span>{row.teacherName}</span>
                ) : (
                  <button
                    type="button"
                    className="academic-setup-unassigned"
                    onClick={() => setPick(row)}
                    disabled={!canManage}
                  >
                    {t('admin.academicSetup.unassigned')}
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })}

      <SetupDrawer
        open={!!pick}
        title={pick ? `${pick.subjectName} · ${pick.className}` : ''}
        onClose={() => setPick(null)}
      >
        {pick && activeClass && (
          <>
            <p className="muted tiny">{t('admin.academicSetup.pickTeacherHint')}</p>
            <TeacherSuggestionList
              suggestions={rankTeachersForAssignment(activeClass, pick.subjectId, teachers, t)}
              canConfirm={false}
              onConfirm={() => {}}
            />
            {!canManage && (
              <p className="tiny muted mt-2">{t('admin.pageForbidden')}</p>
            )}
          </>
        )}
      </SetupDrawer>
    </>
  );
}
