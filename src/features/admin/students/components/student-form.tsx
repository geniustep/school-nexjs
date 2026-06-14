'use client';

import { useMemo, useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useStudentOptions } from '../hooks/use-student-options';
import { mapStudentApiError } from '../utils/student-api-errors';
import { filterClassesForEnrollment } from '../utils/student-options';
import {
  buildStudentCreatePayload,
  buildStudentPartialUpdatePayload,
  defaultStudentProfileFormState,
  studentProfileFormStateFromStudent,
  validateStudentProfileForm,
  type StudentProfileFieldErrors,
  type StudentProfileFormState,
} from '../utils/student-profile';
import {
  StudentContactFields,
  StudentEmergencyFields,
  StudentEnrollmentFields,
  StudentIdentityFields,
} from './student-form-fields';
import type { GuardianRelationship, StudentEnrollment, StudentSummary } from '@/types/student-360';

export function StudentForm({
  student,
  enrollment,
  guardianRelationships,
  onSaved,
  onCancel,
}: {
  student?: StudentSummary;
  enrollment?: StudentEnrollment | null;
  guardianRelationships?: GuardianRelationship[];
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const optionsState = useStudentOptions();
  const options = optionsState.options;

  const [state, setState] = useState<StudentProfileFormState>(() =>
    defaultStudentProfileFormState(null),
  );
  const [fieldErrors, setFieldErrors] = useState<StudentProfileFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [classClearedNotice, setClassClearedNotice] = useState(false);
  const [baseline, setBaseline] = useState<StudentProfileFormState>(() =>
    defaultStudentProfileFormState(null),
  );

  useEffect(() => {
    if (optionsState.loading) return;
    const next = student
      ? studentProfileFormStateFromStudent(student, enrollment, options)
      : defaultStudentProfileFormState(options);
    setState(next);
    setBaseline(next);
  }, [student?.id, enrollment?.id, optionsState.loading, options]);

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

  function fillEmergencyFromPrimary() {
    const primary = guardianRelationships?.find((r) => r.is_primary_contact && r.guardian);
    if (!primary?.guardian?.phone && !primary?.guardian?.name) return;
    patch({
      emergencyContactName: primary.guardian.name ?? '',
      emergencyPhone: primary.guardian.phone ?? primary.guardian.secondary_phone ?? '',
      emergencyRelationship: primary.relationship_type ?? '',
    });
  }

  const primaryHasPhone = !!guardianRelationships?.find(
    (r) => r.is_primary_contact && (r.guardian.phone || r.guardian.secondary_phone),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateStudentProfileForm(state, t);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error(t('errors.validationFailed'));
      return;
    }

    const payload = student
      ? buildStudentPartialUpdatePayload(state, baseline)
      : buildStudentCreatePayload(state);

    if (student && Object.keys(payload).length === 0) {
      toast.success(t('admin.student360.noChanges'));
      onCancel();
      return;
    }

    setSaving(true);
    const res = student
      ? await api.post(endpoints.admin.studentUpdate(student.id), payload)
      : await api.post(endpoints.admin.students, payload);
    setSaving(false);

    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      const id =
        typeof res.data === 'object' && res.data !== null && 'id' in res.data
          ? Number((res.data as { id: number }).id)
          : student?.id ?? 0;
      onSaved(id);
      return;
    }

    if (!res.success) {
      const mapped = mapStudentApiError(res.error, t);
      if (mapped.fieldErrors) setFieldErrors(mapped.fieldErrors);
      toast.error(mapped.message);
    }
  }

  return (
    <form className="col student-360-form" style={{ gap: 16 }} onSubmit={submit}>
      {optionsState.error ? (
        <Card>
          <p className="tiny muted">{t('admin.student360.optionsLoadFailed')}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={optionsState.reload}>
            {t('common.retry')}
          </button>
        </Card>
      ) : null}

      <Card>
        <SectionHead title={t('admin.student360.sections.identity')} />
        <StudentIdentityFields
          state={state}
          errors={fieldErrors}
          optionsLoading={optionsState.loading}
          genders={options?.genders ?? []}
          statuses={options?.studentStatuses ?? []}
          nationalities={options?.nationalities ?? []}
          onChange={patch}
        />
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.enrollment')} />
        {classClearedNotice ? (
          <p className="tiny muted" role="status">
            {t('admin.student360.classClearedOnLevelChange')}
          </p>
        ) : null}
        <StudentEnrollmentFields
          state={state}
          errors={fieldErrors}
          optionsLoading={optionsState.loading}
          schools={options?.schools ?? []}
          years={options?.academicYears ?? []}
          levels={options?.levels ?? []}
          classes={filteredClasses}
          registrationTypes={options?.registrationTypes ?? []}
          onChange={patch}
          onLevelChange={handleLevelChange}
        />
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.contact')} />
        <StudentContactFields state={state} errors={fieldErrors} onChange={patch} />
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.emergency')} />
        <StudentEmergencyFields
          state={state}
          errors={fieldErrors}
          emergencyRelationships={options?.emergencyRelationships ?? []}
          optionsLoading={optionsState.loading}
          onChange={patch}
          onFillFromPrimary={fillEmergencyFromPrimary}
          canFillFromPrimary={!!primaryHasPhone}
        />
      </Card>

      {!student && (
        <Card>
          <SectionHead title={t('admin.student360.sections.guardians')} />
          <p className="tiny muted">{t('admin.student360.guardianAfterCreateHint')}</p>
        </Card>
      )}

      <div className="student-360-form__actions row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
