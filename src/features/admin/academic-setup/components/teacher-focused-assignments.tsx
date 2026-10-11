'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import { mapTeacherApiError } from '../utils/api-errors';
import {
  createEmptyAssignmentDraft,
  normalizeAssignmentDrafts,
  teachingAssignmentToDraft,
  type TeacherAssignmentDraft,
} from '../utils/teacher-assignments';
import {
  TeacherAssignmentMatrixPicker,
  type TeacherAssignmentPair,
  type TeacherTeachingEligibility,
} from './teacher-assignment-matrix-picker';

export type TeacherFocusedAssignmentsProps = {
  teacher: Teacher;
  academicYearId: number;
  canManage: boolean;
  onSaved?: () => void;
};

type TeacherWithEligibility = Teacher & {
  eligible_cycles?: Array<{ id: number }>;
  eligible_levels?: Array<{ id: number }>;
};

function uniqueIds(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))];
}

function emptyEligibility(): TeacherTeachingEligibility {
  return { subjectIds: [], cycleIds: [], levelIds: [] };
}

function eligibilityFromTeacher(teacher: Teacher): TeacherTeachingEligibility {
  const extended = teacher as TeacherWithEligibility;
  return {
    subjectIds: uniqueIds((teacher.subjects ?? []).map((subject) => subject.id)),
    cycleIds: uniqueIds((extended.eligible_cycles ?? []).map((cycle) => cycle.id)),
    levelIds: uniqueIds((extended.eligible_levels ?? []).map((level) => level.id)),
  };
}

function eligibilityFromAssignments(
  rows: TeacherAssignmentDraft[],
  classes: SchoolClass[],
  levels: Level[],
): TeacherTeachingEligibility {
  const complete = normalizeAssignmentDrafts(rows);
  const levelIds = uniqueIds(
    complete.map((row) => classes.find((cls) => cls.id === row.classId)?.level?.id ?? 0),
  );
  const cycleIds = uniqueIds(
    levelIds.map((levelId) => levels.find((level) => level.id === levelId)?.cycle?.id ?? 0),
  );
  return {
    subjectIds: uniqueIds(complete.map((row) => row.subjectId)),
    cycleIds,
    levelIds,
  };
}

function mergeEligibility(
  current: TeacherTeachingEligibility,
  additions: TeacherTeachingEligibility,
): TeacherTeachingEligibility {
  return {
    subjectIds: uniqueIds([...current.subjectIds, ...additions.subjectIds]),
    cycleIds: uniqueIds([...current.cycleIds, ...additions.cycleIds]),
    levelIds: uniqueIds([...current.levelIds, ...additions.levelIds]),
  };
}

function serializeEligibility(eligibility: TeacherTeachingEligibility): string {
  return [eligibility.subjectIds, eligibility.cycleIds, eligibility.levelIds]
    .map((ids) => uniqueIds(ids).sort((a, b) => a - b).join(','))
    .join('|');
}

function serializeAssignments(rows: TeacherAssignmentDraft[]): string {
  return normalizeAssignmentDrafts(rows)
    .map((row) => `${row.classId}:${row.subjectId}:${row.weeklyHours}`)
    .sort()
    .join('|');
}

function atomicAssignments(rows: TeacherAssignmentDraft[]): Array<Record<string, unknown>> {
  return normalizeAssignmentDrafts(rows).map((row) => ({
    class_id: row.classId,
    subject_id: row.subjectId,
    weekly_hours: row.weeklyHours,
    role: 'main',
  }));
}

