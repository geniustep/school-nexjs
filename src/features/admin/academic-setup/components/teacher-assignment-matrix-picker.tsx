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

function pairKey(classId: number, subjectId: number): string {
  return `${classId}:${subjectId}`;
}

function uniqueIds(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))];
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
    { active: 1 },
  );
  const [cycleCode, setCycleCode] = useState('');
  const [levelId, setLevelId] = useState(0);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);

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

  const levelsForCycle = useMemo(() => {
    const filtered = cycleCode
      ? levels.filter((level) => level.cycle?.code === cycleCode)
      : cycles.length
        ? []
        : levels;
    return [...filtered].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999) || a.name.localeCompare(b.name));
  }, [levels, cycles.length, cycleCode]);

  const levelClasses = useMemo(
    () =>
      classes
        .filter((cls) => cls.level?.id === levelId && cls.status !== 'inactive')
        .sort((a, b) => classLabel(a).localeCompare(classLabel(b), undefined, { numeric: true, sensitivity: 'base' })),
    [classes, levelId],
  );

  const availableSubjects = useMemo(() => {
    if (!levelId) return [];
    const selectedLevel = levels.find((level) => level.id === levelId);
    const allowed = new Set<number>();
    for (const subject of selectedLevel?.subjects ?? []) allowed.add(subject.id);
    for (const subject of subjects) {
      if (subject.level_id === levelId || subject.level_ids?.includes(levelId)) allowed.add(subject.id);
    }
    for (const cls of levelClasses) {
      for (const subject of cls.subjects ?? []) allowed.add(subject.id);
    }
    return subjects
      .filter((subject) => subject.active !== false && allowed.has(subject.id))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [subjects, levels, levelId, levelClasses]);

  const selectedPairSet = useMemo(
    () => new Set(selectedPairs.map((pair) => pairKey(pair.classId, pair.subjectId))),
    [selectedPairs],
  );

  const classIdsForLevel = useMemo(() => new Set(levelClasses.map((cls) => cls.id)), [levelClasses]);

  const occupiedBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const assignment of occupancyState.data ?? []) {
      if (assignment.active === false || assignment.role !== 'main') continue;
      if (currentTeacherId != null && assignment.teacher?.id === currentTeacherId) continue;
      map.set(pairKey(assignment.class.id, assignment.subject.id), assignment.teacher?.name || t('common.dash'));
    }
    return map;
  }, [occupancyState.data, currentTeacherId, t]);

  useEffect(() => {
    if (levelId || !selectedPairs.length) return;
    const firstClass = classes.find((cls) => cls.id === selectedPairs[0]?.classId);
    const initialLevelId = firstClass?.level?.id ?? 0;
    if (!initialLevelId) return;
    const initialLevel = levels.find((level) => level.id === initialLevelId);
    setCycleCode(initialLevel?.cycle?.code ?? '');
    setLevelId(initialLevelId);
  }, [levelId, selectedPairs, classes, levels]);

  useEffect(() => {
    if (cycleCode || cycles.length !== 1) return;
    setCycleCode(cycles[0]!.code);
  }, [cycles, cycleCode]);

  useEffect(() => {
    if (levelId || levelsForCycle.length !== 1) return;
    setLevelId(levelsForCycle[0]!.id);
  }, [levelsForCycle, levelId]);

  useEffect(() => {
    if (!levelId) return;
    const subjectsFromExisting = uniqueIds(
      selectedPairs
        .filter((pair) => classIdsForLevel.has(pair.classId))
        .map((pair) => pair.subjectId),
    );
    if (!subjectsFromExisting.length) return;
    setSelectedSubjectIds((current) => uniqueIds([...current, ...subjectsFromExisting]));
  }, [levelId, selectedPairs, classIdsForLevel]);

  const selectedSubjects = useMemo(
    () => selectedSubjectIds.map((id) => availableSubjects.find((subject) => subject.id === id)).filter((subject): subject is Subject => Boolean(subject)),
    [selectedSubjectIds, availableSubjects],
  );

  const subjectSuggestions = useMemo(() => {
    const selected = new Set(selectedSubjectIds);
    const query = subjectQuery.trim().toLocaleLowerCase();
    return availableSubjects
      .filter((subject) => !selected.has(subject.id))
      .filter((subject) => !query || subject.name.toLocaleLowerCase().includes(query))
      .slice(0, 12);
  }, [availableSubjects, selectedSubjectIds, subjectQuery]);

  function handleCycleChange(nextCycleCode: string) {
    setCycleCode(nextCycleCode);
    setLevelId(0);
    setSelectedSubjectIds([]);
    setSubjectQuery('');
    setSubjectMenuOpen(false);
  }

  function handleLevelChange(nextLevelId: number) {
    setLevelId(nextLevelId);
    setSubjectQuery('');
    setSubjectMenuOpen(false);
    const nextClassIds = new Set(classes.filter((cls) => cls.level?.id === nextLevelId).map((cls) => cls.id));
    setSelectedSubjectIds(
      uniqueIds(selectedPairs.filter((pair) => nextClassIds.has(pair.classId)).map((pair) => pair.subjectId)),
    );
  }

  function addSubject(subjectId: number) {
    setSelectedSubjectIds((current) => uniqueIds([...current, subjectId]));
    setSubjectQuery('');
    setSubjectMenuOpen(true);
  }

  function removeSubject(subjectId: number) {
    setSelectedSubjectIds((current) => current.filter((id) => id !== subjectId));
    const next = selectedPairs.filter(
      (pair) => !(classIdsForLevel.has(pair.classId) && pair.subjectId === subjectId),
    );
    onChange(next);
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
    for (const cls of levelClasses) {
      for (const subjectId of selectedSubjectIds) {
        const key = pairKey(cls.id, subjectId);
        if (!occupiedBy.has(key)) next.set(key, { classId: cls.id, subjectId });
      }
    }
    onChange([...next.values()]);
  }

  function clearVisible() {
    const visible = new Set<string>();
    for (const cls of levelClasses) {
      for (const subjectId of selectedSubjectIds) visible.add(pairKey(cls.id, subjectId));
    }
    onChange(selectedPairs.filter((pair) => !visible.has(pairKey(pair.classId, pair.subjectId))));
  }

  const visiblePairCount = levelClasses.length * selectedSubjectIds.length;
  const visibleSelectedCount = selectedPairs.filter(
    (pair) => classIdsForLevel.has(pair.classId) && selectedSubjectIds.includes(pair.subjectId),
  ).length;
  const blockedCount = levelClasses.reduce(
    (count, cls) => count + selectedSubjectIds.filter((subjectId) => occupiedBy.has(pairKey(cls.id, subjectId))).length,
    0,
  );

  return (
    <div className="teacher-assignment-matrix">
      <div className="teacher-assignment-matrix__filters">
        {cycles.length ? (
          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">{t('admin.staffCenter.smartCreate.studyCycle')}</span>
            <select
              className="input"
              value={cycleCode}
              onChange={(event) => handleCycleChange(event.target.value)}
              disabled={disabled}
            >
              <option value="">{t('admin.staffCenter.smartCreate.selectPlaceholder')}</option>
              {cycles.map((cycle) => (
                <option key={cycle.code} value={cycle.code}>{cycle.name}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="teacher-setup-field">
          <span className="teacher-setup-field__label">{t('admin.staffCenter.smartCreate.studyLevel')}</span>
          <select
            className="input"
            value={levelId || ''}
            onChange={(event) => handleLevelChange(Number(event.target.value) || 0)}
            disabled={disabled || (cycles.length > 0 && !cycleCode)}
          >
            <option value="">{t('admin.staffCenter.smartCreate.selectPlaceholder')}</option>
            {levelsForCycle.map((level) => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </select>
        </label>
      </div>

      {levelId ? (
        <div className="teacher-assignment-matrix__subject-block">
          <span className="teacher-setup-field__label">{t('admin.staffCenter.smartCreate.subjects')}</span>
          <div className="teacher-assignment-matrix__tagbox">
            {selectedSubjects.map((subject) => (
              <span key={subject.id} className="teacher-assignment-matrix__tag" dir="auto">
                {subject.name}
                <button
                  type="button"
                  onClick={() => removeSubject(subject.id)}
                  disabled={disabled}
                  aria-label={t('admin.staffCenter.smartCreate.removeSubject', { name: subject.name })}
                >×</button>
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
                  {subjectSuggestions.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      role="option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addSubject(subject.id)}
                      dir="auto"
                    >
                      <span>{subject.name}</span><span aria-hidden="true">＋</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {!availableSubjects.length ? (
            <p className="tiny muted">{t('admin.academicSetup.teacherAssignmentMatrix.noSubjects')}</p>
          ) : (
            <p className="tiny muted">{t('admin.academicSetup.teacherAssignmentMatrix.subjectsHint')}</p>
          )}
        </div>
      ) : null}

      {occupancyState.error ? (
        <p className="teacher-assignment-matrix__warning" role="alert">
          {t('admin.academicSetup.teacherAssignmentMatrix.occupancyUnavailable')}
        </p>
      ) : null}

      {levelId && selectedSubjectIds.length ? (
        <>
          <div className="teacher-assignment-matrix__toolbar">
            <span className="tiny muted">
              {t('admin.academicSetup.teacherAssignmentMatrix.selectionSummary', {
                selected: visibleSelectedCount,
                total: visiblePairCount,
                blocked: blockedCount,
              })}
            </span>
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

          {!levelClasses.length ? (
            <p className="teacher-setup-form__empty">{t('admin.staffCenter.smartCreate.noClassesForSelection')}</p>
          ) : (
            <div className="teacher-assignment-matrix__table-wrap">
              <table className="teacher-assignment-matrix__table">
                <thead>
                  <tr>
                    <th scope="col">{t('admin.staffCenter.smartCreate.classes')}</th>
                    {selectedSubjects.map((subject) => (
                      <th key={subject.id} scope="col" dir="auto">{subject.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {levelClasses.map((cls) => (
                    <tr key={cls.id}>
                      <th scope="row" dir="auto">{classLabel(cls)}</th>
                      {selectedSubjects.map((subject) => {
                        const key = pairKey(cls.id, subject.id);
                        const selected = selectedPairSet.has(key);
                        const owner = occupiedBy.get(key);
                        return (
                          <td key={subject.id}>
                            {owner ? (
                              <span
                                className="teacher-assignment-matrix__cell teacher-assignment-matrix__cell--blocked"
                                title={t('admin.academicSetup.teacherAssignmentMatrix.occupiedBy', { name: owner })}
                              >
                                <span aria-hidden="true">🔒</span>
                                <span dir="auto">{owner}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={selected}
                                aria-label={`${classLabel(cls)} — ${subject.name}`}
                                className={`teacher-assignment-matrix__cell${selected ? ' teacher-assignment-matrix__cell--selected' : ''}`}
                                onClick={() => togglePair(cls.id, subject.id)}
                                disabled={disabled || Boolean(occupancyState.error) || occupancyState.loading}
                              >
                                <span aria-hidden="true">{selected ? '✓' : '＋'}</span>
                                <span>{selected ? t('admin.academicSetup.teacherAssignmentMatrix.selected') : t('admin.academicSetup.teacherAssignmentMatrix.available')}</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : levelId ? (
        <p className="teacher-setup-form__empty">{t('admin.academicSetup.teacherAssignmentMatrix.chooseSubjects')}</p>
      ) : null}
    </div>
  );
}
