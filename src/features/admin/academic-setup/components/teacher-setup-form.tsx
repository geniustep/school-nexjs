'use client';

import '../academic-setup-ui.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useLocale, useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher, TeacherProfileFieldErrors, TeacherProfileFormState } from '@/types/teacher';
import { mapTeacherApiError } from '../utils/api-errors';
import {
  formatAcademicClassLabel,
  formatAcademicLabelLine,
} from '../utils/format-academic-label';
import {
  buildLevelsById,
  buildSubjectDisplayLabel,
  countSubjectsByName,
  type SubjectLevelRef,
} from '../utils/subject-display';
import {
  createEmptyAssignmentDraft,
  findDuplicateAssignmentKey,
  isAssignmentDraftComplete,
  normalizeAssignmentDrafts,
  syncTeacherAssignments,
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

type TeacherFormStep = 'profile' | 'assignments';

function resolveTeacherLogin(teacher?: Teacher): string {
  return teacher?.login?.trim() || teacher?.account?.login?.trim() || teacher?.email?.trim() || '';
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

function SearchableSelect({
  label,
  searchLabel,
  value,
  onChange,
  options,
  disabled,
  required,
}: {
  label: string;
  searchLabel: string;
  value: number;
  onChange: (value: number) => void;
  options: { id: number; label: string }[];
  disabled?: boolean;
  required?: boolean;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <label className="teacher-setup-field">
      <span className="teacher-setup-field__label">{label}</span>
      <input
        className="input teacher-setup-field__search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchLabel}
        disabled={disabled}
        aria-label={searchLabel}
      />
      <select
        className="input"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        required={required}
      >
        <option value="">{label}</option>
        {filtered.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
  const { locale } = useLocale();
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
    setAssignmentRows(drafts);
    originalAssignmentsRef.current = serializeAssignments(drafts);
    setAssignmentsInitialized(true);
  }, [creating, assignmentsInitialized, assignmentsState.loading, assignmentsState.assignments]);

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

  const levelsById = useMemo(
    () => buildLevelsById((levelsState.data ?? []) as SubjectLevelRef[]),
    [levelsState.data],
  );
  const subjectNameCounts = useMemo(
    () => countSubjectsByName(subjectsState.data ?? []),
    [subjectsState.data],
  );

  const subjectOptions = useMemo(() => {
    return (subjectsState.data ?? []).map((subject) => ({
      id: subject.id,
      label: buildSubjectDisplayLabel(subject, levelsById, subjectNameCounts, t),
      subject,
    }));
  }, [subjectsState.data, levelsById, subjectNameCounts, t]);

  const classOptions = useMemo(
    () =>
      (classesState.data ?? []).map((cls) => ({
        id: cls.id,
        label: formatAcademicLabelLine(formatAcademicClassLabel(cls, locale)),
      })),
    [classesState.data, locale],
  );

  const lookupLoading = classesState.loading || subjectsState.loading || levelsState.loading;
  const lookupError =
    classesState.error ?? subjectsState.error ?? levelsState.error ?? assignmentsState.error;

  const profileDirty = isTeacherProfileFormDirty(profile, originalProfileRef.current);
  const assignmentsDirty =
    creating
      ? normalizeAssignmentDrafts(assignmentRows).length > 0
      : serializeAssignments(assignmentRows) !== originalAssignmentsRef.current;
  const dirty =
    profileDirty ||
    assignmentsDirty ||
    assignmentRows.some((row) => (row.classId || row.subjectId) && !isAssignmentDraftComplete(row));

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm(t('admin.academicSetup.teacherForm.unsavedWarning'))) return;
    onCancel();
  }, [dirty, onCancel, t]);

  useEffect(() => {
    onRegisterClose?.(requestClose);
  }, [onRegisterClose, requestClose]);

  function addAssignmentRow() {
    setAssignmentRows((rows) => [...rows, createEmptyAssignmentDraft()]);
  }

  function updateAssignmentRow(key: string, patch: Partial<TeacherAssignmentDraft>) {
    setAssignmentRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeAssignmentRow(key: string) {
    setAssignmentRows((rows) => rows.filter((row) => row.key !== key));
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

    let teacherId = teacher?.id ?? null;

    if (creating || profileDirty || Object.keys(identity).length > 0) {
      const profilePayload = creating
        ? buildTeacherCreatePayload(profile, identity as Record<string, unknown>, options)
        : buildTeacherUpdatePayload(profile, originalProfileRef.current, identity as Record<string, unknown>, options);

      if (!creating && Object.keys(profilePayload).length === 0) {
        teacherId = teacher!.id;
      } else {
        setSaving(true);
        const profileRes = creating
          ? await api.post(endpoints.admin.teachers, profilePayload)
          : await api.post(endpoints.admin.teacherUpdate(teacher!.id), profilePayload);
        setSaving(false);

        if (!profileRes.success) {
          const mapped = mapTeacherApiFieldError(String(profileRes.error.code ?? ''), t);
          if (Object.keys(mapped).length) setFieldErrors((prev) => ({ ...prev, ...mapped }));
          toast.error(mapTeacherApiError(profileRes.error, t) || mapAccountApiError(profileRes.error, t));
          setStep('profile');
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

        if (canManageAssignments && assignmentsDirty) {
          setSaving(true);
          const syncResult = await syncTeacherAssignments(
            teacherId,
            assignmentRows,
            assignmentsState.assignments,
          );
          setSaving(false);

          if (!syncResult.ok) {
            if (feedback) applyAccountMutationToasts(feedback, toast);
            else toast.success(t('admin.saveSuccess'));
            toast.error(t('admin.academicSetup.teacherForm.partialAssignmentsSaved'));
            for (const message of syncResult.errors.slice(0, 3)) {
              toast.show(message, 'info');
            }
            await teacherDetailState.reload();
            onSaved(teacherId);
            return;
          }
        }

        if (feedback) applyAccountMutationToasts(feedback, toast);
        else toast.success(t('admin.saveSuccess'));
        await teacherDetailState.reload();
        onSaved(teacherId);
        return;
      }
    }

    if (canManageAssignments && assignmentsDirty && teacherId) {
      setSaving(true);
      const syncResult = await syncTeacherAssignments(
        teacherId,
        assignmentRows,
        assignmentsState.assignments,
      );
      setSaving(false);
      if (!syncResult.ok) {
        toast.error(t('admin.academicSetup.teacherForm.partialAssignmentsSaved'));
        for (const message of syncResult.errors.slice(0, 3)) {
          toast.show(message, 'info');
        }
        await teacherDetailState.reload();
        onSaved(teacherId);
        return;
      }
      toast.success(t('admin.saveSuccess'));
      await teacherDetailState.reload();
      onSaved(teacherId);
      return;
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

          <div className="teacher-setup-form__assignments-head">
            <p className="teacher-setup-form__assignments-count">
              {t('admin.academicSetup.teacherForm.assignmentsCount', { count: completeAssignments.length })}
            </p>
            {canManageAssignments ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={addAssignmentRow}>
                {t('admin.academicSetup.teacherForm.addAssignment')}
              </button>
            ) : null}
          </div>

          {lookupLoading || (!creating && assignmentsState.loading && !assignmentsInitialized) ? (
            <p className="muted">{t('common.loading')}</p>
          ) : assignmentRows.length === 0 ? (
            <p className="teacher-setup-form__empty">{t('admin.academicSetup.teacherForm.assignmentsEmpty')}</p>
          ) : (
            <div className="teacher-setup-assignments" role="table" aria-label={t('admin.academicSetup.teacherForm.steps.assignments')}>
              <div className="teacher-setup-assignments__head" role="row">
                <span role="columnheader">{t('admin.academicSetup.teacherForm.assignmentsColumnClass')}</span>
                <span role="columnheader">{t('admin.academicSetup.teacherForm.assignmentsColumnSubject')}</span>
                <span role="columnheader">{t('admin.academicSetup.teacherForm.assignmentsColumnHours')}</span>
                <span role="columnheader">{t('admin.academicSetup.teacherForm.assignmentsColumnAction')}</span>
              </div>
              {assignmentRows.map((row) => (
                <div key={row.key} className="teacher-setup-assignments__row" role="row">
                  <SearchableSelect
                    label={t('admin.academicSetup.teacherForm.selectClass')}
                    searchLabel={t('admin.academicSetup.teacherForm.searchClasses')}
                    value={row.classId}
                    onChange={(classId) => updateAssignmentRow(row.key, { classId })}
                    options={classOptions}
                    disabled={!canManageAssignments || saving}
                  />
                  <SearchableSelect
                    label={t('admin.academicSetup.teacherForm.selectSubject')}
                    searchLabel={t('admin.academicSetup.teacherForm.searchSubjects')}
                    value={row.subjectId}
                    onChange={(subjectId) => updateAssignmentRow(row.key, { subjectId })}
                    options={subjectOptions.map((option) => ({ id: option.id, label: option.label }))}
                    disabled={!canManageAssignments || saving}
                  />
                  <label className="teacher-setup-field teacher-setup-field--compact">
                    <span className="teacher-setup-field__label">{t('admin.academicSetup.weeklyHours')}</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={row.weeklyHours}
                      onChange={(e) =>
                        updateAssignmentRow(row.key, { weeklyHours: Number(e.target.value) || 0 })
                      }
                      disabled={!canManageAssignments || saving}
                    />
                  </label>
                  <div className="teacher-setup-assignments__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => removeAssignmentRow(row.key)}
                      disabled={!canManageAssignments || saving}
                    >
                      {t('admin.academicSetup.teacherForm.removeAssignment')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
