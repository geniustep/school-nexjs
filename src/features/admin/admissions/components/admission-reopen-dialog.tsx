'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { executeAdmissionAction } from '../api/admissions-api';
import { mapAdmissionActionError } from '../utils/admission-action-errors';
import { admissionApiErrorMessage } from '../utils/admission-errors';

export function AdmissionReopenDialog({
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
  const toast = useToast();
  const titleId = useId();
  const { activeSchoolId } = useAdminSession();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setError(null);
    setSubmitting(false);
  }, [open, admissionId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await executeAdmissionAction(
      admissionId,
      {
        action: 'reopen',
        note: note.trim() || undefined,
      },
      { active_school_id: activeSchoolId },
    );
    setSubmitting(false);
    if (res.success) {
      toast.success(t('admin.admissions.rejection.reopenSuccess'));
      onSuccess();
      onClose();
      return;
    }
    const mapped = mapAdmissionActionError(res.error);
    setError(mapped.startsWith('admin.') ? t(mapped) : mapped || admissionApiErrorMessage(res.error, t));
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card modal-panel confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        data-testid="admission-reopen-dialog"
      >
        <h2 id={titleId}>{t('admin.admissions.actions.reopen')}</h2>
        <p className="muted">{t('admin.admissions.rejection.reopenDialogHint')}</p>
        <form className="form-stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="admission-reopen-note">{t('common.note')}</label>
            <textarea
              id="admission-reopen-note"
              className="input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('admin.admissions.rejection.reopenNotePlaceholder')}
              disabled={submitting}
            />
          </div>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <div className="row form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? t('common.submitting') : t('admin.admissions.actions.reopen')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
