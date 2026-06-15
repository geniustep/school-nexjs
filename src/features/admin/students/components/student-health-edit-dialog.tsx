'use client';

import { useEffect, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentHealthProfile } from '@/types/student-360';
import {
  buildStudentHealthCreatePayload,
  buildStudentHealthPartialUpdatePayload,
  defaultStudentHealthFormState,
  studentHealthFormStateFromProfile,
  validateStudentHealthForm,
  type StudentHealthFormState,
} from '../utils/student-health-profile';
import { mapStudentHealthApiError } from '../utils/student-health-api-errors';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function StudentHealthEditDialog({
  open,
  studentId,
  profile,
  bloodTypes,
  onClose,
  onSaved,
}: {
  open: boolean;
  studentId: number;
  profile: StudentHealthProfile | null;
  bloodTypes: { value: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [state, setState] = useState<StudentHealthFormState>(defaultStudentHealthFormState());
  const [original, setOriginal] = useState<StudentHealthFormState>(defaultStudentHealthFormState());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next = studentHealthFormStateFromProfile(profile);
    setState(next);
    setOriginal(next);
    setErrors({});
  }, [open, profile]);

  function update(patch: Partial<StudentHealthFormState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bloodValues = bloodTypes.map((b) => b.value);
    const validation = validateStudentHealthForm(state, bloodValues, t);
    if (!validation.valid) {
      setErrors({
        bloodType: validation.errors.bloodType ?? '',
        insuranceExpiryDate: validation.errors.insuranceExpiryDate ?? '',
      });
      return;
    }

    const payload = profile
      ? buildStudentHealthPartialUpdatePayload(state, original)
      : buildStudentHealthCreatePayload(state);

    if (profile && Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setSubmitting(true);
    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await api.post<unknown>(endpoints.admin.studentHealthUpdate(studentId), payload, query);
    setSubmitting(false);

    if (res.success) {
      onSaved();
      onClose();
      return;
    }

    const mapped = mapStudentHealthApiError(res.error, t);
    setErrors({
      bloodType: mapped.bloodType ?? '',
      insuranceExpiryDate: mapped.insuranceExpiryDate ?? '',
      general: mapped.general ?? '',
    });
  }

  return (
    <SetupDrawer
      open={open}
      title={t('admin.student360.health.editProfile')}
      onClose={() => !submitting && onClose()}
    >
      <form className="student-360-drawer-form form form--stacked" onSubmit={handleSubmit}>
        {errors.general ? (
          <p className="form-error" role="alert">
            {errors.general}
          </p>
        ) : null}

        <fieldset className="student-360-drawer-form__section">
          <legend>{t('admin.student360.health.sections.basic')}</legend>
          <Field label={t('admin.student360.health.bloodType')} error={errors.bloodType}>
            <select className="select" value={state.bloodType} onChange={(e) => update({ bloodType: e.target.value })}>
              <option value="">{t('common.dash')}</option>
              {bloodTypes.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.student360.health.allergies')}>
            <textarea className="textarea" rows={2} value={state.allergies} onChange={(e) => update({ allergies: e.target.value })} />
          </Field>
          <Field label={t('admin.student360.health.chronicConditions')}>
            <textarea
              className="textarea"
              rows={2}
              value={state.chronicConditions}
              onChange={(e) => update({ chronicConditions: e.target.value })}
            />
          </Field>
          <Field label={t('admin.student360.health.regularMedications')}>
            <textarea
              className="textarea"
              rows={2}
              value={state.regularMedications}
              onChange={(e) => update({ regularMedications: e.target.value })}
            />
          </Field>
          <Field label={t('admin.student360.health.specialNeeds')}>
            <textarea className="textarea" rows={2} value={state.specialNeeds} onChange={(e) => update({ specialNeeds: e.target.value })} />
          </Field>
        </fieldset>

        <fieldset className="student-360-drawer-form__section">
          <legend>{t('admin.student360.health.sections.emergency')}</legend>
          <Field label={t('admin.student360.health.emergencyInstructions')}>
            <textarea
              className="textarea"
              rows={2}
              value={state.healthEmergencyInstructions}
              onChange={(e) => update({ healthEmergencyInstructions: e.target.value })}
            />
          </Field>
          <Field label={t('admin.student360.health.doctorName')}>
            <input className="input" type="text" value={state.doctorName} onChange={(e) => update({ doctorName: e.target.value })} dir="auto" />
          </Field>
          <Field label={t('admin.student360.health.doctorPhone')}>
            <input className="input" type="tel" value={state.doctorPhone} onChange={(e) => update({ doctorPhone: e.target.value })} dir="ltr" />
          </Field>
        </fieldset>

        <fieldset className="student-360-drawer-form__section">
          <legend>{t('admin.student360.health.sections.insurance')}</legend>
          <Field label={t('admin.student360.health.insuranceProvider')}>
            <input
              className="input"
              type="text"
              value={state.insuranceProvider}
              onChange={(e) => update({ insuranceProvider: e.target.value })}
              dir="auto"
            />
          </Field>
          <Field label={t('admin.student360.health.insuranceNumber')}>
            <input
              className="input"
              type="text"
              value={state.insuranceNumber}
              onChange={(e) => update({ insuranceNumber: e.target.value })}
              dir="auto"
            />
          </Field>
          <Field label={t('admin.student360.health.insuranceExpiry')} error={errors.insuranceExpiryDate}>
            <input
              className="input"
              type="date"
              value={state.insuranceExpiryDate}
              onChange={(e) => update({ insuranceExpiryDate: e.target.value })}
            />
          </Field>
        </fieldset>

        <fieldset className="student-360-drawer-form__section">
          <legend>{t('admin.student360.health.sections.notes')}</legend>
          <Field label={t('admin.student360.health.notes')}>
            <textarea className="textarea" rows={3} value={state.notes} onChange={(e) => update({ notes: e.target.value })} />
          </Field>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
