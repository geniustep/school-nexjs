'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { reopenCashSession } from '@/lib/api/finance-cash-desk';
import { cashSessionErrorMessageKey } from '@/lib/utils/cash-session-errors';

export function ReopenCashSessionDialog({
  open,
  sessionId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  sessionId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const titleId = useId();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setConfirmed(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const canSubmit = reason.trim().length >= 3 && confirmed && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await reopenCashSession(sessionId, { reason: reason.trim() });
    setSubmitting(false);
    if (!res.success) {
      const key = cashSessionErrorMessageKey(res.error.code);
      setError(key ? t(key) : res.error.message);
      return;
    }
    toast.success(t('admin.finance.cashDesk.reopenSuccess'));
    onSuccess();
    onClose();
  }, [canSubmit, onClose, onSuccess, reason, sessionId, t, toast]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card cash-desk-dialog cash-desk-dialog--danger"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{t('admin.finance.cashDesk.reopenDialogTitle')}</h2>
        <p className="cash-desk-warning">{t('admin.finance.cashDesk.reopenWarning')}</p>
        <div className="form-stack">
          <label className="field">
            <span>{t('admin.finance.cashDesk.fields.reopenReason')}</span>
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={submitting}
            />
            <span>{t('admin.finance.cashDesk.reopenConfirm')}</span>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
        <div className="row form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={!canSubmit}
            aria-busy={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? t('common.saving') : t('admin.finance.cashDesk.reopenAction')}
          </button>
        </div>
      </div>
    </div>
  );
}
