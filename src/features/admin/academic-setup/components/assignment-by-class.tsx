'use client';

import { useMemo } from 'react';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { SchoolClass, Subject } from '@/types/class';
import type { SetupReadinessIssue, TeachingAssignment } from '@/types/academic-setup';
import { formatAcademicClassLabel } from '../utils/format-academic-label';

type ClassBucket = {
  key: string;
  label: string;
  classes: SchoolClass[];
};

export function AssignmentByClass({
  classes,
  subjects,
  assignments,
  missingIssues,
  canManage,
  onPickMissing,
  onEdit,
}: {
  classes: SchoolClass[];
  subjects: Subject[];
  assignments: TeachingAssignment[];
  missingIssues: SetupReadinessIssue[];
  canManage: boolean;
  onPickMissing: (issue: SetupReadinessIssue) => void;
  onEdit: (assignment: TeachingAssignment) => void;
}) {
  const t = useT();
  const { locale } = useLocale();

  const collator = useMemo(
    () => new Intl.Collator(locale || 'ar', { numeric: true, sensitivity: 'base' }),
    [locale],
  );

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

  const subjectRank = useMemo(() => {
    const rank = new Map<number, number>();
    [...subjects]
      .sort((a, b) => (a.sequence ?? 9999) - (b.sequence ?? 9999) || collator.compare(a.name, b.name))
      .forEach((subject, index) => rank.set(subject.id, index));
    return rank;
  }, [subjects, collator]);

  const classList = useMemo(() => {
    const source = classes.length
      ? classes
      : [...new Set(assignments.map((a) => a.class.id))].map((id) => {
          const a = assignments.find((x) => x.class.id === id)!;
          return {
            id,
            name: a.class.name,
            code: null,
            level: a.class.level_name
              ? { id: a.class.level_id ?? 0, name: a.class.level_name }
              : null,
            academic_year: null,
            student_count: 0,
            capacity: null,
            teachers: [],
            subjects: [],
            status: 'active',
          } as SchoolClass;
        });

    return [...source].sort((a, b) => {
      const levelA = a.level?.name ?? '';
      const levelB = b.level?.name ?? '';
      return collator.compare(levelA, levelB) || collator.compare(a.name, b.name);
    });
  }, [classes, assignments, collator]);

  const groupedClasses = useMemo<ClassBucket[]>(() => {
    const groups = new Map<string, ClassBucket>();
    for (const cls of classList) {
      const label = cls.level?.name?.trim() || t('common.dash');
      const key = cls.level?.id ? `level-${cls.level.id}` : `level-${label}`;
      const bucket = groups.get(key) ?? { key, label, classes: [] };
      bucket.classes.push(cls);
      groups.set(key, bucket);
    }
    return [...groups.values()].sort((a, b) => collator.compare(a.label, b.label));
  }, [classList, collator, t]);

  if (!classList.length && !assignments.length) {
    return <p className="muted assignment-workspace__empty">{t('admin.academicSetup.noAssignments')}</p>;
  }

  return (
    <div className="assignment-levels">
      {groupedClasses.map((group) => (
        <section key={group.key} className="assignment-level-group">
          <header className="assignment-level-group__head">
            <div>
              <span className="assignment-level-group__kicker">{t('admin.academicSetup.level')}</span>
              <h3 dir="auto">{group.label}</h3>
            </div>
            <span className="assignment-level-group__count">{group.classes.length}</span>
          </header>

          <div className="assignment-class-grid">
            {group.classes.map((cls) => {
              const rows = [...(byClass.get(cls.id) ?? [])].sort((a, b) => {
                const rankA = subjectRank.get(a.subject.id) ?? 9999;
                const rankB = subjectRank.get(b.subject.id) ?? 9999;
                return rankA - rankB || collator.compare(a.subject.name, b.subject.name);
              });
              const missing = [...(missingByClass.get(cls.id) ?? [])].sort((a, b) =>
                collator.compare(
                  String(a.context?.subject_name ?? a.title ?? ''),
                  String(b.context?.subject_name ?? b.title ?? ''),
                ),
              );
              const assigned = rows.length;
              const classLabel = formatAcademicClassLabel(cls, locale);

              return (
                <article key={cls.id} className="assignment-class-card">
                  <header className="assignment-class-card__head">
                    <div className="assignment-class-card__identity">
                      <strong dir="auto">{classLabel.primary}</strong>
                      {classLabel.secondary ? (
                        <span className="tiny muted mono" dir="ltr">
                          {classLabel.secondary}
                        </span>
                      ) : null}
                    </div>
                    <span className={missing.length ? 'assignment-class-card__status assignment-class-card__status--warning' : 'assignment-class-card__status'}>
                      {assigned}/{assigned + missing.length}
                    </span>
                  </header>

                  <div className="assignment-class-card__meta">
                    {t('admin.academicSetup.classAssignmentMeta', {
                      total: assigned + missing.length,
                      assigned,
                      missing: missing.length,
                    })}
                  </div>

                  <div className="assignment-subject-grid">
                    {rows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="assignment-subject-tile"
                        onClick={() => canManage && onEdit(row)}
                        disabled={!canManage}
                      >
                        <span className="assignment-subject-tile__subject" dir="auto">{row.subject.name}</span>
                        <span className="assignment-subject-tile__teacher" dir="auto">{row.teacher.name}</span>
                      </button>
                    ))}

                    {missing.map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        className="assignment-subject-tile assignment-subject-tile--missing"
                        onClick={() => canManage && onPickMissing(issue)}
                        disabled={!canManage}
                      >
                        <span className="assignment-subject-tile__subject" dir="auto">
                          {String(issue.context?.subject_name ?? issue.title)}
                        </span>
                        <span className="assignment-subject-tile__teacher">
                          {t('admin.academicSetup.assignTeacher')}
                        </span>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
