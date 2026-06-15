'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useStudentOptions } from '../hooks/use-student-options';
import { mapStudentApiError } from '../utils/student-api-errors';
import { filterClassesForEnrollment } from '../utils/student-options';
import {
  buildStudentCreatePayload,
  defaultStudentProfileFormState,
  validateStudentCreateForm,
  type StudentProfileFieldErrors,
  type StudentProfileFormState,
} from '../utils/student-profile';
import {
  StudentCreateAdditionalFields,
  StudentCreateEnrollmentFields,
  StudentCreateIdentityFields,
} from './student-form-fields';

export type StudentCreateSaveMode = 'setup' | 'list';

const FIELD_ORDER: (keyof StudentProfileFieldErrors)[] = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'massarCode',
  'academicYearId',
  'levelId',
  'classId',
  'actualJoinDate',
  'previousSchool',
  'schoolNumber',
];

export function StudentCreateForm({
  onSaved,
  onCancel,
}: {
  onSaved: (id: number, mode: StudentCreateSaveMode) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const optionsState = useStudentOptions();
  const options = optionsState.options;
  const formRef = useRef<HTMLFormElement>(null);

  const [state, setState] = useState<StudentProfileFormState>(() =>
    defaultStudentProfileFormState(null),
  );
  const [fieldErrors, setFieldErrors] = useState<StudentProfileFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<StudentCreateSaveMode>('setup');
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [classClearedNotice, setClassClearedNotice] = useState(false);

  useEffect(() => {
    if (optionsState.loading) return;
    setState(defaultStudentProfileFormState(options));
  }, [optionsState.loading, options]);

  const filteredClasses = useMemo(
    () => filterClassesForEnrollment(options?.classes ?? [], state.levelId),
    [options?.classes, state.levelId],
  );

  function patch(next: Partial<StudentProfileFormState>) {
    setState((prev) => ({ ...prev, ...next }));
    setFieldErrors({});
    setClassClearedNotice(false);
  }

  function handleLevelChange(levelId: string) {
    const compatible = filterClassesForEnrollment(options?.classes ?? [], levelId);
    const classStillValid = compatible.some((c) => String(c.id) === state.classId);
    patch({
      levelId,
      classId: classStillValid ? state.classId : '',
    });
    if (state.classId && !classStillValid) {
      setClassClearedNotice(true);
    }
  }

  function focusFirstError(errors: StudentProfileFieldErrors) {
    const firstKey = FIELD_ORDER.find((key) => errors[key]);
    if (!firstKey || !formRef.current) return;
    const el = formRef.current.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function submit(mode: StudentCreateSaveMode) {
    const validation = validateStudentCreateForm(state, t);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error(t('errors.validationFailed'));
      focusFirstError(validation.errors);
      return;
    }

    setSaveMode(mode);
    setSaving(true);
    const payload = buildStudentCreatePayload(state);
    const res = await api.post(endpoints.admin.students, payload);
    setSaving(false);

    if (res.success && res.data) {
      toast.success(t('admin.student360.create.success'));
      const id =
        typeof res.data === 'object' && res.data !== null && 'id' in res.data
          ? Number((res.data as { id: number }).id)
          : 0;
      onSaved(id, mode);
      return;
    }

    if (!res.success) {
      const mapped = mapStudentApiError(res.error, t);
      if (mapped.fieldErrors) {
        setFieldErrors(mapped.fieldErrors);
        focusFirstError(mapped.fieldErrors);
      }
      toast.error(mapped.message);
    }
  }

  return (
    <form ref={formRef} className="student-create-form" onSubmit={(e) => e.preventDefault()}>
      <section className="student-create-form__section">
        <h2 className="student-create-form__section-title">{t('admin.student360.sections.identity')}</h2>
        <div data-field="firstName">
          <StudentCreateIdentityFields
            state={state}
            errors={fieldErrors}
            optionsLoading={optionsState.loading}
            genders={options?.genders ?? []}
            onChange={patch}
          />
        </div>

        <details
          className="student-create-form__collapsible"
          open={additionalOpen}
          onToggle={(e) => setAdditionalOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="student-create-form__collapsible-summary">
            {t('admin.student360.create.additionalInfo')}
          </summary>
          <StudentCreateAdditionalFields
            state={state}
            errors={fieldErrors}
            optionsLoading={optionsState.loading}
            nationalities={options?.nationalities ?? []}
            onChange={patch}
          />
        </details>
      </section>

      <section className="student-create-form__section">
        <h2 className="student-create-form__section-title">{t('admin.student360.sections.enrollment')}</h2>
        {classClearedNotice ? (
          <p className="student-create-form__notice" role="status">
            {t('admin.student360.classClearedOnLevelChange')}
          </p>
        ) : null}
        <div data-field="academicYearId">
          <StudentCreateEnrollmentFields
            state={state}
            errors={fieldErrors}
            optionsLoading={optionsState.loading}
            optionsError={!!optionsState.error}
            years={options?.academicYears ?? []}
            levels={options?.levels ?? []}
            classes={filteredClasses}
            registrationTypes={options?.registrationTypes ?? []}
            onChange={patch}
            onLevelChange={handleLevelChange}
            onRetryOptions={optionsState.reload}
          />
        </div>
      </section>

      <div className="student-create-form__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={saving}
          onClick={() => submit('setup')}
        >
          {saving && saveMode === 'setup'
            ? t('admin.student360.create.saving')
            : t('admin.student360.create.saveAndSetup')}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={saving}
          onClick={() => submit('list')}
        >
          {saving && saveMode === 'list'
            ? t('admin.student360.create.saving')
            : t('admin.student360.create.saveOnly')}
        </button>
        <button type="button" className="btn btn--ghost" disabled={saving} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
