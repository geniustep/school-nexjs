'use client';

import '../academic-setup-ui.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { TeacherCreateResult } from '@/types/teacher';
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
import { useTeacherOptions } from '../hooks/use-teacher-options';
import {
  buildSimplifiedTeacherCreatePayload,
  createEmptyTeacherCreateAssignmentDraft,
  defaultTeacherCreateFormState,
  normalizeTeacherCreateResult,
  storeTeacherCreateResult,
  validateTeacherCreateForm,
  type TeacherCreateAssignmentDraft,
  type TeacherCreateFieldErrors,
  type TeacherCreateFormState,
} from '../utils/teacher-create';

function SearchableSelect({
  label,
  searchLabel,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  searchLabel: string;
  value: number;
  onChange: (value: number) => void;
  options: { id: number; label: string }[];
  disabled?: boolean;
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

export function TeacherCreateForm({
  onSaved,
  onCancel,
  canManageAssignments = true,
  layout = 'page',
}: {
  onSaved: (id: number, result: TeacherCreateResult) => void;
  onCancel: () => void;
  canManageAssignments?: boolean;
  layout?: 'drawer' | 'page';
}) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const optionsState = useTeacherOptions(true);
  const options = optionsState.options;
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, { page_size: 500 });
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects, { page_size: 500 });
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, { page_size: 200 });

  const [form, setForm] = useState<TeacherCreateFormState>(() =>
    defaultTeacherCreateFormState(null),
  );
  const [assignmentRows, setAssignmentRows] = useState<TeacherCreateAssignmentDraft[]>([]);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<TeacherCreateFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  useEffect(() => {
    if (!options || defaultsApplied) return;
    setForm(defaultTeacherCreateFormState(options));
    setDefaultsApplied(true);
  }, [options, defaultsApplied]);

  const patchForm = useCallback((patch: Partial<TeacherCreateFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof TeacherCreateFormState)[]) {
        if (key in next) delete next[key as keyof TeacherCreateFieldErrors];
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
  const subjectOptions = useMemo(
    () =>
      (subjectsState.data ?? []).map((subject) => ({
        id: subject.id,
        label: buildSubjectDisplayLabel(subject, levelsById, subjectNameCounts, t),
      })),
    [subjectsState.data, levelsById, subjectNameCounts, t],
  );
  const classOptions = useMemo(
    () =>
      (classesState.data ?? []).map((cls) => ({
        id: cls.id,
        label: formatAcademicLabelLine(formatAcademicClassLabel(cls, locale)),
      })),
    [classesState.data, locale],
  );

  const showSchoolPicker = (options?.schools.length ?? 0) > 1;
  const lookupLoading = classesState.loading || subjectsState.loading || levelsState.loading;
  const completeAssignments = assignmentRows.filter(
    (row) => row.classId > 0 && row.subjectId > 0,
  );

  function addAssignmentRow() {
    setAssignmentsOpen(true);
    setAssignmentRows((rows) => [...rows, createEmptyTeacherCreateAssignmentDraft()]);
  }

  function updateAssignmentRow(key: string, patch: Partial<TeacherCreateAssignmentDraft>) {
    setAssignmentRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setFieldErrors((current) => {
      if (!current.assignments) return current;
      const next = { ...current };
      delete next.assignments;
      return next;
    });
  }

  function removeAssignmentRow(key: string) {
    setAssignmentRows((rows) => rows.filter((row) => row.key !== key));
  }

  async function handleSave() {
    if (saving) return;
    const validation = validateTeacherCreateForm(form, assignmentRows, options, t);
    setFieldErrors(validation.errors);
    if (!validation.valid) {
      toast.error(validation.errors.assignments ?? t('errors.validationFailed'));
      return;
    }

    const payload = buildSimplifiedTeacherCreatePayload(form, assignmentRows, options);
    setSaving(true);
    const res = await api.post(endpoints.admin.teachers, payload);
    setSaving(false);

    if (!res.success) {
      toast.error(mapTeacherApiError(res.error, t));
      return;
    }

    const result = normalizeTeacherCreateResult(res.data);
    if (!result) {
      toast.error(t('errors.serverError'));
      return;
    }

    storeTeacherCreateResult(result);
    toast.success(t('admin.academicSetup.teacherCreate.saveSuccess'));
    onSaved(result.teacher_id, result);
  }

  const shellClass =
    layout === 'drawer' ? 'teacher-setup-form teacher-setup-form--drawer' : 'teacher-setup-form';

  return (
    <div className={shellClass} data-testid="teacher-create-form">
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

      <section className="teacher-setup-field-group" aria-labelledby="teacher-create-basics">
        <h3 id="teacher-create-basics" className="teacher-setup-field-group__title">
          {t('admin.academicSetup.teacherCreate.basicsTitle')}
        </h3>
        <div className="teacher-setup-field-group__body">
          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">
              {t('admin.fullName')} <span aria-hidden="true">*</span>
            </span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              required
              disabled={saving}
              autoFocus
              dir="auto"
              data-testid="teacher-create-name"
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? 'teacher-create-name-error' : undefined}
            />
            {fieldErrors.name ? (
              <span id="teacher-create-name-error" className="teacher-setup-field__error" role="alert">
                {fieldErrors.name}
              </span>
            ) : null}
          </label>

          <div className="teacher-setup-form__grid">
            <label className="teacher-setup-field">
              <span className="teacher-setup-field__label">{t('admin.phone')}</span>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => patchForm({ phone: e.target.value })}
                disabled={saving}
                dir="ltr"
              />
            </label>
            <label className="teacher-setup-field">
              <span className="teacher-setup-field__label">{t('admin.email')}</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => patchForm({ email: e.target.value })}
                disabled={saving}
                dir="ltr"
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? 'teacher-create-email-error' : undefined}
              />
              {fieldErrors.email ? (
                <span
                  id="teacher-create-email-error"
                  className="teacher-setup-field__error"
                  role="alert"
                >
                  {fieldErrors.email}
                </span>
              ) : null}
            </label>
          </div>

          <p className="teacher-setup-form__hint">
            {t('admin.academicSetup.teacherCreate.accountAutomaticHint')}
          </p>

          {showSchoolPicker ? (
            <label className="teacher-setup-field">
              <span className="teacher-setup-field__label">
                {t('admin.academicSetup.teacherForm.school')}
              </span>
              <select
                className="input"
                value={form.schoolId}
                onChange={(e) => patchForm({ schoolId: e.target.value })}
                disabled={saving || !options}
                aria-invalid={fieldErrors.schoolId ? true : undefined}
              >
                <option value="">{t('admin.academicSetup.teacherForm.school')}</option>
                {(options?.schools ?? []).map((school) => (
                  <option key={school.id} value={String(school.id)}>
                    {school.name}
                  </option>
                ))}
              </select>
              {fieldErrors.schoolId ? (
                <span className="teacher-setup-field__error" role="alert">
                  {fieldErrors.schoolId}
                </span>
              ) : null}
            </label>
          ) : null}
        </div>
      </section>

      <section className="teacher-setup-field-group" aria-labelledby="teacher-create-assignments">
        <div className="teacher-setup-form__assignments-head">
          <h3 id="teacher-create-assignments" className="teacher-setup-field-group__title">
            {t('admin.academicSetup.teacherCreate.assignmentsTitle')}
          </h3>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setAssignmentsOpen((open) => !open)}
            aria-expanded={assignmentsOpen}
          >
            {assignmentsOpen
              ? t('admin.academicSetup.teacherCreate.hideAssignments')
              : t('admin.academicSetup.teacherCreate.showAssignments')}
          </button>
        </div>
        <p className="teacher-setup-form__hint">
          {t('admin.academicSetup.teacherCreate.assignmentsOptionalHint')}
        </p>

        {assignmentsOpen ? (
          <div className="teacher-setup-field-group__body">
            {!canManageAssignments ? (
              <p className="teacher-setup-form__notice">
                {t('admin.academicSetup.teacherForm.assignmentsForbidden')}
              </p>
            ) : null}

            <div className="teacher-setup-form__assignments-head">
              <p className="teacher-setup-form__assignments-count">
                {t('admin.academicSetup.teacherForm.assignmentsCount', {
                  count: completeAssignments.length,
                })}
              </p>
              {canManageAssignments ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={addAssignmentRow}
                  disabled={saving}
                >
                  {t('admin.academicSetup.teacherForm.addAssignment')}
                </button>
              ) : null}
            </div>

            {fieldErrors.assignments ? (
              <p className="teacher-setup-form__error" role="alert">
                {fieldErrors.assignments}
              </p>
            ) : null}

            {lookupLoading ? (
              <p className="muted">{t('common.loading')}</p>
            ) : assignmentRows.length === 0 ? (
              <p className="teacher-setup-form__empty">
                {t('admin.academicSetup.teacherCreate.assignmentsEmpty')}
              </p>
            ) : (
              <div
                className="teacher-setup-assignments"
                role="table"
                aria-label={t('admin.academicSetup.teacherCreate.assignmentsTitle')}
              >
                <div className="teacher-setup-assignments__head" role="row">
                  <span role="columnheader">
                    {t('admin.academicSetup.teacherForm.assignmentsColumnClass')}
                  </span>
                  <span role="columnheader">
                    {t('admin.academicSetup.teacherForm.assignmentsColumnSubject')}
                  </span>
                  <span role="columnheader">
                    {t('admin.academicSetup.teacherForm.assignmentsColumnAction')}
                  </span>
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
                      options={subjectOptions}
                      disabled={!canManageAssignments || saving}
                    />
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
        ) : null}
      </section>

      <div className="teacher-setup-form__actions row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void handleSave()}
          disabled={saving || optionsState.loading}
          data-testid="teacher-create-submit"
        >
          {saving ? t('common.saving') : t('admin.academicSetup.teacherCreate.saveTeacher')}
        </button>
      </div>
    </div>
  );
}
