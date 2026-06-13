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
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import {
  buildLevelsById,
  buildSubjectDisplayLabel,
  countSubjectsByName,
  filterSubjectsByQuery,
  type SubjectLevelRef,
} from '../utils/subject-display';
import {
  createEmptyAssignmentDraft,
  findDuplicateAssignmentKey,
  isAssignmentDraftComplete,
  isTeacherProfilePayloadDirty,
  normalizeAssignmentDrafts,
  syncTeacherAssignments,
  teachingAssignmentToDraft,
  type TeacherAssignmentDraft,
} from '../utils/teacher-assignments';
import { extractTeacherIdFromMutation } from '../utils/teacher-mutation';
import { useTeacherAssignments } from '../hooks/use-teacher-assignments';

type TeacherFormStep = 'profile' | 'assignments';

function resolveTeacherLogin(teacher?: Teacher): string {
  return teacher?.login?.trim() || teacher?.account?.login?.trim() || teacher?.email?.trim() || '';
}

function buildProfileSnapshot(
  name: string,
  code: string,
  phone: string,
  email: string,
  login: string,
  specialization: string,
) {
  return {
    name,
    code,
    phone,
    email,
    login,
    specialization,
  };
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
}: {
  teacher?: Teacher;
  onSaved: (id: number) => void;
  onCancel: () => void;
  canManageAssignments?: boolean;
  layout?: 'drawer' | 'page';
  onRegisterClose?: (handler: () => void) => void;
}) {
  const t = useT();
  const toast = useToast();
  const creating = !teacher;
  const [step, setStep] = useState<TeacherFormStep>('profile');
  const [saving, setSaving] = useState(false);

  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, { page_size: 500 });
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects, { page_size: 500 });
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, { page_size: 200 });
  const teacherDetailState = useAdminResource<Teacher>(
    teacher ? endpoints.admin.teacher(teacher.id) : null,
  );
  const assignmentsState = useTeacherAssignments(teacher?.id ?? null);

  const resolvedTeacher = teacherDetailState.data ?? teacher;

  const [name, setName] = useState(teacher?.name ?? '');
  const [code, setCode] = useState(teacher?.code ?? '');
  const [phone, setPhone] = useState(teacher?.phone ?? '');
  const [email, setEmail] = useState(teacher?.email ?? '');
  const [login, setLogin] = useState(resolveTeacherLogin(teacher));
  const [useDifferentLogin, setUseDifferentLogin] = useState(false);
  const [specialization, setSpecialization] = useState(teacher?.specialization ?? '');
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

  const originalEmail = teacher?.email ?? '';
  const originalLogin = resolveTeacherLogin(teacher);
  const originalProfileRef = useRef(
    buildProfileSnapshot(
      teacher?.name ?? '',
      teacher?.code ?? '',
      teacher?.phone ?? '',
      teacher?.email ?? '',
      resolveTeacherLogin(teacher),
      teacher?.specialization ?? '',
    ),
  );

  useEffect(() => {
    if (!resolvedTeacher || creating) return;
    setName(resolvedTeacher.name);
    setCode(resolvedTeacher.code ?? '');
    setPhone(resolvedTeacher.phone ?? '');
    setEmail(resolvedTeacher.email ?? '');
    const resolvedLogin = resolveTeacherLogin(resolvedTeacher);
    setLogin(resolvedLogin);
    setSpecialization(resolvedTeacher.specialization ?? '');
    originalProfileRef.current = buildProfileSnapshot(
      resolvedTeacher.name,
      resolvedTeacher.code ?? '',
      resolvedTeacher.phone ?? '',
      resolvedTeacher.email ?? '',
      resolvedLogin,
      resolvedTeacher.specialization ?? '',
    );
  }, [resolvedTeacher, creating]);

  useEffect(() => {
    if (creating || assignmentsInitialized || assignmentsState.loading) return;
    const drafts = assignmentsState.assignments.map(teachingAssignmentToDraft);
    setAssignmentRows(drafts);
    originalAssignmentsRef.current = serializeAssignments(drafts);
    setAssignmentsInitialized(true);
  }, [creating, assignmentsInitialized, assignmentsState.loading, assignmentsState.assignments]);

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
        label: cls.level?.name ? `${cls.name} — ${cls.level.name}` : cls.name,
      })),
    [classesState.data],
  );

  const lookupLoading = classesState.loading || subjectsState.loading || levelsState.loading;
  const lookupError =
    classesState.error ?? subjectsState.error ?? levelsState.error ?? assignmentsState.error;

  const profileDirty = isTeacherProfilePayloadDirty(
    buildProfileSnapshot(name, code, phone, email, login, specialization),
    originalProfileRef.current,
  );
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

  const validateProfile = useCallback(() => {
    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return false;
    }
    return true;
  }, [name, t, toast]);

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
    if (!validateProfile()) return;
    setStep('assignments');
  }

  async function saveAll() {
    if (!validateProfile()) {
      setStep('profile');
      return;
    }
    if (canManageAssignments && !validateAssignments()) {
      setStep('assignments');
      return;
    }

    const identity = teacher
      ? buildAccountIdentityPayload({
          email,
          login,
          originalEmail,
          originalLogin,
          useDifferentLogin: true,
          isCreate: false,
        })
      : { email: email.trim() || undefined };

    const profilePayload = {
      name: name.trim(),
      code: code.trim() || undefined,
      phone: phone.trim() || undefined,
      specialization: specialization.trim() || undefined,
      ...identity,
    };

    setSaving(true);
    const profileRes = teacher
      ? await api.post(endpoints.admin.teacherUpdate(teacher.id), profilePayload)
      : await api.post(endpoints.admin.teachers, profilePayload);
    setSaving(false);

    if (!profileRes.success) {
      toast.error(mapAccountApiError(profileRes.error, t) || profileRes.error.message);
      setStep('profile');
      return;
    }

    const teacherId = extractTeacherIdFromMutation(profileRes.data);
    if (!teacherId) {
      toast.error(t('errors.serverError'));
      return;
    }

    const feedback = resolveAccountMutationFeedback(profileRes, t, {
      createdKey: 'admin.account.accountCreated',
      updatedKey: 'admin.saveSuccess',
      alreadyExistsKey: 'admin.account.accountAlreadyExists',
    });

    if (canManageAssignments) {
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
        onSaved(teacherId);
        return;
      }
    }

    if (feedback) applyAccountMutationToasts(feedback, toast);
    else toast.success(t('admin.saveSuccess'));
    onSaved(teacherId);
  }

  const completeAssignments = normalizeAssignmentDrafts(assignmentRows);
  const shellClass = layout === 'drawer' ? 'teacher-setup-form teacher-setup-form--drawer' : 'teacher-setup-form';

  return (
    <div className={shellClass}>
      <TeacherFormStepper step={step} />

      {lookupError ? (
        <p className="teacher-setup-form__error" role="alert">
          {mapAcademicSetupApiError(lookupError, t, 'assignment')}
        </p>
      ) : null}

      {step === 'profile' ? (
        <div className="teacher-setup-form__section">
          <p className="teacher-setup-form__notice">{t('admin.academicSetup.teacherForm.apiLimitsNotice')}</p>

          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">
              {t('admin.fullName')} <span aria-hidden="true">*</span>
            </span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          {!creating && resolvedTeacher ? <AccountStatusBadge entity={resolvedTeacher} showLogin /> : null}

          <div className="teacher-setup-form__grid">
            <label className="teacher-setup-field">
              <span className="teacher-setup-field__label">{t('admin.code')}</span>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="teacher-setup-field">
              <span className="teacher-setup-field__label">{t('admin.phone')}</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>

          {teacher ? (
            <AccountFieldsSection
              mode="edit"
              email={email}
              login={login}
              useDifferentLogin={useDifferentLogin}
              onEmailChange={setEmail}
              onLoginChange={setLogin}
              onUseDifferentLoginChange={setUseDifferentLogin}
              disabled={saving}
            />
          ) : (
            <label className="teacher-setup-field">
              <span className="teacher-setup-field__label">{t('admin.email')}</span>
              <input
                className="input"
                type="text"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}

          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">
              {t('admin.academicSetup.teacherForm.specialization')}
            </span>
            <input
              className="input"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            />
          </label>
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
          <button type="button" className="btn btn--primary btn--sm" onClick={goNext} disabled={saving}>
            {t('admin.academicSetup.teacherForm.next')}
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--sm" onClick={saveAll} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        )}
      </div>
    </div>
  );
}
