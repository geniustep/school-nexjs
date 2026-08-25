'use client';

import { FormEvent, useState } from 'react';
import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import {
  postConfirmAppointment,
  postProposeAppointment,
  postRequestAppointmentChange,
} from '../api';
import { adminRequestErrorLabel } from '../presenters';
import type { AdminRequest, AdminRequestRole } from '../types';

function targetLabel(value: string): string {
  return value === 'subject_teacher' ? 'بخصوص مادة دراسية' : 'الإدارة';
}

function periodLabel(value?: string | null): string {
  if (value === 'morning') return 'الصباح';
  if (value === 'afternoon') return 'بعد الزوال';
  if (value === 'any') return 'أي وقت مناسب';
  return '—';
}

function stateLabel(value?: string | null): string {
  if (value === 'requested') return 'بانتظار اقتراح الإدارة';
  if (value === 'proposed') return 'موعد مقترح';
  if (value === 'confirmed') return 'موعد مؤكد';
  return '—';
}

function displayDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('ar-MA', { dateStyle: 'medium', timeStyle: 'short' });
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
  const canPropose = role === 'admin' && actions.includes('propose_appointment');

  async function confirm() {
    if (!isFamily || busy) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    const response = await postConfirmAppointment(role, requestId);
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error));
      reload();
      return;
    }
    setSuccess('تم تأكيد الموعد.');
    reload();
  }

  async function requestChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFamily || busy) return;
    if (!changeBody.trim()) {
      setError('اكتب التغيير الذي تقترحه على الموعد.');
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    const response = await postRequestAppointmentChange(role, requestId, { body: changeBody });
    setBusy(false);
    if (!response.success) {
      setError(adminRequestErrorLabel(response.error));
      reload();
      return;
    }
    setChangeBody('');
    setChangeOpen(false);
    setSuccess('أُرسل طلب تغيير الموعد إلى الإدارة للمراجعة.');
    reload();
  }

  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== 'admin' || busy) return;
    if (!scheduledStart || !scheduledEnd) {
      setError('حدد بداية الموعد ونهايته.');
      return;
    }
    if (new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime()) {
      setError('يجب أن تكون نهاية الموعد بعد بدايته.');
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
      setError(adminRequestErrorLabel(response.error));
      return;
    }
    setScheduledStart('');
    setScheduledEnd('');
    setSuccess('تم اقتراح الموعد وإتاحته لصاحب الطلب للتأكيد.');
    reload();
  }

  const details = [
    { label: 'نوع الموعد', value: targetLabel(appointment.target_kind) },
    ...(appointment.requested_subject?.name
      ? [{ label: 'المادة', value: appointment.requested_subject.name }]
      : []),
    { label: 'التاريخ المفضل', value: appointment.preferred_date ?? '—' },
    { label: 'الفترة المفضلة', value: periodLabel(appointment.preferred_period) },
    { label: 'حالة الموعد', value: stateLabel(appointment.appointment_state) },
    ...(appointment.scheduled_start
      ? [{ label: 'بداية الموعد', value: displayDate(appointment.scheduled_start) }]
      : []),
    ...(appointment.scheduled_end
      ? [{ label: 'نهاية الموعد', value: displayDate(appointment.scheduled_end) }]
      : []),
    ...(role === 'admin' && appointment.resolved_teacher?.name
      ? [{ label: 'الأستاذ المحسوم داخليًا', value: appointment.resolved_teacher.name }]
      : []),
  ];

  return (
    <section className="section">
      <SectionHead title="الموعد" />
      <Card>
        <DefinitionList items={details} />

        {role === 'admin' && appointment.target_kind === 'subject_teacher' && !appointment.resolved_teacher && (
          <p className="tiny muted">
            لم يُحسم أستاذ واحد داخليًا لهذا الطلب. لا يتم اختيار أستاذ اعتباطيًا.
          </p>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}
        {success && <p className="tiny muted" role="status">{success}</p>}

        {(canConfirm || canRequestChange) && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {canConfirm && (
              <button type="button" className="btn btn--primary" disabled={busy} onClick={confirm}>
                {busy ? 'جارٍ التأكيد…' : 'تأكيد الموعد'}
              </button>
            )}
            {canRequestChange && !changeOpen && (
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setChangeOpen(true)}>
                طلب تغيير الموعد
              </button>
            )}
          </div>
        )}

        {canRequestChange && changeOpen && (
          <form className="col" style={{ gap: 10, marginTop: 12 }} onSubmit={requestChange}>
            <label className="field">
              <span>ما التغيير الذي تقترحه؟</span>
              <textarea
                className="input"
                value={changeBody}
                onChange={(event) => setChangeBody(event.target.value)}
                rows={3}
                maxLength={4000}
                disabled={busy}
                required
                placeholder="مثال: أفضل موعدًا في الفترة الصباحية أو في يوم آخر…"
              />
            </label>
            <p className="tiny muted">لن يتغير الموعد مباشرة؛ سيرسل طلبك إلى الإدارة للمراجعة.</p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الإرسال…' : 'إرسال طلب التغيير'}
              </button>
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { setChangeOpen(false); setChangeBody(''); }}>
                إلغاء
              </button>
            </div>
          </form>
        )}

        {canPropose && (
          <form className="col" style={{ gap: 10, marginTop: 12 }} onSubmit={propose}>
            <strong>اقتراح موعد</strong>
            <div className="grid grid--form">
              <label className="field">
                <span>البداية</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(event) => setScheduledStart(event.target.value)}
                  disabled={busy}
                  required
                />
              </label>
              <label className="field">
                <span>النهاية</span>
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
                {busy ? 'جارٍ الحفظ…' : 'اقتراح هذا الموعد'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </section>
  );
}
