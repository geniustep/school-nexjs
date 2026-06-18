'use client';

import { useEffect, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentHealthProfile } from '@/types/student-360';
import { HealthTriStateField } from './health-tri-state-field';
import {
  buildStudentHealthCreatePayload,
  buildStudentHealthPartialUpdatePayload,
  defaultStudentHealthFormState,
  studentHealthFormStateFromProfile,
  validateStudentHealthForm,
  type HealthTriState,
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

function updateTriState(
  state: StudentHealthFormState,
  hasKey: 'hasAllergies' | 'hasChronicConditions' | 'hasRegularMedication' | 'hasSpecialNeeds' | 'hasEmergencyInstructions',
  descriptionKey:
    | 'allergiesDescription'
    | 'chronicConditionsDescription'
    | 'regularMedicationDescription'
    | 'specialNeedsDescription'
    | 'emergencyInstructions',
  next: HealthTriState,
): StudentHealthFormState {
  return {
    ...state,
    [hasKey]: next,
    [descriptionKey]: next === true ? state[descriptionKey] : '',
  };
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
        allergiesDescription: validation.errors.allergiesDescription ?? '',
        chronicConditionsDescription: validation.errors.chronicConditionsDescription ?? '',
        regularMedicationDescription: validation.errors.regularMedicationDescription ?? '',
        specialNeedsDescription: validation.errors.specialNeedsDescription ?? '',
        emergencyInstructions: validation.errors.emergencyInstructions ?? '',
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
      allergiesDescription: mapped.allergiesDescription ?? '',
      chronicConditionsDescription: mapped.chronicConditionsDescription ?? '',
      regularMedicationDescription: mapped.regularMedicationDescription ?? '',
      specialNeedsDescription: mapped.specialNeedsDescription ?? '',
      emergencyInstructions: mapped.emergencyInstructions ?? '',
      general: mapped.general ?? '',
    });
  }

  return (
    <SetupDrawer
      open={open}
      title={profile ? t('admin.student360.health.editProfile') : t('admin.student360.health.createProfile')}
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

          <HealthTriStateField
            question={t('admin.student360.health.questions.allergies')}
            value={state.hasAllergies}
            description={state.allergiesDescription}
            descriptionLabel={t('admin.student360.health.allergies')}
            descriptionError={errors.allergiesDescription}
            onChange={(next) => update(updateTriState(state, 'hasAllergies', 'allergiesDescription', next))}
            onDescriptionChange={(next) => update({ allergiesDescription: next })}
          />

          <HealthTriStateField
            question={t('admin.student360.health.questions.chronicConditions')}
            value={state.hasChronicConditions}
            description={state.chronicConditionsDescription}
            descriptionLabel={t('admin.student360.health.chronicConditions')}
            descriptionError={errors.chronicConditionsDescription}
            onChange={(next) =>
              update(updateTriState(state, 'hasChronicConditions', 'chronicConditionsDescription', next))
            }
            onDescriptionChange={(next) => update({ chronicConditionsDescription: next })}
          />

          <HealthTriStateField
            question={t('admin.student360.health.questions.regularMedication')}
            value={state.hasRegularMedication}
            description={state.regularMedicationDescription}
            descriptionLabel={t('admin.student360.health.regularMedications')}
            descriptionError={errors.regularMedicationDescription}
            onChange={(next) =>
              update(updateTriState(state, 'hasRegularMedication', 'regularMedicationDescription', next))
            }
            onDescriptionChange={(next) => update({ regularMedicationDescription: next })}
          />

          <HealthTriStateField
            question={t('admin.student360.health.questions.specialNeeds')}
            value={state.hasSpecialNeeds}
            description={state.specialNeedsDescription}
            descriptionLabel={t('admin.student360.health.specialNeeds')}
            descriptionError={errors.specialNeedsDescription}
            onChange={(next) => update(updateTriState(state, 'hasSpecialNeeds', 'specialNeedsDescription', next))}
            onDescriptionChange={(next) => update({ specialNeedsDescription: next })}
          />
        </fieldset>

        <fieldset className="student-360-drawer-form__section">
          <legend>{t('admin.student360.health.sections.emergency')}</legend>
          <HealthTriStateField
            question={t('admin.student360.health.questions.emergencyInstructions')}
            value={state.hasEmergencyInstructions}
            description={state.emergencyInstructions}
            descriptionLabel={t('admin.student360.health.emergencyInstructions')}
            descriptionError={errors.emergencyInstructions}
            onChange={(next) =>
              update(updateTriState(state, 'hasEmergencyInstructions', 'emergencyInstructions', next))
            }
            onDescriptionChange={(next) => update({ emergencyInstructions: next })}
          />
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
