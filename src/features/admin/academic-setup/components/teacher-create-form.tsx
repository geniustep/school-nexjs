'use client';

import '../academic-setup-ui.css';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { TeacherCreateResult } from '@/types/teacher';
import { mapTeacherApiError } from '../utils/api-errors';
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
import {
  TeacherAssignmentMatrixPicker,
  type TeacherAssignmentPair,
} from './teacher-assignment-matrix-picker';

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

  const showSchoolPicker = (options?.schools.length ?? 0) > 1;
  const lookupLoading = classesState.loading || subjectsState.loading || levelsState.loading;
  const completeAssignments = assignmentRows.filter(
    (row) => row.classId > 0 && row.subjectId > 0,
  );

  function handleAssignmentPairsChange(nextPairs: TeacherAssignmentPair[]) {
    setAssignmentRows((current) =>
      nextPairs.map((pair) => {
        const existing = current.find(
          (row) => row.classId === pair.classId && row.subjectId === pair.subjectId,
        );
        if (existing) return existing;
        return {
          ...createEmptyTeacherCreateAssignmentDraft(),
          classId: pair.classId,
          subjectId: pair.subjectId,
        };
      }),
    );
    setFieldErrors((current) => {
      if (!current.assignments) return current;
      const next = { ...current };
      delete next.assignments;
      return next;
    });
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
        <h3 id="teacher-create-assignments" className="teacher-setup-field-group__title">
          {t('admin.academicSetup.teacherCreate.assignmentsTitle')}
        </h3>
        <p className="teacher-setup-form__hint">
          {t('admin.academicSetup.teacherAssignmentMatrix.subjectsHint')}
        </p>

        {!canManageAssignments ? (
          <p className="teacher-setup-form__notice">
            {t('admin.academicSetup.teacherForm.assignmentsForbidden')}
          </p>
        ) : null}

        {fieldErrors.assignments ? (
          <p className="teacher-setup-form__error" role="alert">
            {fieldErrors.assignments}
          </p>
        ) : null}

        {lookupLoading ? (
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
            disabled={!canManageAssignments || saving}
            onChange={handleAssignmentPairsChange}
          />
        )}
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
