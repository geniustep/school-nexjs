'use client';

import '../academic-setup-ui.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useToast } from '@/components/ui/toast';
import { AccountFieldsSection } from '@/features/admin/account/account-fields-section';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { mapAccountApiError } from '@/lib/account/account-errors';
import {
  applyAccountMutationToasts,
  resolveAccountMutationFeedback,
} from '@/lib/account/account-mutation-feedback';
import { buildAccountIdentityPayload } from '@/lib/account/account-utils';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher, TeacherProfileFieldErrors, TeacherProfileFormState } from '@/types/teacher';
import { mapTeacherApiError } from '../utils/api-errors';
import {
  createEmptyAssignmentDraft,
  findDuplicateAssignmentKey,
  isAssignmentDraftComplete,
  normalizeAssignmentDrafts,
  teachingAssignmentToDraft,
  type TeacherAssignmentDraft,
} from '../utils/teacher-assignments';
import { extractTeacherIdFromMutation } from '../utils/teacher-mutation';
import {
  buildTeacherCreatePayload,
  buildTeacherUpdatePayload,
  defaultTeacherProfileFormState,
  isTeacherProfileFormDirty,
  mapTeacherApiFieldError,
  resolveStatusActiveConsistency,
  resolveTeacherLegacyGender,
  teacherProfileFormStateFromTeacher,
  validateTeacherProfileForm,
} from '../utils/teacher-profile';
import { useTeacherAssignments } from '../hooks/use-teacher-assignments';
import { useTeacherOptions } from '../hooks/use-teacher-options';
import { TeacherProfileFields } from './teacher-profile-fields';
import {
  TeacherAssignmentMatrixPicker,
  type TeacherAssignmentPair,
  type TeacherTeachingEligibility,
} from './teacher-assignment-matrix-picker';

type TeacherFormStep = 'profile' | 'assignments';
type TeacherWithEligibility = Teacher & {
  eligible_cycles?: Array<{ id: number }>;
  eligible_levels?: Array<{ id: number }>;
};

function resolveTeacherLogin(teacher?: Teacher): string {
  return teacher?.login?.trim() || teacher?.account?.login?.trim() || teacher?.email?.trim() || '';
}

function uniqueIds(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))];
}

function emptyTeachingEligibility(): TeacherTeachingEligibility {
  return { subjectIds: [], cycleIds: [], levelIds: [] };
}

function teachingEligibilityFromTeacher(teacher?: Teacher): TeacherTeachingEligibility {
  if (!teacher) return emptyTeachingEligibility();
  const extended = teacher as TeacherWithEligibility;
  return {
    subjectIds: uniqueIds((teacher.subjects ?? []).map((subject) => subject.id)),
    cycleIds: uniqueIds((extended.eligible_cycles ?? []).map((cycle) => cycle.id)),
    levelIds: uniqueIds((extended.eligible_levels ?? []).map((level) => level.id)),
  };
}

