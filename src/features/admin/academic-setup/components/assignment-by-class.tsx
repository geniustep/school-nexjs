'use client';

import { useMemo, useState } from 'react';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { SchoolClass, Subject } from '@/types/class';
import type { SetupReadinessIssue, TeachingAssignment } from '@/types/academic-setup';
import { formatAcademicClassLabel } from '../utils/format-academic-label';
import '../assignment-cycle-filter.css';

type ClassBucket = {
  key: string;
  label: string;
  classes: SchoolClass[];
};

type CycleBucket = {
  key: string;
  label: string;
  levels: ClassBucket[];
  classes: SchoolClass[];
};

function missingTeacherLabel(count: number) {
  if (count === 1) return 'مادة واحدة بدون أستاذ';
  if (count === 2) return 'مادتان بدون أستاذ';
  if (count >= 3 && count <= 10) return `${count} مواد بدون أستاذ`;
  return `${count} مادة بدون أستاذ`;
}

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
  const [selectedCycleKey, setSelectedCycleKey] = useState('');
  const [selectedLevelKey, setSelectedLevelKey] = useState('');

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
      .sort(
        (a, b) =>
          (a.sequence ?? 9999) - (b.sequence ?? 9999) || collator.compare(a.name, b.name),
      )
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
      const cycleA = a.level?.cycle?.name ?? '';
      const cycleB = b.level?.cycle?.name ?? '';
      const levelA = a.level?.name ?? '';
      const levelB = b.level?.name ?? '';
      return (
        collator.compare(cycleA, cycleB) ||
        collator.compare(levelA, levelB) ||
        collator.compare(a.name, b.name)
      );
    });
  }, [classes, assignments, collator]);

  const groupedLevels = useMemo<ClassBucket[]>(() => {
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

  const groupedCycles = useMemo<CycleBucket[]>(() => {
    const groups = new Map<string, CycleBucket>();
    for (const level of groupedLevels) {
      const sample = level.classes[0];
      const cycle = sample?.level?.cycle;
      const label = cycle?.name?.trim() || t('common.dash');
      const key = cycle?.id ? `cycle-${cycle.id}` : `cycle-${label}`;
      const bucket = groups.get(key) ?? { key, label, levels: [], classes: [] };
      bucket.levels.push(level);
      bucket.classes.push(...level.classes);
      groups.set(key, bucket);
    }
    return [...groups.values()]
      .map((group) => ({
        ...group,
        levels: [...group.levels].sort((a, b) => collator.compare(a.label, b.label)),
        classes: [...group.classes].sort((a, b) => collator.compare(a.name, b.name)),
      }))
      .sort((a, b) => collator.compare(a.label, b.label));
  }, [groupedLevels, collator, t]);

  const effectiveCycleKey =
    selectedCycleKey && groupedCycles.some((group) => group.key === selectedCycleKey)
      ? selectedCycleKey
      : groupedCycles[0]?.key ?? '';
  const selectedCycle = groupedCycles.find((group) => group.key === effectiveCycleKey) ?? null;

  const effectiveLevelKey =
    selectedLevelKey && selectedCycle?.levels.some((group) => group.key === selectedLevelKey)
      ? selectedLevelKey
      : selectedCycle?.levels[0]?.key ?? '';
  const selectedGroup =
    selectedCycle?.levels.find((group) => group.key === effectiveLevelKey) ?? null;

  function selectCycle(key: string) {
    setSelectedCycleKey(key);
    setSelectedLevelKey('');
  }

  if (!classList.length && !assignments.length) {
    return (
      <p className="muted assignment-workspace__empty">
        {t('admin.academicSetup.noAssignments')}
      </p>
    );
  }

  const cyclesLabel = t('admin.teacherDomain.academic.eligibleCycles');
  const levelsLabel = t('admin.teacherDomain.academic.eligibleLevels');

  return (
    <div className="assignment-levels">
      <section className="assignment-filter-step assignment-filter-step--cycle">
        <div className="assignment-filter-step__head">
          <strong>{cyclesLabel}</strong>
        </div>
        <div className="assignment-cycle-filter" role="tablist" aria-label={cyclesLabel}>
          {groupedCycles.map((group) => {
            const active = group.key === effectiveCycleKey;
            return (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={
                  active
                    ? 'assignment-cycle-filter__tile assignment-cycle-filter__tile--active'
                    : 'assignment-cycle-filter__tile'
                }
                onClick={() => selectCycle(group.key)}
              >
                <strong dir="auto">{group.label}</strong>
              </button>
            );
          })}
        </div>
      </section>

      {selectedCycle ? (
        <section className="assignment-filter-step assignment-filter-step--level">
          <div className="assignment-filter-step__head">
            <strong>{levelsLabel}</strong>
          </div>
          <div className="assignment-level-filter" role="tablist" aria-label={levelsLabel}>
            {selectedCycle.levels.map((group) => {
              const active = group.key === effectiveLevelKey;
              return (
                <button
                  key={group.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={
                    active
                      ? 'assignment-level-filter__tile assignment-level-filter__tile--active'
                      : 'assignment-level-filter__tile'
                  }
                  onClick={() => setSelectedLevelKey(group.key)}
                >
                  <strong dir="auto">{group.label}</strong>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {selectedGroup ? (
        <section className="assignment-level-group">
          <header className="assignment-level-group__head">
            <h3 dir="auto">{selectedGroup.label}</h3>
          </header>

          <div className="assignment-class-grid">
            {selectedGroup.classes.map((cls) => {
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
                    {missing.length > 0 ? (
                      <span className="assignment-class-card__status assignment-class-card__status--warning">
                        {missingTeacherLabel(missing.length)}
                      </span>
                    ) : null}
                  </header>

                  <div className="assignment-subject-grid">
                    {rows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="assignment-subject-tile"
                        onClick={() => canManage && onEdit(row)}
                        disabled={!canManage}
                      >
                        <span className="assignment-subject-tile__subject" dir="auto">
                          {row.subject.name}
                        </span>
                        <span className="assignment-subject-tile__teacher" dir="auto">
                          {row.teacher.name}
                        </span>
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
                          بدون أستاذ
                        </span>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
