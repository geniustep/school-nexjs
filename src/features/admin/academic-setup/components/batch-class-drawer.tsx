'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { AcademicTrack } from '@/types/academic-setup';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useSubjectOptions } from '@/features/admin/academic-setup/hooks/use-subject-options';
import { ClassSubjectsField } from '@/features/admin/academic-setup/components/class-subjects-field';
import {
  extractLevelEnabledOperationalSubjects,
  mergeSchoolSubjectsIntoClassOptions,
} from '@/features/admin/academic-setup/utils/class-level-subjects';
import { aggregateBatchResults, levelSupportsTracks, type TrackLevelRef } from '../utils/guided-flow';
import {
  buildBatchClassCreatePayload,
  collectCyclesFromLevels,
  existingClassNamesForCanonicalScope,
  filterLevelsByCycleId,
  isClassesListCompleteForNaming,
  mapClassApiError,
  resolveCycleIdForLevel,
  resolveLevelAcademicCode,
  suggestCanonicalClassNames,
} from '@/features/admin/class-form-utils';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import { sortedLevels } from '@/features/admin/levels/utils/levels-list-utils';
import { SetupDrawer } from './setup-drawer';

export function BatchClassDrawer({
  open,
  levels,
  initialLevelId,
  trackLevels,
  onClose,
  onSaved,
}: {
  open: boolean;
  levels: Level[];
  initialLevelId?: number | null;
  trackLevels: TrackLevelRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const studentOptionsState = useStudentOptions();
  const academicYears = studentOptionsState.options?.academicYears ?? [];

  const allLevels = useMemo(() => sortedLevels(levels), [levels]);
  const cycles = useMemo(() => collectCyclesFromLevels(allLevels), [allLevels]);

  const [academicYearId, setAcademicYearId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [count, setCount] = useState(3);
  const [capacity, setCapacity] = useState('30');
  const [proposedNames, setProposedNames] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<number[]>([]);
  const [subjectsKey, setSubjectsKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [seededOpenKey, setSeededOpenKey] = useState('');

  const levelsForCycle = useMemo(
    () => (cycleId ? filterLevelsByCycleId(allLevels, cycleId) : []),
    [allLevels, cycleId],
  );
  const selectedLevel = allLevels.find((l) => String(l.id) === levelId);
  const academicCode = resolveLevelAcademicCode(selectedLevel);
  const parsedLevelId = levelId ? Number(levelId) : null;
  const supportsTracks =
    parsedLevelId != null && levelSupportsTracks(parsedLevelId, trackLevels);

  const tracksState = useAdminResource<AcademicTrack[]>(
    open && supportsTracks ? endpoints.admin.tracks : null,
    parsedLevelId ? { level_id: parsedLevelId, limit: 200 } : undefined,
  );

  const classesQuery = useMemo(() => {
    if (!open || !levelId || !academicYearId) return undefined;
    return {
      page_size: 500,
      level_id: Number(levelId),
      academic_year_id: Number(academicYearId),
    };
  }, [open, levelId, academicYearId]);

  const classesState = useAdminResource<SchoolClass[]>(
    open && levelId && academicYearId ? endpoints.admin.classes : null,
    classesQuery,
  );

  const schoolSubjectsState = useAdminResource<Subject[]>(
    open && levelId ? endpoints.admin.subjects : null,
    { page_size: 500 },
  );
  const levelDetailState = useAdminResource<Level>(
    open && parsedLevelId != null ? endpoints.admin.level(parsedLevelId) : null,
  );
  const subjectOptionsState = useSubjectOptions(
    open && parsedLevelId != null ? parsedLevelId : null,
    supportsTracks && trackId ? Number(trackId) : null,
  );

  const levelSubjectOptions = useMemo(() => {
    const fromRef = extractLevelEnabledOperationalSubjects(subjectOptionsState.options);
    if (parsedLevelId == null) return fromRef;
    const levelSubjects = levelDetailState.data?.subjects ?? [];
    return mergeSchoolSubjectsIntoClassOptions(
      fromRef,
      [...levelSubjects, ...(schoolSubjectsState.data ?? [])],
      parsedLevelId,
      levelSubjects.map((s) => s.id),
    );
  }, [
    subjectOptionsState.options,
    parsedLevelId,
    levelDetailState.data?.subjects,
    schoolSubjectsState.data,
  ]);

  const subjectsLoading =
    subjectOptionsState.loading ||
    schoolSubjectsState.loading ||
    (parsedLevelId != null && levelDetailState.loading);

  const listComplete = isClassesListCompleteForNaming(classesState.data, classesState.meta);
  const canPropose =
    Boolean(academicYearId && levelId && academicCode) &&
    !classesState.loading &&
    listComplete;

  // Reset / seed when drawer opens.
  useEffect(() => {
    if (!open) {
      setSeededOpenKey('');
      return;
    }
    const key = `${initialLevelId ?? 'none'}`;
    if (seededOpenKey === key) return;
    setAcademicYearId('');
    setCount(3);
    setCapacity('30');
    setTrackId('');
    setProposedNames([]);
    setSubjectIds([]);
    setSubjectsKey('');
    setRowErrors([]);
    setSaving(false);

    if (initialLevelId != null && allLevels.length) {
      const level = allLevels.find((l) => l.id === initialLevelId);
      if (level) {
        setCycleId(resolveCycleIdForLevel(level));
        setLevelId(String(level.id));
      } else {
        setCycleId('');
        setLevelId('');
      }
    } else {
      setCycleId('');
      setLevelId('');
    }
    setSeededOpenKey(key);
  }, [open, initialLevelId, allLevels, seededOpenKey]);

  // Propose canonical names when year/level/count ready.
  useEffect(() => {
    if (!open) return;
    if (!canPropose || !academicCode || !levelId) {
      setProposedNames([]);
      return;
    }
    const existing = existingClassNamesForCanonicalScope(classesState.data, {
      levelId,
      academicYearId,
    });
    setProposedNames(suggestCanonicalClassNames(academicCode, existing, count) ?? []);
    setRowErrors([]);
  }, [
    open,
    canPropose,
    academicCode,
    levelId,
    academicYearId,
    count,
    classesState.data,
  ]);

  // Default-select all level subjects after level settles.
  useEffect(() => {
    if (!open || !levelId || subjectsLoading) return;
    if (subjectOptionsState.error) return;
    const key = `${levelId}:${supportsTracks ? trackId : ''}`;
    if (subjectsKey === key) return;
    setSubjectIds(levelSubjectOptions.map((s) => s.id));
    setSubjectsKey(key);
  }, [
    open,
    levelId,
    trackId,
    supportsTracks,
    subjectsLoading,
    subjectOptionsState.error,
    levelSubjectOptions,
    subjectsKey,
  ]);

  function handleCycleChange(next: string) {
    if (next === cycleId) return;
    setCycleId(next);
    setLevelId('');
    setTrackId('');
    setProposedNames([]);
    setSubjectIds([]);
    setSubjectsKey('');
  }

  function handleLevelChange(next: string) {
    if (next === levelId) return;
    setLevelId(next);
    setTrackId('');
    setProposedNames([]);
    setSubjectIds([]);
    setSubjectsKey('');
  }

  function handleYearChange(next: string) {
    if (next === academicYearId) return;
    setAcademicYearId(next);
    setProposedNames([]);
  }

  function toggleSubjectId(id: number) {
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (saving) return;
    if (!academicYearId) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    if (!selectedLevel || !academicCode) {
      toast.error(t('admin.classMissingAcademicCode'));
      return;
    }
    if (!listComplete) {
      toast.error(t('admin.classListIncompleteForNaming'));
      return;
    }
    if (!proposedNames.length) {
      toast.error(t('errors.validationFailed'));
      return;
    }

    setSaving(true);
    const errors: string[] = [];
    const results = await Promise.all(
      proposedNames.map(async (name, index) => {
        const payload = buildBatchClassCreatePayload({
          name,
          levelId: selectedLevel.id,
          academicYearId,
          subjectIds,
          trackId: supportsTracks ? trackId : '',
          capacity,
        });
        const res = await api.post(endpoints.admin.classes, payload);
        if (!res.success) {
          errors[index] = mapClassApiError(res.error, t);
        }
        return { ok: res.success };
      }),
    );
    const agg = aggregateBatchResults(results);
    setSaving(false);
    setRowErrors(errors);

    if (agg.allOk) {
      toast.success(t('admin.academicSetup.guided.classesBatchSuccess', { count: agg.successCount }));
      onSaved();
      onClose();
      return;
    }

    toast.error(
      t('admin.academicSetup.guided.classesBatchPartial', {
        success: agg.successCount,
        failed: agg.failCount,
      }),
    );
    if (agg.successCount > 0) onSaved();
  }

  const levelDisabled = !cycleId;
  const createDisabled =
    saving ||
    !academicYearId ||
    !levelId ||
    !academicCode ||
    !listComplete ||
    proposedNames.length === 0 ||
    classesState.loading ||
    studentOptionsState.loading;

  return (
    <SetupDrawer open={open} title={t('admin.academicSetup.guided.batchClassesTitle')} onClose={onClose}>
      <div className="col" style={{ gap: 12 }}>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academicContext.fields.academicYear')}</span>
          {studentOptionsState.loading && academicYears.length === 0 ? (
            <span className="tiny muted" aria-busy="true">
              {t('common.loading')}
            </span>
          ) : academicYears.length === 0 ? (
            <span className="tiny muted" role="status">
              {t('admin.classNoAcademicYears')}
            </span>
          ) : (
            <select
              className="input"
              value={academicYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              required
              aria-label={t('academicContext.fields.academicYear')}
            >
              <option value="">{t('academicContext.placeholders.academicYear')}</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('academicContext.fields.cycle')}</span>
          {cycles.length === 0 ? (
            <span className="tiny muted" role="status">
              {t('admin.classNoCycles')}
            </span>
          ) : (
            <select
              className="input"
              value={cycleId}
              onChange={(e) => handleCycleChange(e.target.value)}
              required
              aria-label={t('academicContext.fields.cycle')}
            >
              <option value="">{t('academicContext.placeholders.cycle')}</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('nav.levels')}</span>
          <select
            className="input"
            value={levelId}
            onChange={(e) => handleLevelChange(e.target.value)}
            required
            disabled={levelDisabled}
            aria-label={t('nav.levels')}
          >
            <option value="">{t('admin.selectLevel')}</option>
            {levelsForCycle.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
          {levelDisabled ? (
            <span className="tiny muted">{t('academicContext.placeholders.chooseCycleFirst')}</span>
          ) : levelsForCycle.length === 0 ? (
            <span className="tiny muted">{t('admin.classNoLevelsForCycle')}</span>
          ) : null}
        </label>

        {supportsTracks ? (
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.classTrackLabel')}</span>
            <select className="input" value={trackId} onChange={(e) => setTrackId(e.target.value)}>
              <option value="">{t('common.dash')}</option>
              {(tracksState.data ?? []).map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('admin.academicSetup.guided.classCount')}</span>
          <input
            className="input"
            type="number"
            min={1}
            max={12}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
            disabled={!levelId || !academicCode}
          />
        </label>

        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('admin.capacity')}</span>
          <input
            className="input"
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>

        <div className="col" style={{ gap: 6 }}>
          <span className="tiny muted">{t('admin.classCanonicalPreviewTitle')}</span>
          {levelId && !academicCode ? (
            <p className="tiny" role="alert" style={{ color: 'var(--danger, #b91c1c)' }}>
              {t('admin.classMissingAcademicCode')}
            </p>
          ) : !academicYearId || !levelId ? (
            <span className="tiny muted">{t('admin.classCanonicalPreviewNeedContext')}</span>
          ) : classesState.loading ? (
            <span className="tiny muted" aria-busy="true">
              {t('common.loading')}
            </span>
          ) : !listComplete ? (
            <p className="tiny" role="alert" style={{ color: 'var(--danger, #b91c1c)' }}>
              {t('admin.classListIncompleteForNaming')}
            </p>
          ) : (
            <ul className="col" style={{ gap: 4, margin: 0, paddingInlineStart: 18 }}>
              {proposedNames.map((name) => (
                <li key={name} className="mono" dir="ltr">
                  {name}
                </li>
              ))}
            </ul>
          )}
          {proposedNames.map((name, index) =>
            rowErrors[index] ? (
              <span key={`${name}-err`} className="tiny" style={{ color: '#b91c1c' }}>
                {name}: {rowErrors[index]}
              </span>
            ) : null,
          )}
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="tiny muted">{t('nav.subjects')}</span>
          {!levelId ? (
            <span className="tiny muted">{t('admin.selectLevel')}</span>
          ) : (
            <ClassSubjectsField
              t={t}
              loading={subjectsLoading}
              error={subjectOptionsState.error}
              options={levelSubjectOptions}
              legacy={[]}
              selectedIds={subjectIds}
              onToggle={toggleSubjectId}
              onSelectAll={() => setSubjectIds(levelSubjectOptions.map((s) => s.id))}
              onClearAll={() => setSubjectIds([])}
              onRetry={() => {
                subjectOptionsState.reload();
                schoolSubjectsState.reload();
                levelDetailState.reload();
              }}
              canAddSubject={false}
            />
          )}
        </div>

        <button
          type="button"
          className="btn btn--primary"
          disabled={createDisabled}
          onClick={handleSave}
        >
          {saving
            ? t('common.saving')
            : t('admin.academicSetup.guided.createClassesCount', { count: proposedNames.length || count })}
        </button>
      </div>
    </SetupDrawer>
  );
}