function deriveTeachingEligibilityFromAssignments(
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

function mergeTeachingEligibility(
  current: TeacherTeachingEligibility,
  additions: TeacherTeachingEligibility,
): TeacherTeachingEligibility {
  return {
    subjectIds: uniqueIds([...current.subjectIds, ...additions.subjectIds]),
    cycleIds: uniqueIds([...current.cycleIds, ...additions.cycleIds]),
    levelIds: uniqueIds([...current.levelIds, ...additions.levelIds]),
  };
}

function serializeTeachingEligibility(eligibility: TeacherTeachingEligibility): string {
  return [
    uniqueIds(eligibility.subjectIds).sort((a, b) => a - b).join(','),
    uniqueIds(eligibility.cycleIds).sort((a, b) => a - b).join(','),
    uniqueIds(eligibility.levelIds).sort((a, b) => a - b).join(','),
  ].join('|');
}

function buildAtomicAssignments(rows: TeacherAssignmentDraft[]): Array<Record<string, unknown>> {
  return normalizeAssignmentDrafts(rows).map((row) => ({
    class_id: row.classId,
    subject_id: row.subjectId,
    weekly_hours: row.weeklyHours,
    role: 'main',
  }));
}

function TeacherFormStepper({ step }: { step: TeacherFormStep }) {
  const t = useT();
  const steps: TeacherFormStep[] = ['profile', 'assignments'];
  const labels: Record<TeacherFormStep, string> = {
    profile: t('admin.academicSetup.teacherForm.steps.profile'),
    assignments: t('admin.academicSetup.teacherForm.steps.assignments'),
  };

  return (
    <ol className="teacher-setup-stepper" aria-label={t('admin.academicSetup.teacherForm.stepperLabel')}>
      {steps.map((item, index) => {
        const active = item === step;
        const done = steps.indexOf(item) < steps.indexOf(step);
        return (
          <li
            key={item}
            className="teacher-setup-stepper__item"
            data-active={active || undefined}
            data-done={done || undefined}
          >
            <span className="teacher-setup-stepper__badge">{index + 1}</span>
            <span>{labels[item]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TeacherSetupForm({
  teacher,
  onSaved,
  onCancel,
  canManageAssignments = true,
  layout = 'drawer',
  onRegisterClose,
  initialStep = 'profile',
}: {
  teacher?: Teacher;
  onSaved: (id: number) => void;
  onCancel: () => void;
  canManageAssignments?: boolean;
  layout?: 'drawer' | 'page';
  onRegisterClose?: (handler: () => void) => void;
  initialStep?: TeacherFormStep;
}) {
  const t = useT();
  const toast = useToast();
  const creating = !teacher;
  const [step, setStep] = useState<TeacherFormStep>(initialStep);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<TeacherProfileFieldErrors>({});
  const [useDifferentLogin, setUseDifferentLogin] = useState(false);

  const optionsState = useTeacherOptions(true);
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, { page_size: 500 });
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects, { page_size: 500 });
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, { page_size: 200 });
  const teacherDetailState = useAdminResource<Teacher>(
    teacher ? endpoints.admin.teacher(teacher.id) : null,
  );
  const assignmentsState = useTeacherAssignments(teacher?.id ?? null);

  const resolvedTeacher = teacherDetailState.data ?? teacher;
  const options = optionsState.options;

  const [profile, setProfile] = useState<TeacherProfileFormState>(() =>
    teacher
      ? teacherProfileFormStateFromTeacher(teacher, null)
      : defaultTeacherProfileFormState(null),
  );
  const originalProfileRef = useRef(profile);
  const originalEmail = teacher?.email ?? '';
  const originalLogin = resolveTeacherLogin(teacher);
  const defaultsAppliedRef = useRef(false);
  const teacherHydratedRef = useRef(false);

  const [assignmentRows, setAssignmentRows] = useState<TeacherAssignmentDraft[]>([]);
  const [assignmentsInitialized, setAssignmentsInitialized] = useState(false);
  const originalAssignmentsRef = useRef('');
  const [teachingEligibility, setTeachingEligibility] = useState<TeacherTeachingEligibility>(() =>
    teachingEligibilityFromTeacher(teacher),
  );
  const originalTeachingEligibilityRef = useRef(
    serializeTeachingEligibility(teachingEligibilityFromTeacher(teacher)),
  );

  function serializeAssignments(rows: TeacherAssignmentDraft[]): string {
    return normalizeAssignmentDrafts(rows)
      .map(
        (row) =>
          `${row.assignmentId ?? 'new'}:${row.classId}:${row.subjectId}:${row.weeklyHours}`,
      )
      .sort()
      .join('|');
  }

  useEffect(() => {
    setStep(initialStep);
    defaultsAppliedRef.current = false;
    teacherHydratedRef.current = false;
    setAssignmentsInitialized(false);
    const nextEligibility = teachingEligibilityFromTeacher(teacher);
    setTeachingEligibility(nextEligibility);
    originalTeachingEligibilityRef.current = serializeTeachingEligibility(nextEligibility);
  }, [teacher?.id, initialStep, creating]);

  useEffect(() => {
    if (!options || defaultsAppliedRef.current) return;
    if (creating) {
      const next = defaultTeacherProfileFormState(options);
      setProfile(next);
      originalProfileRef.current = next;
      defaultsAppliedRef.current = true;
    }
  }, [options, creating]);

  useEffect(() => {
    if (!resolvedTeacher || creating || teacherHydratedRef.current) return;
    const next = teacherProfileFormStateFromTeacher(resolvedTeacher, options);
    setProfile(next);
    originalProfileRef.current = next;
    teacherHydratedRef.current = true;
  }, [resolvedTeacher, creating, options]);

  useEffect(() => {
    if (creating || assignmentsInitialized || assignmentsState.loading) return;
    const drafts = assignmentsState.assignments.map(teachingAssignmentToDraft);
    const explicitEligibility = teachingEligibilityFromTeacher(resolvedTeacher);
    const assignmentEligibility = deriveTeachingEligibilityFromAssignments(
      drafts,
      classesState.data ?? [],
      levelsState.data ?? [],
    );
    const nextEligibility = mergeTeachingEligibility(explicitEligibility, assignmentEligibility);
    setAssignmentRows(drafts);
    originalAssignmentsRef.current = serializeAssignments(drafts);
    setTeachingEligibility(nextEligibility);
    originalTeachingEligibilityRef.current = serializeTeachingEligibility(nextEligibility);
    setAssignmentsInitialized(true);
  }, [
    creating,
    assignmentsInitialized,
    assignmentsState.loading,
    assignmentsState.assignments,
    resolvedTeacher,
    classesState.data,
    levelsState.data,
  ]);

  const patchProfile = useCallback((patch: Partial<TeacherProfileFormState>) => {
    setProfile((current) => resolveStatusActiveConsistency({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof TeacherProfileFormState)[]) {
        if (key in next) delete next[key as keyof TeacherProfileFieldErrors];
      }
      return next;
    });
  }, []);

  const lookupLoading = classesState.loading || subjectsState.loading || levelsState.loading;
  const lookupError =
    classesState.error ?? subjectsState.error ?? levelsState.error ?? assignmentsState.error;

  const profileDirty = isTeacherProfileFormDirty(profile, originalProfileRef.current);
  const assignmentsDirty =
    creating
      ? normalizeAssignmentDrafts(assignmentRows).length > 0
      : serializeAssignments(assignmentRows) !== originalAssignmentsRef.current;
  const teachingEligibilityDirty =
    serializeTeachingEligibility(teachingEligibility) !== originalTeachingEligibilityRef.current;
  const teachingSetupDirty =
    canManageAssignments && (assignmentsDirty || teachingEligibilityDirty);
  const dirty =
    profileDirty ||
    teachingSetupDirty ||
    assignmentRows.some((row) => (row.classId || row.subjectId) && !isAssignmentDraftComplete(row));

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm(t('admin.academicSetup.teacherForm.unsavedWarning'))) return;
    onCancel();
  }, [dirty, onCancel, t]);

  useEffect(() => {
    onRegisterClose?.(requestClose);
  }, [onRegisterClose, requestClose]);

  function handleAssignmentPairsChange(nextPairs: TeacherAssignmentPair[]) {
    setAssignmentRows((current) =>
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

  const validateProfileStep = useCallback(() => {
    const validation = validateTeacherProfileForm(profile, options, t);
    setFieldErrors(validation.errors);
    if (!validation.valid) {
      if (validation.globalError) toast.error(validation.globalError);
      else toast.error(t('errors.validationFailed'));
      return false;
    }
    return true;
  }, [profile, options, t, toast]);

  const validateAssignments = useCallback(() => {
    const incomplete = assignmentRows.some(
      (row) => (row.classId || row.subjectId) && !isAssignmentDraftComplete(row),
    );
    if (incomplete) {
      toast.error(t('admin.academicSetup.teacherForm.incompleteAssignment'));
      return false;
    }
    if (findDuplicateAssignmentKey(assignmentRows)) {
      toast.error(t('admin.academicSetup.teacherForm.duplicateAssignment'));
      return false;
    }
    return true;
  }, [assignmentRows, t, toast]);

  function goNext() {
    if (!validateProfileStep()) return;
    setStep('assignments');
  }

  async function saveAll() {
    if (!validateProfileStep()) {
      setStep('profile');
      return;
    }
    if (canManageAssignments && !validateAssignments()) {
      setStep('assignments');
      return;
    }

    const identity = teacher
      ? buildAccountIdentityPayload({
          email: profile.email,
          login: profile.login,
          originalEmail,
          originalLogin,
          useDifferentLogin: true,
          isCreate: false,
        })
      : { email: profile.email.trim() || undefined };

    const atomicTeachingPayload = teachingSetupDirty
      ? {
          eligible_subject_ids: uniqueIds(teachingEligibility.subjectIds),
          eligible_cycle_ids: uniqueIds(teachingEligibility.cycleIds),
          eligible_level_ids: uniqueIds(teachingEligibility.levelIds),
          assignments: buildAtomicAssignments(assignmentRows),
        }
      : {};

    let teacherId = teacher?.id ?? null;
    const shouldSaveTeacher =
      creating || profileDirty || Object.keys(identity).length > 0 || teachingSetupDirty;

    if (shouldSaveTeacher) {
      const profilePayload = creating
        ? buildTeacherCreatePayload(profile, identity as Record<string, unknown>, options)
        : buildTeacherUpdatePayload(
            profile,
            originalProfileRef.current,
            identity as Record<string, unknown>,
            options,
          );
      const mutationPayload = {
        ...profilePayload,
        ...atomicTeachingPayload,
      };

      if (!creating && Object.keys(mutationPayload).length === 0) {
        teacherId = teacher!.id;
      } else {
        setSaving(true);
        const profileRes = creating
          ? await api.post(endpoints.admin.teachers, mutationPayload)
          : await api.post(endpoints.admin.teacherUpdate(teacher!.id), mutationPayload);
        setSaving(false);

        if (!profileRes.success) {
          const mapped = mapTeacherApiFieldError(String(profileRes.error.code ?? ''), t);
          if (Object.keys(mapped).length) setFieldErrors((prev) => ({ ...prev, ...mapped }));
          toast.error(mapTeacherApiError(profileRes.error, t) || mapAccountApiError(profileRes.error, t));
          if (String(profileRes.error.code ?? '').startsWith('teacher_assignment_')) {
            setStep('assignments');
          } else {
            setStep('profile');
          }
          return;
        }

        teacherId = extractTeacherIdFromMutation(profileRes.data) ?? teacher?.id ?? null;
        if (!teacherId) {
          toast.error(t('errors.serverError'));
          return;
        }

        const feedback = resolveAccountMutationFeedback(profileRes, t, {
          createdKey: 'admin.account.accountCreated',
          updatedKey: 'admin.saveSuccess',
          alreadyExistsKey: 'admin.account.accountAlreadyExists',
        });

        if (feedback) applyAccountMutationToasts(feedback, toast);
        else toast.success(t('admin.saveSuccess'));
        await teacherDetailState.reload();
        onSaved(teacherId);
        return;
      }
    }

    toast.success(t('admin.saveSuccess'));
    onSaved(teacherId!);
  }

  const completeAssignments = normalizeAssignmentDrafts(assignmentRows);
  const shellClass = layout === 'drawer' ? 'teacher-setup-form teacher-setup-form--drawer' : 'teacher-setup-form';

  return (
    <div className={shellClass}>
      <TeacherFormStepper step={step} />

      {optionsState.loading ? (
        <p className="muted">{t('admin.academicSetup.teacherForm.optionsLoading')}</p>
      ) : null}

      {optionsState.error ? (
        <div className="teacher-setup-form__options-error" role="alert">
          <p>{mapTeacherApiError(optionsState.error, t)}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={optionsState.reload}>
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      {lookupError ? (
        <p className="teacher-setup-form__error" role="alert">
          {mapTeacherApiError(lookupError, t)}
        </p>
      ) : null}

      {step === 'profile' ? (
        <div className="teacher-setup-form__section">
          {!creating && resolvedTeacher ? <AccountStatusBadge entity={resolvedTeacher} showLogin /> : null}

          <TeacherProfileFields
            state={profile}
            options={options}
            errors={fieldErrors}
            creating={creating}
            saving={saving}
            onChange={patchProfile}
            showEmailField={creating}
            legacyGender={resolvedTeacher ? resolveTeacherLegacyGender(resolvedTeacher, options) : null}
          />

          {teacher ? (
            <AccountFieldsSection
              mode="edit"
              email={profile.email}
              login={profile.login}
              useDifferentLogin={useDifferentLogin}
              onEmailChange={(email) => patchProfile({ email })}
              onLoginChange={(login) => patchProfile({ login })}
              onUseDifferentLoginChange={setUseDifferentLogin}
              disabled={saving}
            />
          ) : null}
        </div>
      ) : (
        <div className="teacher-setup-form__section">
          {!canManageAssignments ? (
            <p className="teacher-setup-form__notice">{t('admin.academicSetup.teacherForm.assignmentsForbidden')}</p>
          ) : null}

          {lookupLoading || (!creating && assignmentsState.loading && !assignmentsInitialized) ? (
            <p className="muted">{t('common.loading')}</p>
          ) : (
            <TeacherAssignmentMatrixPicker
              levels={levelsState.data ?? []}
              classes={classesState.data ?? []}
              subjects={subjectsState.data ?? []}
              selectedPairs={completeAssignments.map((row) => ({
                classId: row.classId,
                subjectId: row.subjectId,
              }))}
              eligibility={teachingEligibility}
              currentTeacherId={teacher?.id ?? null}
              disabled={!canManageAssignments || saving}
              onChange={handleAssignmentPairsChange}
              onEligibilityChange={setTeachingEligibility}
            />
          )}
        </div>
      )}

      <div className="teacher-setup-form__actions row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={requestClose} disabled={saving}>
          {t('common.cancel')}
        </button>
        {step === 'assignments' ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep('profile')} disabled={saving}>
            {t('admin.academicSetup.teacherForm.previous')}
          </button>
        ) : null}
        {step === 'profile' ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={goNext} disabled={saving || optionsState.loading}>
            {t('admin.academicSetup.teacherForm.next')}
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--sm" onClick={saveAll} disabled={saving || optionsState.loading}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        )}
      </div>
    </div>
  );
}
