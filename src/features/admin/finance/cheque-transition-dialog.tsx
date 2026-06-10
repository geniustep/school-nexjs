'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { chequeErrorMessageKey } from '@/lib/utils/cheque';
import type { ChequeTransitionAction } from '@/lib/utils/cheque';

type Props = {
  action: ChequeTransitionAction;
  path: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ChequeTransitionDialog({ action, path, open, onClose, onSuccess }: Props) {
  const t = useT();
  const toast = useToast();
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const needsReason = action === 'reject' || action === 'cancel';
  const titleKey = `admin.finance.cheques.actions.${action}.title`;
  const confirmKey = `admin.finance.cheques.actions.${action}.confirm`;
  const warningKey = `admin.finance.cheques.actions.${action}.warning`;
  const dateLabelKey = `admin.finance.cheques.actions.${action}.dateLabel`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (needsReason && !reason.trim()) {
      toast.error(t('admin.finance.cheques.reasonRequired'));
      return;
    }
    setSubmitting(true);
    const body =
      action === 'deposit'
        ? { deposited_date: date }
        : action === 'clear'
          ? { cleared_date: date }
          : action === 'reject'
            ? { rejected_date: date, reason: reason.trim() }
            : { cancelled_date: date, reason: reason.trim() };
    const res = await api.post(path, body);
    setSubmitting(false);
    if (res.success) {
      toast.success(t('admin.actionSuccess'));
      onSuccess();
      onClose();
    } else {
      const key = chequeErrorMessageKey(res.error.code);
      toast.error(key ? t(key) : res.error.message);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="card modal-panel finance-cheque-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3>{t(titleKey)}</h3>
        {t(warningKey) !== warningKey && <p className="finance-cheque-dialog-warning">{t(warningKey)}</p>}
        <label>
          {t(dateLabelKey)}
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {needsReason && (
          <label>
            {t('admin.finance.cheques.reason')}
            <textarea className="input" rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
        {action === 'clear' && (
          <p className="muted">{t('admin.finance.cheques.actions.clear.bankConfirm')}</p>
        )}
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
            {submitting ? t('common.submitting') : t(confirmKey)}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
