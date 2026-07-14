'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { executeAdmissionAction } from '../api/admissions-api';
import { mapAdmissionActionError } from '../utils/admission-action-errors';
import { validateLogContact } from '../utils/admission-action-validation';

const results = ['reached', 'no_answer', 'wrong_number', 'call_later', 'family_interested', 'family_not_interested', 'appointment_scheduled', 'information_sent', 'other'];

export function AdmissionQuickFollowUpDialog({
  admissionId,
  open,
  onClose,
  onSuccess,
}: {
  admissionId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [result, setResult] = useState('reached');
  const [note, setNote] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setResult('reached');
      setNote('');
      setNextActionDate('');
      setScheduledAt('');
      setError(null);
    }
  }, [open]);

  if (!open) return null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateLogContact({
      result,
      note,
      next_action_date: nextActionDate,
      scheduled_at: scheduledAt,
    });
    if (validation) return setError(t(validation));
    setSaving(true);
    const response = await executeAdmissionAction(
      admissionId,
      { action: 'log_contact', result, note: note.trim() || undefined, next_action_date: nextActionDate || undefined, scheduled_at: scheduledAt || undefined },
      activeSchoolId == null ? undefined : { active_school_id: activeSchoolId },
    );
    setSaving(false);
    if (!response.success) return setError(t(mapAdmissionActionError(response.error)));
    onSuccess();
    onClose();
  }
  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="card modal-panel confirmation-dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin.admissions.actions.logContact')}</h2>
        {error ? <div className="alert alert--error">{error}</div> : null}
        <label className="field"><span>{t('admin.admissions.actions.logContact')}</span><select className="input" value={result} onChange={(e) => setResult(e.target.value)}>{results.map((value) => <option key={value} value={value}>{t(`admin.admissions.contactResults.${value}`)}</option>)}</select></label>
        <label className="field"><span>{t('common.note')}</span><textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        {result === 'call_later' ? <label className="field"><span>{t('admin.admissions.nextActionDate')}</span><input className="input" type="datetime-local" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} dir="ltr" /></label> : null}
        {result === 'appointment_scheduled' ? <label className="field"><span>{t('admin.admissions.appointment.scheduledAt')}</span><input className="input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></label> : null}
        <div className="confirmation-dialog__actions"><button type="button" className="btn btn--ghost" onClick={onClose}>{t('common.cancel')}</button><button className="btn btn--primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button></div>
      </form>
    </div>,
    document.body,
  );
}