export function TeacherFocusedAssignments({
  teacher,
  academicYearId,
  canManage,
  onSaved,
}: TeacherFocusedAssignmentsProps) {
  const t = useT();
  const toast = useToast();
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, { page_size: 500 });
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects, { page_size: 500 });
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, { page_size: 200 });
  const assignmentsState = useAdminResource<TeachingAssignment[]>(endpoints.admin.teachingAssignments, {
    teacher_id: teacher.id,
    academic_year_id: academicYearId,
    active: 1,
    page_size: 500,
  });

  const [rows, setRows] = useState<TeacherAssignmentDraft[]>([]);
  const [eligibility, setEligibility] = useState<TeacherTeachingEligibility>(() =>
    eligibilityFromTeacher(teacher),
  );
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmExpandedEligibility, setConfirmExpandedEligibility] = useState(false);
  const originalAssignmentsRef = useRef('');
  const originalEligibilityRef = useRef(serializeEligibility(eligibilityFromTeacher(teacher)));

  const lookupLoading =
    classesState.loading || subjectsState.loading || levelsState.loading || assignmentsState.loading;
  const lookupError =
    classesState.error ?? subjectsState.error ?? levelsState.error ?? assignmentsState.error ?? null;

  useEffect(() => {
    setInitialized(false);
    const next = eligibilityFromTeacher(teacher);
    setEligibility(next);
    originalEligibilityRef.current = serializeEligibility(next);
    originalAssignmentsRef.current = '';
    setRows([]);
  }, [teacher.id, academicYearId]);

  useEffect(() => {
    if (initialized || lookupLoading || lookupError) return;
    const drafts = (assignmentsState.data ?? []).map(teachingAssignmentToDraft);
    const fromAssignments = eligibilityFromAssignments(
      drafts,
      classesState.data ?? [],
      levelsState.data ?? [],
    );
    const nextEligibility = mergeEligibility(eligibilityFromTeacher(teacher), fromAssignments);
    setRows(drafts);
    setEligibility(nextEligibility);
    originalAssignmentsRef.current = serializeAssignments(drafts);
    originalEligibilityRef.current = serializeEligibility(nextEligibility);
    setInitialized(true);
  }, [
    initialized,
    lookupLoading,
    lookupError,
    assignmentsState.data,
    classesState.data,
    levelsState.data,
    teacher,
  ]);

  const completeRows = useMemo(() => normalizeAssignmentDrafts(rows), [rows]);
  const dirty =
    serializeAssignments(rows) !== originalAssignmentsRef.current ||
    serializeEligibility(eligibility) !== originalEligibilityRef.current;

  // Viewing levels is not consent to permanently extend an instructor's eligibility.
  const assignmentLevelIds = uniqueIds(completeRows.map((row) =>
    classesState.data?.find((cls) => cls.id === row.classId)?.level?.id ?? 0,
  ));
  const unknownClassIds = uniqueIds(completeRows.filter((row) =>
    !classesState.data?.some((cls) => cls.id === row.classId && cls.level?.id),
  ).map((row) => row.classId));
  const missingLevelIds = assignmentLevelIds.filter((id) => !eligibility.levelIds.includes(id));
  const missingCycleIds = uniqueIds(missingLevelIds.map((id) =>
    levelsState.data?.find((level) => level.id === id)?.cycle?.id ?? 0,
  ));
  const missingLevels = missingLevelIds.map((id) =>
    levelsState.data?.find((level) => level.id === id)?.name ?? `#${id}`,
  );
  const missingSubjectIds = uniqueIds(completeRows.map((row) => row.subjectId))
    .filter((id) => !eligibility.subjectIds.includes(id));

  function handlePairsChange(nextPairs: TeacherAssignmentPair[]) {
    setConfirmExpandedEligibility(false);
    setRows((current) =>
      nextPairs.map((pair) => {
        const existing = current.find(
          (row) => row.classId === pair.classId && row.subjectId === pair.subjectId,
        );
        if (existing) return existing;
        return {
          ...createEmptyAssignmentDraft(),
          classId: pair.classId,
          subjectId: pair.subjectId,
        };
      }),
    );
  }

  async function save(explicitlyExtendEligibility = false) {
    if (!canManage || saving || !dirty) return;
    if (unknownClassIds.length) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    if ((missingLevelIds.length || missingSubjectIds.length) && !explicitlyExtendEligibility) {
      setConfirmExpandedEligibility(true);
      return;
    }
    const nextEligibility = explicitlyExtendEligibility
      ? {
          subjectIds: uniqueIds([...eligibility.subjectIds, ...missingSubjectIds]),
          cycleIds: uniqueIds([...eligibility.cycleIds, ...missingCycleIds]),
          levelIds: uniqueIds([...eligibility.levelIds, ...missingLevelIds]),
        }
      : eligibility;
    setSaving(true);
    const res = await api.post(endpoints.admin.teacherUpdate(teacher.id), {
      eligible_subject_ids: uniqueIds(nextEligibility.subjectIds),
      eligible_cycle_ids: uniqueIds(nextEligibility.cycleIds),
      eligible_level_ids: uniqueIds(nextEligibility.levelIds),
      assignments: atomicAssignments(rows),
    });
    setSaving(false);

    if (!res.success) {
      const message = mapTeacherApiError(res.error, t);
      const details = res.error?.details as { class_id?: unknown; subject_id?: unknown } | undefined;
      const targetClass = (classesState.data ?? []).find((cls) => cls.id === Number(details?.class_id));
      const targetSubject = (subjectsState.data ?? []).find((subject) => subject.id === Number(details?.subject_id));
      const context = res.error?.code === 'teacher_assignment_override_required'
        ? [targetClass?.display_name || targetClass?.name, targetClass?.level?.name, targetSubject?.name]
            .filter(Boolean).join(' · ')
        : '';
      toast.error(context ? `${message} — ${context}` : message);
      return;
    }

    setEligibility(nextEligibility);
    setConfirmExpandedEligibility(false);
    originalAssignmentsRef.current = serializeAssignments(rows);
    originalEligibilityRef.current = serializeEligibility(nextEligibility);
    toast.success(t('admin.saveSuccess'));
    await assignmentsState.reload();
    onSaved?.();
  }

  if (lookupError) {
    return (
      <div className="teacher-setup-form__options-error" role="alert">
        <p>{mapTeacherApiError(lookupError, t)}</p>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            classesState.reload();
            subjectsState.reload();
            levelsState.reload();
            assignmentsState.reload();
          }}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="teacher-setup-form teacher-focused-assignments">
      {!canManage ? (
        <p className="teacher-setup-form__notice">
          {t('admin.academicSetup.teacherForm.assignmentsForbidden')}
        </p>
      ) : null}

      {lookupLoading || !initialized ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <TeacherAssignmentMatrixPicker
          levels={levelsState.data ?? []}
          classes={classesState.data ?? []}
          subjects={subjectsState.data ?? []}
          selectedPairs={completeRows.map((row) => ({
            classId: row.classId,
            subjectId: row.subjectId,
          }))}
          eligibility={eligibility}
          currentTeacherId={teacher.id}
          teacherName={teacher.name}
          academicYearId={academicYearId}
          disabled={!canManage || saving}
          replacementBlocked={dirty || saving}
          browseOnlyFilters
          onReplaced={async () => {
            await assignmentsState.reload();
            setInitialized(false);
            onSaved?.();
          }}
          onChange={handlePairsChange}
          onEligibilityChange={setEligibility}
        />
      )}

      {confirmExpandedEligibility && (missingLevelIds.length > 0 || missingSubjectIds.length > 0) && (
        <div className="teacher-setup-form__notice" role="alert">
          <p>
            تتطلب الإسنادات المختارة توسيع أهلية الأستاذ.
            {missingLevels.length > 0 ? ` المستويات: ${missingLevels.join('، ')}.` : ''}
            {missingSubjectIds.length > 0 ? ` مواد إضافية: ${missingSubjectIds.length}.` : ''}
            لن تُعدّل الأهلية دون تأكيدك، ويظل القرار النهائي لـ Odoo.
          </p>
          <div className="row">
            <button type="button" className="btn btn--primary btn--sm"
              disabled={saving || !canManage || lookupLoading || unknownClassIds.length > 0}
              onClick={() => void save(true)}>
              توسيع الأهلية وحفظ الإسنادات
            </button>
            <button type="button" className="btn btn--ghost btn--sm"
              onClick={() => setConfirmExpandedEligibility(false)}>
              إلغاء
            </button>
          </div>
        </div>
      )}
      <div className="teacher-setup-form__actions row">
        <span className="tiny muted" aria-live="polite">
          {t('admin.academicSetup.teacherForm.assignmentsCount', { count: completeRows.length })}
        </span>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!canManage || saving || lookupLoading || !initialized || !dirty}
          onClick={() => void save()}
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
