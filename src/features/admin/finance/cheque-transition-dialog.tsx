'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { ChequeStatusBadge } from '@/features/admin/finance/cheque-status-badge';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { chequeErrorMessageKey } from '@/lib/utils/cheque';
import type { ChequeTransitionAction } from '@/lib/utils/cheque';
import type { ChequeTransitionSummary } from './cheque-transition-summary';

type Props = {
  action: ChequeTransitionAction;
  path: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  summary?: ChequeTransitionSummary | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ChequeTransitionDialog({
  action,
  path,
  open,
  onClose,
  onSuccess,
  summary,
}: Props) {
  const t = useT();
  const toast = useToast();
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(todayIso());
      setReason('');
      setSubmitting(false);
    }
  }, [open, action]);

  if (!open) return null;

  const isDeposit = action === 'deposit';
  const isCancel = action === 'cancel';
  const needsReason = isCancel;
  const titleKey = `admin.finance.cheques.actions.${action}.title`;
  const confirmKey = `admin.finance.cheques.actions.${action}.confirm`;
  const warningKey = `admin.finance.cheques.actions.${action}.warning`;
  const descriptionKey = `admin.finance.cheques.actions.${action}.description`;
  const dateLabelKey = `admin.finance.cheques.actions.${action}.dateLabel`;
  const successKey = `admin.finance.cheques.actions.${action}.successToast`;
  const description = t(descriptionKey);
  const warning = t(warningKey);

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
        : { cancelled_date: date, reason: reason.trim() };
    const res = await api.post(path, body);
    setSubmitting(false);
    if (res.success) {
      const successMessage = t(successKey);
      toast.success(successMessage !== successKey ? successMessage : t('admin.actionSuccess'));
      onSuccess();
      onClose();
    } else {
      const key = chequeErrorMessageKey(res.error.code);
      toast.error(key ? t(key) : res.error.message);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={submitting ? undefined : onClose}>
      <form
        className={`card modal-panel finance-cheque-dialog${isDeposit ? ' finance-cheque-dialog--deposit' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheque-transition-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3 id="cheque-transition-dialog-title">{t(titleKey)}</h3>

        {isDeposit && description !== descriptionKey ? (
          <p className="finance-cheque-dialog__description">{description}</p>
        ) : null}

        {isDeposit && summary ? (
          <dl className="finance-cheque-dialog__summary">
            <div>
              <dt>{t('admin.finance.cheques.actions.deposit.summary.chequeNumber')}</dt>
              <dd className="mono" dir="auto">
                {summary.chequeNumber}
              </dd>
            </div>
            <div>
              <dt>{t('admin.finance.cheques.actions.deposit.summary.amount')}</dt>
              <dd>
                <FinanceMoney amount={summary.amount} currency={summary.currency ?? undefined} />
              </dd>
            </div>
            {summary.partyName ? (
              <div>
                <dt>{t('admin.finance.cheques.actions.deposit.summary.party')}</dt>
                <dd dir="auto">{summary.partyName}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t('admin.finance.cheques.actions.deposit.summary.currentStatus')}</dt>
              <dd>
                <ChequeStatusBadge state={summary.currentState} />
              </dd>
            </div>
          </dl>
        ) : null}

        {!isDeposit && warning !== warningKey ? (
          <p className="finance-cheque-dialog-warning">{warning}</p>
        ) : null}

        <label className="finance-cheque-dialog__field">
          <span>
            {t(dateLabelKey)}
            <span className="finance-cheque-dialog__required" aria-hidden>
              {' '}
              *
            </span>
          </span>
          <input
            className="input"
            type="date"
            required
            value={date}
            disabled={submitting}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        {needsReason ? (
          <label className="finance-cheque-dialog__field">
            {t('admin.finance.cheques.reason')}
            <textarea
              className="input"
              rows={3}
              required
              value={reason}
              disabled={submitting}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        ) : null}

        <div className="finance-cheque-dialog__actions">
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
