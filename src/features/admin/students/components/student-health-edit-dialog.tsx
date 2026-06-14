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
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await api.post<unknown>(
      endpoints.admin.studentHealthUpdate(studentId),
      payload,
      query,
    );
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
      <form className="form form--stacked" onSubmit={handleSubmit}>
        {errors.general ? <p className="form-error">{errors.general}</p> : null}

        <label className="form-field">
          <span>{t('admin.student360.health.bloodType')}</span>
          <select value={state.bloodType} onChange={(e) => update({ bloodType: e.target.value })}>
            <option value="">{t('common.dash')}</option>
            {bloodTypes.map((bt) => (
              <option key={bt.value} value={bt.value}>
                {bt.label}
              </option>
            ))}
          </select>
          {errors.bloodType ? <span className="field-error">{errors.bloodType}</span> : null}
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.allergies')}</span>
          <textarea rows={2} value={state.allergies} onChange={(e) => update({ allergies: e.target.value })} />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.chronicConditions')}</span>
          <textarea
            rows={2}
            value={state.chronicConditions}
            onChange={(e) => update({ chronicConditions: e.target.value })}
          />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.regularMedications')}</span>
          <textarea
            rows={2}
            value={state.regularMedications}
            onChange={(e) => update({ regularMedications: e.target.value })}
          />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.specialNeeds')}</span>
          <textarea rows={2} value={state.specialNeeds} onChange={(e) => update({ specialNeeds: e.target.value })} />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.emergencyInstructions')}</span>
          <textarea
            rows={2}
            value={state.healthEmergencyInstructions}
            onChange={(e) => update({ healthEmergencyInstructions: e.target.value })}
          />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.doctorName')}</span>
          <input type="text" value={state.doctorName} onChange={(e) => update({ doctorName: e.target.value })} />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.doctorPhone')}</span>
          <input type="text" value={state.doctorPhone} onChange={(e) => update({ doctorPhone: e.target.value })} />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.insuranceProvider')}</span>
          <input
            type="text"
            value={state.insuranceProvider}
            onChange={(e) => update({ insuranceProvider: e.target.value })}
          />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.insuranceNumber')}</span>
          <input
            type="text"
            value={state.insuranceNumber}
            onChange={(e) => update({ insuranceNumber: e.target.value })}
          />
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.insuranceExpiry')}</span>
          <input
            type="date"
            value={state.insuranceExpiryDate}
            onChange={(e) => update({ insuranceExpiryDate: e.target.value })}
          />
          {errors.insuranceExpiryDate ? (
            <span className="field-error">{errors.insuranceExpiryDate}</span>
          ) : null}
        </label>

        <label className="form-field">
          <span>{t('admin.student360.health.notes')}</span>
          <textarea rows={3} value={state.notes} onChange={(e) => update({ notes: e.target.value })} />
        </label>

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
