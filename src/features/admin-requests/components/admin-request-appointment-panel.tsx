'use client';

import { FormEvent, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import { localeToBcp47, type Locale } from '@/lib/i18n/config';
import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import {
  postConfirmAppointment,
  postProposeAppointment,
  postRequestAppointmentChange,
} from '../api';
import { appointmentDefaultEnd } from '../appointment-schedule';
import { adminRequestControlsMessage } from '../controls-i18n';
import { adminRequestMessage } from '../i18n';
import { adminRequestErrorLabel } from '../presenters';
import type { AdminRequest, AdminRequestRole } from '../types';

function targetLabel(value: string, locale: Locale): string {
  return adminRequestMessage(
    locale,
    value === 'subject_teacher' ? 'composer.targetSubjectTeacher' : 'composer.targetAdministration',
  );
}

function periodLabel(value: string | null | undefined, locale: Locale): string {
  if (value === 'morning') return adminRequestMessage(locale, 'composer.periodMorning');
  if (value === 'afternoon') return adminRequestMessage(locale, 'composer.periodAfternoon');
  if (value === 'any') return adminRequestMessage(locale, 'composer.periodAny');
  return '—';
}

function stateLabel(value: string | null | undefined, locale: Locale): string {
  if (value === 'requested') return adminRequestMessage(locale, 'appointment.stateRequested');
  if (value === 'proposed') return adminRequestMessage(locale, 'appointment.stateProposed');
  if (value === 'confirmed') return adminRequestMessage(locale, 'appointment.stateConfirmed');
  return '—';
}

function displayDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(localeToBcp47(locale), { dateStyle: 'medium', timeStyle: 'short' });
}

function displayDateOnly(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(localeToBcp47(locale), { dateStyle: 'medium' });
}

