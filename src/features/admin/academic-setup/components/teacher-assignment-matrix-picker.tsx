'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { TeachingAssignment } from '@/types/academic-setup';
import './teacher-assignment-matrix-picker.css';

export type TeacherAssignmentPair = {
  classId: number;
  subjectId: number;
};

type SubjectFamily = {
  key: string;
  name: string;
  subjectIds: number[];
};

function pairKey(classId: number, subjectId: number): string {
  return `${classId}:${subjectId}`;
}

function subjectFamilyKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function uniqueIds(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function mergeIds(current: number[], additions: number[]): number[] {
  const next = uniqueIds([...current, ...additions]);
  if (next.length === current.length && next.every((value, index) => value === current[index])) {
    return current;
  }
  return next;
}

function mergeStrings(current: string[], additions: string[]): string[] {
  const next = uniqueStrings([...current, ...additions]);
  if (next.length === current.length && next.every((value, index) => value === current[index])) {
    return current;
  }
  return next;
}

function classLabel(cls: SchoolClass): string {
  return cls.display_alias?.trim() || cls.display_name?.trim() || cls.section_name?.trim() || cls.name;
}

export function TeacherAssignmentMatrixPicker({
  levels,
  classes,
  subjects,
  selectedPairs,
  currentTeacherId = null,
  disabled = false,
  onChange,
}: {
  levels: Level[];
  classes: SchoolClass[];
  subjects: Subject[];
  selectedPairs: TeacherAssignmentPair[];
  currentTeacherId?: number | null;
  disabled?: boolean;
  onChange: (pairs: TeacherAssignmentPair[]) => void;
}) {
  const t = useT();
  const occupancyState = useAdminResource<TeachingAssignment[]>(
    endpoints.admin.teachingAssignments,
    { active: 1, page_size: 500 },
  );
  const [selectedSubjectKeys, setSelectedSubjectKeys] = useState<string[]>([]);
  const [selectedCycleCodes, setSelectedCycleCodes] = useState<string[]>([]);
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([]);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);

  const subjectFamilies = useMemo(() => {
    const grouped = new Map<string, SubjectFamily>();
    for (const subject of subjects) {
      if (subject.active === false) continue;
      const key = subjectFamilyKey(subject.name);
      if (!key) continue;
      const existing = grouped.get(key);
      if (existing) {
        existing.subjectIds = uniqueIds([...existing.subjectIds, subject.id]);
      } else {
        grouped.set(key, { key, name: subject.name.trim(), subjectIds: [subject.id] });
      }
    }
    return [...grouped.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }, [subjects]);

  const subjectFamilyById = useMemo(() => {
    const map = new Map<number, string>();
    for (const family of subjectFamilies) {
      for (const subjectId of family.subjectIds) map.set(subjectId, family.key);
    }
    return map;
  }, [subjectFamilies]);

  const cycles = useMemo(() => {
    const byCode = new Map<string, { code: string; name: string; sequence: number }>();
    for (const level of levels) {
      if (!level.cycle?.code) continue;
      const current = byCode.get(level.cycle.code);
      const sequence = level.cycle.sequence ?? level.sequence ?? 999;
      if (!current || sequence < current.sequence) {
        byCode.set(level.cycle.code, {
          code: level.cycle.code,
          name: level.cycle.name || level.cycle.code,
          sequence,
        });
      }
    }
    return [...byCode.values()].sort((a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name));
  }, [levels]);

  useEffect(() => {
    if (!selectedPairs.length) return;

    const pairSubjectKeys = uniqueStrings(
      selectedPairs.map((pair) => {
        const fromMap = subjectFamilyById.get(pair.subjectId);
        if (fromMap) return fromMap;
        const subject = subjects.find((item) => item.id === pair.subjectId);
        return subject ? subjectFamilyKey(subject.name) : '';
      }),
    );
    const pairLevelIds = uniqueIds(
      selectedPairs
        .map((pair) => classes.find((cls) => cls.id === pair.classId)?.level?.id ?? 0),
    );
    const pairCycleCodes = uniqueStrings(
      pairLevelIds.map((levelId) => levels.find((level) => level.id === levelId)?.cycle?.code ?? ''),
    );

    setSelectedSubjectKeys((current) => mergeStrings(current, pairSubjectKeys));
    setSelectedLevelIds((current) => mergeIds(current, pairLevelIds));
    setSelectedCycleCodes((current) => mergeStrings(current, pairCycleCodes));
  }, [selectedPairs, subjectFamilyById, subjects, classes, levels]);

  const selectedSubjectFamilies = useMemo(
    () =>
      selectedSubjectKeys
        .map((key) => subjectFamilies.find((family) => family.key === key))
        .filter((family): family is SubjectFamily => Boolean(family)),
    [selectedSubjectKeys, subjectFamilies],
  );

  const subjectSuggestions = useMemo(() => {
    const selected = new Set(selectedSubjectKeys);
    const query = subjectQuery.trim().toLocaleLowerCase();
    return subjectFamilies
      .filter((family) => !selected.has(family.key))
      .filter((family) => !query || family.name.toLocaleLowerCase().includes(query))
      .slice(0, 14);
  }, [subjectFamilies, selectedSubjectKeys, subjectQuery]);

  const selectedCycleSet = useMemo(() => new Set(selectedCycleCodes), [selectedCycleCodes]);
  const selectedLevelSet = useMemo(() => new Set(selectedLevelIds), [selectedLevelIds]);

  const levelsForSelectedCycles = useMemo(() => {
    const filtered = cycles.length
      ? selectedCycleCodes.length
        ? levels.filter((level) => level.cycle?.code && selectedCycleSet.has(level.cycle.code))
        : []
      : levels;
    return [...filtered].sort(
      (a, b) => (a.sequence ?? 999) - (b.sequence ?? 999) || a.name.localeCompare(b.name),
    );
  }, [levels, cycles.length, selectedCycleCodes.length, selectedCycleSet]);

  const selectedClasses = useMemo(
    () =>
      classes
        .filter((cls) => cls.level?.id != null && selectedLevelSet.has(cls.level.id) && cls.status !== 'inactive')
        .sort((a, b) => {
          const aLevel = levels.find((level) => level.id === a.level?.id);
          const bLevel = levels.find((level) => level.id === b.level?.id);
          const levelOrder = (aLevel?.sequence ?? 999) - (bLevel?.sequence ?? 999);
          if (levelOrder !== 0) return levelOrder;
          return classLabel(a).localeCompare(classLabel(b), undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        }),
    [classes, selectedLevelSet, levels],
  );

  const selectedPairSet = useMemo(
    () => new Set(selectedPairs.map((pair) => pairKey(pair.classId, pair.subjectId))),
    [selectedPairs],
  );

  const occupiedBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const assignment of occupancyState.data ?? []) {
      if (assignment.active === false || assignment.role !== 'main') continue;
      if (currentTeacherId != null && assignment.teacher?.id === currentTeacherId) continue;
      map.set(
        pairKey(assignment.class.id, assignment.subject.id),
        assignment.teacher?.name || t('common.dash'),
      );
    }
    return map;
  }, [occupancyState.data, currentTeacherId, t]);

  function resolveSubjectForClass(family: SubjectFamily, cls: SchoolClass): Subject | null {
    const direct = (cls.subjects ?? []).find(
      (subject) => subjectFamilyKey(subject.name) === family.key,
    );
    if (direct) return direct;

    const levelId = cls.level?.id ?? 0;
    const level = levels.find((item) => item.id === levelId);
    const levelSubject = (level?.subjects ?? []).find(
      (subject) => subjectFamilyKey(subject.name) === family.key,
    );
    if (levelSubject) return levelSubject;

    const candidates = subjects.filter((subject) => family.subjectIds.includes(subject.id));
    return (
      candidates.find(
        (subject) => subject.level_id === levelId || subject.level_ids?.includes(levelId),
      ) ??
      candidates.find(
        (subject) => subject.level_id == null && !(subject.level_ids?.length),
      ) ??
      null
    );
  }

  function addSubject(key: string) {
    setSelectedSubjectKeys((current) => mergeStrings(current, [key]));
    setSubjectQuery('');
    setSubjectMenuOpen(true);
  }

  function removeSubject(key: string) {
    const family = subjectFamilies.find((item) => item.key === key);
    const familyIds = new Set(family?.subjectIds ?? []);
    setSelectedSubjectKeys((current) => current.filter((item) => item !== key));
    onChange(
      selectedPairs.filter((pair) => {
        if (familyIds.has(pair.subjectId)) return false;
        const subject = subjects.find((item) => item.id === pair.subjectId);
        return !subject || subjectFamilyKey(subject.name) !== key;
      }),
    );
  }

  function toggleCycle(code: string) {
    if (!selectedCycleSet.has(code)) {
      setSelectedCycleCodes((current) => mergeStrings(current, [code]));
      return;
    }

    const removedLevelIds = new Set(
      levels.filter((level) => level.cycle?.code === code).map((level) => level.id),
    );
    const removedClassIds = new Set(
      classes
        .filter((cls) => cls.level?.id != null && removedLevelIds.has(cls.level.id))
        .map((cls) => cls.id),
    );
    setSelectedCycleCodes((current) => current.filter((item) => item !== code));
    setSelectedLevelIds((current) => current.filter((id) => !removedLevelIds.has(id)));
    onChange(selectedPairs.filter((pair) => !removedClassIds.has(pair.classId)));
  }

  function toggleLevel(levelId: number) {
    if (!selectedLevelSet.has(levelId)) {
      setSelectedLevelIds((current) => mergeIds(current, [levelId]));
      return;
    }

    const removedClassIds = new Set(
      classes.filter((cls) => cls.level?.id === levelId).map((cls) => cls.id),
    );
    setSelectedLevelIds((current) => current.filter((id) => id !== levelId));
    onChange(selectedPairs.filter((pair) => !removedClassIds.has(pair.classId)));
  }

  function togglePair(classId: number, subjectId: number) {
    const key = pairKey(classId, subjectId);
    if (occupiedBy.has(key) || occupancyState.error) return;
    const next = selectedPairSet.has(key)
      ? selectedPairs.filter((pair) => pairKey(pair.classId, pair.subjectId) !== key)
      : [...selectedPairs, { classId, subjectId }];
    onChange(next);
  }

  function selectAllAvailable() {
    const next = new Map(selectedPairs.map((pair) => [pairKey(pair.classId, pair.subjectId), pair]));
    for (const cls of selectedClasses) {
      for (const family of selectedSubjectFamilies) {
        const subject = resolveSubjectForClass(family, cls);
        if (!subject) continue;
        const key = pairKey(cls.id, subject.id);
        if (!occupiedBy.has(key)) next.set(key, { classId: cls.id, subjectId: subject.id });
      }
    }
    onChange([...next.values()]);
  }

  function clearVisible() {
    const visibleClassIds = new Set(selectedClasses.map((cls) => cls.id));
    const visibleSubjectKeys = new Set(selectedSubjectKeys);
    onChange(
      selectedPairs.filter((pair) => {
        if (!visibleClassIds.has(pair.classId)) return true;
        const subject = subjects.find((item) => item.id === pair.subjectId);
        const key = subjectFamilyById.get(pair.subjectId) ?? (subject ? subjectFamilyKey(subject.name) : '');
        return !visibleSubjectKeys.has(key);
      }),
    );
  }

  let visiblePairCount = 0;
  let visibleSelectedCount = 0;
  let blockedCount = 0;
  for (const cls of selectedClasses) {
    for (const family of selectedSubjectFamilies) {
      const subject = resolveSubjectForClass(family, cls);
      if (!subject) continue;
      visiblePairCount += 1;
      const key = pairKey(cls.id, subject.id);
      if (selectedPairSet.has(key)) visibleSelectedCount += 1;
      if (occupiedBy.has(key)) blockedCount += 1;
    }
  }

  const summaryGroups = useMemo(() => {
    const grouped = new Map<
      number,
      { classId: number; className: string; levelName: string; subjects: string[] }
    >();
    for (const pair of selectedPairs) {
      const cls = classes.find((item) => item.id === pair.classId);
      if (!cls) continue;
      const subject =
        subjects.find((item) => item.id === pair.subjectId) ??
        (cls.subjects ?? []).find((item) => item.id === pair.subjectId);
      const levelName = levels.find((level) => level.id === cls.level?.id)?.name ?? '';
      const current = grouped.get(cls.id) ?? {
        classId: cls.id,
        className: classLabel(cls),
        levelName,
        subjects: [],
      };
      current.subjects = uniqueStrings([
        ...current.subjects,
        subject?.name?.trim() || String(pair.subjectId),
      ]);
      grouped.set(cls.id, current);
    }
    return [...grouped.values()].sort((a, b) => {
      const levelCompare = a.levelName.localeCompare(b.levelName, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      if (levelCompare !== 0) return levelCompare;
      return a.className.localeCompare(b.className, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }, [selectedPairs, classes, subjects, levels]);

  const subjectsReady = selectedSubjectFamilies.length > 0;
  const scopeReady = selectedLevelIds.length > 0;

  return (
    <div className="teacher-assignment-matrix">
      <section className="teacher-assignment-matrix__step">
        <span className="teacher-setup-field__label">
          1. {t('admin.staffCenter.smartCreate.subjects')}
        </span>
        <div className="teacher-assignment-matrix__tagbox">
          {selectedSubjectFamilies.map((family) => (
            <span key={family.key} className="teacher-assignment-matrix__tag" dir="auto">
              {family.name}
              <button
                type="button"
                onClick={() => removeSubject(family.key)}
                disabled={disabled}
                aria-label={t('admin.staffCenter.smartCreate.removeSubject', { name: family.name })}
              >
                ×
              </button>
            </span>
          ))}
          <div className="teacher-assignment-matrix__search-wrap">
            <input
              type="search"
              value={subjectQuery}
              onChange={(event) => setSubjectQuery(event.target.value)}
              onFocus={() => setSubjectMenuOpen(true)}
              onBlur={() => window.setTimeout(() => setSubjectMenuOpen(false), 100)}
              placeholder={t('admin.staffCenter.smartCreate.searchSubjects')}
              aria-label={t('admin.staffCenter.smartCreate.searchSubjects')}
              disabled={disabled}
            />
            {subjectMenuOpen && subjectSuggestions.length ? (
              <div className="teacher-assignment-matrix__subject-menu" role="listbox">
                {subjectSuggestions.map((family) => (
                  <button
                    key={family.key}
                    type="button"
                    role="option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addSubject(family.key)}
                    dir="auto"
                  >
                    <span>{family.name}</span>
                    <span aria-hidden="true">＋</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {!subjectFamilies.length ? (
          <p className="tiny muted">{t('admin.staffCenter.smartCreate.noSubjectsForSelection')}</p>
        ) : null}
      </section>

      <section className="teacher-assignment-matrix__step">
        {cycles.length ? (
          <div className="teacher-assignment-matrix__choice-block">
            <span className="teacher-setup-field__label">
              2. {t('admin.staffCenter.smartCreate.studyCycle')}
            </span>
            <div className="teacher-assignment-matrix__choice-list" role="group">
              {cycles.map((cycle) => {
                const selected = selectedCycleSet.has(cycle.code);
                return (
                  <button
                    key={cycle.code}
                    type="button"
                    className="teacher-assignment-matrix__choice"
                    data-selected={selected || undefined}
                    aria-pressed={selected}
                    onClick={() => toggleCycle(cycle.code)}
                    disabled={disabled || !subjectsReady}
                  >
                    <span aria-hidden="true">{selected ? '✓' : '＋'}</span>
                    <span>{cycle.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="teacher-assignment-matrix__choice-block">
          <span className="teacher-setup-field__label">
            {cycles.length ? '3.' : '2.'} {t('admin.staffCenter.smartCreate.studyLevel')}
          </span>
          <div className="teacher-assignment-matrix__choice-list" role="group">
            {levelsForSelectedCycles.map((level) => {
              const selected = selectedLevelSet.has(level.id);
              return (
                <button
                  key={level.id}
                  type="button"
                  className="teacher-assignment-matrix__choice"
                  data-selected={selected || undefined}
                  aria-pressed={selected}
                  onClick={() => toggleLevel(level.id)}
                  disabled={
                    disabled ||
                    !subjectsReady ||
                    (cycles.length > 0 && selectedCycleCodes.length === 0)
                  }
                >
                  <span aria-hidden="true">{selected ? '✓' : '＋'}</span>
                  <span>{level.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {occupancyState.error ? (
        <p className="teacher-assignment-matrix__warning" role="alert">
          {t('admin.academicSetup.teacherAssignmentMatrix.occupancyUnavailable')}
        </p>
      ) : null}

      {subjectsReady && scopeReady ? (
        <section className="teacher-assignment-matrix__step">
          <div className="teacher-assignment-matrix__toolbar">
            <div>
              <span className="teacher-setup-field__label">
                {cycles.length ? '4.' : '3.'} {t('admin.staffCenter.smartCreate.classes')}
              </span>
              <p className="tiny muted">
                {t('admin.academicSetup.teacherAssignmentMatrix.selectionSummary', {
                  selected: visibleSelectedCount,
                  total: visiblePairCount,
                  blocked: blockedCount,
                })}
              </p>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={selectAllAvailable}
                disabled={disabled || Boolean(occupancyState.error) || occupancyState.loading}
              >
                {t('admin.academicSetup.teacherAssignmentMatrix.selectAllAvailable')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={clearVisible}
                disabled={disabled || visibleSelectedCount === 0}
              >
                {t('admin.academicSetup.teacherAssignmentMatrix.clearVisible')}
              </button>
            </div>
          </div>

          {!selectedClasses.length ? (
            <p className="teacher-setup-form__empty">
              {t('admin.staffCenter.smartCreate.noClassesForSelection')}
            </p>
          ) : (
            <div className="teacher-assignment-matrix__table-wrap">
              <table className="teacher-assignment-matrix__table">
                <thead>
                  <tr>
                    <th scope="col">{t('admin.staffCenter.smartCreate.classes')}</th>
                    {selectedSubjectFamilies.map((family) => (
                      <th key={family.key} scope="col" dir="auto">
                        {family.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedClasses.map((cls) => {
                    const levelName = levels.find((level) => level.id === cls.level?.id)?.name ?? '';
                    return (
                      <tr key={cls.id}>
                        <th scope="row" dir="auto">
                          <span className="teacher-assignment-matrix__class-name">{classLabel(cls)}</span>
                          {levelName ? (
                            <span className="teacher-assignment-matrix__class-level">{levelName}</span>
                          ) : null}
                        </th>
                        {selectedSubjectFamilies.map((family) => {
                          const subject = resolveSubjectForClass(family, cls);
                          if (!subject) {
                            return (
                              <td key={family.key}>
                                <span className="teacher-assignment-matrix__cell teacher-assignment-matrix__cell--unavailable">
                                  {t('common.dash')}
                                </span>
                              </td>
                            );
                          }

                          const key = pairKey(cls.id, subject.id);
                          const selected = selectedPairSet.has(key);
                          const owner = occupiedBy.get(key);
                          return (
                            <td key={family.key}>
                              {owner ? (
                                <span
                                  className="teacher-assignment-matrix__cell teacher-assignment-matrix__cell--blocked"
                                  title={t('admin.academicSetup.teacherAssignmentMatrix.occupiedBy', {
                                    name: owner,
                                  })}
                                >
                                  <span aria-hidden="true">🔒</span>
                                  <span dir="auto">{owner}</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={selected}
                                  aria-label={`${classLabel(cls)} — ${family.name}`}
                                  className={`teacher-assignment-matrix__cell${
                                    selected ? ' teacher-assignment-matrix__cell--selected' : ''
                                  }`}
                                  onClick={() => togglePair(cls.id, subject.id)}
                                  disabled={
                                    disabled || Boolean(occupancyState.error) || occupancyState.loading
                                  }
                                >
                                  <span aria-hidden="true">{selected ? '×' : '＋'}</span>
                                  <span>
                                    {selected
                                      ? t('admin.academicSetup.teacherForm.removeAssignment')
                                      : t('admin.academicSetup.teacherForm.addAssignment')}
                                  </span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <section className="teacher-assignment-matrix__summary" aria-live="polite">
        <div className="teacher-assignment-matrix__summary-head">
          <strong>{t('admin.staffCenter.smartCreate.reviewAssignmentsSummary')}</strong>
          <span className="teacher-assignment-matrix__summary-count">
            {t('admin.academicSetup.teacherForm.assignmentsCount', { count: selectedPairs.length })}
          </span>
        </div>

        {summaryGroups.length ? (
          <div className="teacher-assignment-matrix__summary-grid">
            {summaryGroups.map((group) => (
              <article key={group.classId} className="teacher-assignment-matrix__summary-row">
                <div className="teacher-assignment-matrix__summary-class" dir="auto">
                  <strong>{group.className}</strong>
                  {group.levelName ? <span>{group.levelName}</span> : null}
                </div>
                <div className="teacher-assignment-matrix__summary-subjects">
                  {group.subjects.map((subjectName) => (
                    <span key={subjectName} className="teacher-assignment-matrix__summary-chip" dir="auto">
                      {subjectName}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="tiny muted teacher-assignment-matrix__summary-empty">
            {t('admin.academicSetup.teacherForm.assignmentsEmpty')}
          </p>
        )}
      </section>
    </div>
  );
}
