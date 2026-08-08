'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { TeachingAssignment } from '@/types/academic-setup';

export function AssignmentBySubject({ assignments, canManage, onEdit }: { assignments: TeachingAssignment[]; canManage: boolean; onEdit: (assignment: TeachingAssignment) => void }) {
  const t = useT();

  const grouped = useMemo(() => {
    const map = new Map<number, { name: string; rows: TeachingAssignment[] }>();
    for (const row of assignments) {
      const entry = map.get(row.subject.id) ?? { name: row.subject.name, rows: [] };
      entry.rows.push(row);
      map.set(row.subject.id, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments]);

  if (!grouped.length) {
    return <p className="muted" style={{ padding: 14 }}>{t('admin.academicSetup.noAssignments')}</p>;
  }

  return (
    <div>
      {grouped.map(({ name, rows }) => (
        <div key={name} style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
          <div className="between mb-2">
            <strong>{name}</strong>
            <span className="tiny muted">
              {t('admin.academicSetup.subjectAssignmentMeta', {
                total: rows.length,
                missing: 0,
              })}
            </span>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="academic-setup-assignment-row">
              <span>{row.class.name}</span>
              <button type="button" className="btn btn--ghost btn--sm" disabled={!canManage} onClick={() => onEdit(row)}>{row.teacher.name}</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
