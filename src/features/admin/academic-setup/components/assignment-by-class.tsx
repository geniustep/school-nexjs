'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';
import type { SetupReadinessIssue, TeachingAssignment } from '@/types/academic-setup';

export function AssignmentByClass({
  classes,
  assignments,
  missingIssues,
  canManage,
  onPickMissing,
  onEdit,
}: {
  classes: SchoolClass[];
  assignments: TeachingAssignment[];
  missingIssues: SetupReadinessIssue[];
  canManage: boolean;
  onPickMissing: (issue: SetupReadinessIssue) => void;
  onEdit: (assignment: TeachingAssignment) => void;
}) {
  const t = useT();

  const byClass = useMemo(() => {
    const map = new Map<number, TeachingAssignment[]>();
    for (const row of assignments) {
      const list = map.get(row.class.id) ?? [];
      list.push(row);
      map.set(row.class.id, list);
    }
    return map;
  }, [assignments]);

  const missingByClass = useMemo(() => {
    const map = new Map<number, SetupReadinessIssue[]>();
    for (const issue of missingIssues) {
      const classId = Number(issue.target.query?.class_id ?? issue.context?.class_id ?? 0);
      if (!classId) continue;
      const list = map.get(classId) ?? [];
      list.push(issue);
      map.set(classId, list);
    }
    return map;
  }, [missingIssues]);

  const classList = classes.length ? classes : [...new Set(assignments.map((a) => a.class.id))].map((id) => {
    const a = assignments.find((x) => x.class.id === id)!;
    return { id, name: a.class.name, level: a.class.level_name ? { id: a.class.level_id ?? 0, name: a.class.level_name } : null } as SchoolClass;
  });

  if (!classList.length && !assignments.length) {
    return <p className="muted" style={{ padding: 14 }}>{t('admin.academicSetup.noAssignments')}</p>;
  }

  return (
    <>
      {classList.map((cls) => {
        const rows = byClass.get(cls.id) ?? [];
        const missing = missingByClass.get(cls.id) ?? [];
        const assigned = rows.length;
        return (
          <div key={cls.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
            <div className="between mb-2">
              <strong>{cls.name}</strong>
              <span className="tiny muted">
                {t('admin.academicSetup.classAssignmentMeta', {
                  total: assigned + missing.length,
                  assigned,
                  missing: missing.length,
                })}
              </span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="academic-setup-assignment-row">
                <span>{row.subject.name}</span>
                <button
                  type="button"
                  className="academic-setup-unassigned"
                  style={{ color: 'inherit', cursor: canManage ? 'pointer' : 'default' }}
                  onClick={() => canManage && onEdit(row)}
                  disabled={!canManage}
                >
                  {row.teacher.name}
                </button>
              </div>
            ))}
            {missing.map((issue) => (
              <div key={issue.id} className="academic-setup-assignment-row">
                <span>{issue.context?.subject_name as string ?? issue.title}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm academic-setup-assign-cta"
                  onClick={() => canManage && onPickMissing(issue)}
                  disabled={!canManage}
                >
                  {t('admin.academicSetup.assignTeacher')}
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
