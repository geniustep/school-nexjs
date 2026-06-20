'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { createAdmissionAppointment } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { refName } from '../utils/admission-labels';
import type { AdmissionDetail } from '@/types/admission';

export function AdmissionAppointmentsTab({
  detail,
  canCreate,
  onUpdated,
}: {
  detail: AdmissionDetail;
  canCreate: boolean;
  onUpdated: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const appointments = detail.appointments ?? [];
  const [open, setOpen] = useState(false);
  const [appointmentType, setAppointmentType] = useState('school_visit');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || !scheduledAt) return;
    setSubmitting(true);
    setError(null);
    const res = await createAdmissionAppointment(
      detail.id,
      {
        appointment_type: appointmentType,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes ? Number(durationMinutes) : undefined,
        notes: notes || undefined,
      },
      { active_school_id: activeSchoolId },
    );
    setSubmitting(false);
    if (res.success) {
      setOpen(false);
      setNotes('');
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  return (
    <div className="admissions-section">
      {canCreate && (
        <>
          {!open ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>
              {t('admin.admissions.appointments.create')}
            </button>
          ) : (
            <form className="admissions-inline-form" onSubmit={submit}>
              <h3 className="admissions-section__title">{t('admin.admissions.appointments.create')}</h3>
              {error && <div className="alert alert--error">{error}</div>}
              <div className="admissions-form-grid">
                <div className="field">
                  <label htmlFor="appt-type">{t('admin.admissions.appointments.type')}</label>
                  <select
                    id="appt-type"
                    className="input"
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                  >
                    <option value="school_visit">{t('admin.admissions.appointments.types.schoolVisit')}</option>
                    <option value="call">{t('admin.admissions.appointments.types.call')}</option>
                    <option value="assessment">{t('admin.admissions.appointments.types.assessment')}</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="appt-at">{t('admin.admissions.appointments.scheduledAt')}</label>
                  <input
                    id="appt-at"
                    type="datetime-local"
                    className="input"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="appt-duration">{t('admin.admissions.appointments.duration')}</label>
                  <input
                    id="appt-duration"
                    type="number"
                    className="input"
                    min={15}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="appt-notes">{t('common.note')}</label>
                <textarea
                  id="appt-notes"
                  className="input"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
                  {submitting ? t('common.submitting') : t('common.save')}
                </button>
                <button type="button" className="btn btn--sm" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {appointments.length === 0 ? (
        <EmptyState compact title={t('admin.admissions.appointments.empty')} />
      ) : (
        <div className="stack gap-sm">
          {appointments.map((appt) => (
            <div key={appt.id} className="card card--compact">
              <div className="between">
                <strong>{appt.appointment_type}</strong>
                <Badge tone="slate">{appt.state}</Badge>
              </div>
              <p className="muted">{appt.scheduled_at}</p>
              <p className="tiny muted">{refName(appt.assigned_user) || t('common.dash')}</p>
              {appt.notes && <p>{appt.notes}</p>}
              {appt.result_notes && (
                <p className="tiny">
                  {t('admin.admissions.appointments.resultNotes')}: {appt.result_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
