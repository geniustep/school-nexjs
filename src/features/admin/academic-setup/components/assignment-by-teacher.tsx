'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { Teacher } from '@/types/teacher';
import type { DerivedAssignment } from '../types';

export function AssignmentByTeacher({
  assignments,
  teachers,
}: {
  assignments: DerivedAssignment[];
  teachers: Teacher[];
}) {
  const t = useT();

  const grouped = useMemo(() => {
    const map = new Map<number, DerivedAssignment[]>();
    for (const row of assignments.filter((a) => a.status === 'assigned' && a.teacherId)) {
      const id = row.teacherId!;
      const list = map.get(id) ?? [];
      list.push(row);
      map.set(id, list);
    }
    return map;
  }, [assignments]);

  return (
    <div>
      {teachers.map((teacher) => {
        const rows = grouped.get(teacher.id) ?? [];
        return (
          <div
            key={teacher.id}
            style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}
          >
            <div className="between mb-2">
              <strong>{teacher.name}</strong>
              <span className="tiny muted">
                {t('admin.academicSetup.teacherAssignmentCount', { count: rows.length })}
              </span>
            </div>
            {rows.length === 0 ? (
              <p className="tiny muted">{t('admin.academicSetup.noTeacherAssignments')}</p>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="academic-setup-assignment-row">
                  <span>{row.className}</span>
                  <span>{row.subjectName}</span>
                </div>
              ))
            )}
          </div>
        );
      })}
      {teachers.length === 0 && (
        <p className="muted" style={{ padding: 14 }}>
          {t('empty.classes')}
        </p>
      )}
    </div>
  );
}
