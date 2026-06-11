'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { DerivedAssignment } from '../types';

export function AssignmentBySubject({ assignments }: { assignments: DerivedAssignment[] }) {
  const t = useT();

  const grouped = useMemo(() => {
    const map = new Map<number, DerivedAssignment[]>();
    for (const row of assignments) {
      const list = map.get(row.subjectId) ?? [];
      list.push(row);
      map.set(row.subjectId, list);
    }
    return map;
  }, [assignments]);

  const subjects = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of assignments) seen.set(row.subjectId, row.subjectName);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [assignments]);

  return (
    <div>
      {subjects.map(([subjectId, subjectName]) => {
        const rows = grouped.get(subjectId) ?? [];
        const missing = rows.filter((r) => r.status === 'unassigned').length;
        return (
          <div
            key={subjectId}
            style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}
          >
            <div className="between mb-2">
              <strong>{subjectName}</strong>
              <span className="tiny muted">
                {t('admin.academicSetup.subjectAssignmentMeta', {
                  total: rows.length,
                  missing,
                })}
              </span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="academic-setup-assignment-row">
                <span>{row.className}</span>
                <span>{row.teacherName ?? t('admin.academicSetup.unassigned')}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