function toOdooDatetime(value: string): string {
  if (!value) return '';
  const normalized = value.replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

export function AdminRequestAppointmentPanel({
  request,
  role,
  requestId,
  reload,
}: {
  request: AdminRequest;
  role: AdminRequestRole;
  requestId: string;
  reload: () => void;
}) {
  const { locale } = useLocale();
  const appointment = request.appointment;
  const actions = request.allowed_actions ?? [];
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeBody, setChangeBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!appointment) return null;

  const isFamily = role === 'parent' || role === 'student';
  const canConfirm = isFamily && actions.includes('confirm_appointment');
  const canRequestChange = isFamily && actions.includes('request_appointment_change');
  const canPropose =
    role === 'admin' &&
    appointment.appointment_state === 'requested' &&
    actions.includes('propose_appointment');

  async function confirm() {
    if (!isFamily || busy) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    const response = await postConfirmAppointment(role, requestId);
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error, locale));
      reload();
      return;
    }
    setSuccess(adminRequestMessage(locale, 'appointment.confirmSuccess'));
    reload();
  }

  async function requestChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFamily || busy) return;
    if (!changeBody.trim()) {
      setError(adminRequestMessage(locale, 'appointment.changeBodyRequired'));
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    const response = await postRequestAppointmentChange(role, requestId, { body: changeBody });
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error, locale));
      reload();
      return;
    }
    setChangeBody('');
    setChangeOpen(false);
    setSuccess(adminRequestMessage(locale, 'appointment.changeSuccess'));
    reload();
  }

  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== 'admin' || busy || appointment.appointment_state !== 'requested') return;
    if (!scheduledStart || !scheduledEnd) {
      setError(adminRequestMessage(locale, 'appointment.scheduleRequired'));
      return;
    }
    if (new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime()) {
      setError(adminRequestMessage(locale, 'appointment.scheduleOrder'));
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    const response = await postProposeAppointment(requestId, {
      scheduled_start: toOdooDatetime(scheduledStart),
      scheduled_end: toOdooDatetime(scheduledEnd),
    });
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error, locale));
      return;
    }
    setScheduledStart('');
    setScheduledEnd('');
    setSuccess(adminRequestMessage(locale, 'appointment.proposeSuccess'));
    reload();
  }

  const details = [
    { label: adminRequestMessage(locale, 'appointment.type'), value: targetLabel(appointment.target_kind, locale) },
    ...(appointment.requested_subject?.name
      ? [{ label: adminRequestMessage(locale, 'appointment.subject'), value: appointment.requested_subject.name }]
      : []),
    {
      label: adminRequestMessage(locale, 'appointment.preferredDate'),
      value: displayDateOnly(appointment.preferred_date, locale),
    },
    { label: adminRequestMessage(locale, 'appointment.preferredPeriod'), value: periodLabel(appointment.preferred_period, locale) },
    ...(appointment.preferred_time
      ? [{ label: adminRequestControlsMessage(locale, 'appointment.preferredTime'), value: appointment.preferred_time }]
      : []),
    { label: adminRequestMessage(locale, 'appointment.state'), value: stateLabel(appointment.appointment_state, locale) },
    ...(appointment.scheduled_start
      ? [{ label: adminRequestMessage(locale, 'appointment.start'), value: displayDate(appointment.scheduled_start, locale) }]
      : []),
    ...(appointment.scheduled_end
      ? [{ label: adminRequestMessage(locale, 'appointment.end'), value: displayDate(appointment.scheduled_end, locale) }]
      : []),
    ...(role === 'admin' && appointment.resolved_teacher?.name
      ? [{ label: adminRequestMessage(locale, 'appointment.resolvedTeacher'), value: appointment.resolved_teacher.name }]
      : []),
  ];

  return (
    <section className="section">
      <SectionHead title={adminRequestMessage(locale, 'appointment.sectionTitle')} />
      <Card>
        <DefinitionList items={details} />

        {role === 'admin' && appointment.target_kind === 'subject_teacher' && !appointment.resolved_teacher && (
          <p className="tiny muted">
            {adminRequestMessage(locale, 'appointment.unresolvedTeacherHint')}
          </p>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}
        {success && <p className="tiny muted" role="status">{success}</p>}

        {(canConfirm || canRequestChange) && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {canConfirm && (
              <button type="button" className="btn btn--primary" disabled={busy} onClick={confirm}>
                {adminRequestMessage(locale, busy ? 'appointment.confirming' : 'appointment.confirm')}
              </button>
            )}
            {canRequestChange && !changeOpen && (
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setChangeOpen(true)}>
                {adminRequestMessage(locale, 'appointment.change')}
              </button>
            )}
          </div>
        )}

        {canRequestChange && changeOpen && (
          <form className="col" style={{ gap: 10, marginTop: 12 }} onSubmit={requestChange}>
            <label className="field">
              <span>{adminRequestMessage(locale, 'appointment.changeQuestion')}</span>
              <textarea
                className="input"
                dir="auto"
                value={changeBody}
                onChange={(event) => setChangeBody(event.target.value)}
                rows={3}
                maxLength={4000}
                disabled={busy}
                required
                placeholder={adminRequestMessage(locale, 'appointment.changePlaceholder')}
              />
            </label>
            <p className="tiny muted">{adminRequestMessage(locale, 'appointment.changeHint')}</p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn--primary" disabled={busy}>
                {adminRequestMessage(locale, busy ? 'common.sending' : 'appointment.changeSend')}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={busy}
                onClick={() => { setChangeOpen(false); setChangeBody(''); }}
              >
                {adminRequestMessage(locale, 'common.cancel')}
              </button>
            </div>
          </form>
        )}

        {canPropose && (
          <form className="col" style={{ gap: 10, marginTop: 12 }} onSubmit={propose}>
            <strong>{adminRequestMessage(locale, 'appointment.proposeTitle')}</strong>
            <div className="grid grid--form">
              <label className="field">
                <span>{adminRequestMessage(locale, 'appointment.start')}</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(event) => {
                    const nextStart = event.target.value;
                    setScheduledStart(nextStart);
                    setScheduledEnd(appointmentDefaultEnd(nextStart));
                  }}
                  disabled={busy}
                  required
                />
              </label>
              <label className="field">
                <span>{adminRequestMessage(locale, 'appointment.end')}</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(event) => setScheduledEnd(event.target.value)}
                  disabled={busy}
                  required
                />
              </label>
            </div>
            <div>
              <button className="btn btn--primary" disabled={busy}>
                {adminRequestMessage(locale, busy ? 'common.saving' : 'appointment.propose')}
              </button>
            </div>
          </form>
        )}
      </Card>
    </section>
  );
}
