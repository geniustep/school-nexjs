'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { ChequeStatusBadge } from '@/features/admin/finance/cheque-status-badge';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  CHEQUE_REJECTION_REASON_CODES,
  extractChequeTransitionData,
  postChequeReject,
  type ChequeLifecycleTransitionData,
  type ChequeRejectionReasonCode,
} from '@/features/admin/finance/cheque-lifecycle-api';
import { chequeErrorMessageKey } from '@/lib/utils/cheque';
import type { ChequeTransitionSummary } from './cheque-transition-summary';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ChequeRejectionDialog({
  chequeId,
  open,
  summary,
  onClose,
  onSuccess,
}: {
  chequeId: number;
  open: boolean;
  summary: ChequeTransitionSummary;
  onClose: () => void;
  onSuccess: (data: ChequeLifecycleTransitionData) => void;
}) {
  const t = useT();
  const toast = useToast();
  const submittedRef = useRef(false);
  const [rejectionDate, setRejectionDate] = useState(todayIso());
  const [reasonCode, setReasonCode] = useState<ChequeRejectionReasonCode>('insufficient_funds');
  const [reason, setReason] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRejectionDate(todayIso());
      setReasonCode('insufficient_funds');
      setReason('');
      setBankReference('');
      setNote('');
      setSubmitting(false);
      submittedRef.current = false;
    }
  }, [open, chequeId]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submittedRef.current) return;
    if (!rejectionDate) {
      toast.error(t('admin.finance.cheques.errors.chequeRejectionReasonRequired'));
      return;
    }
    if (!reasonCode) {
      toast.error(t('admin.finance.cheques.errors.chequeRejectionReasonRequired'));
      return;
    }
    if (reasonCode === 'other' && !reason.trim()) {
      toast.error(t('admin.finance.cheques.errors.chequeRejectionReasonRequired'));
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    const res = await postChequeReject(chequeId, {
      rejection_date: rejectionDate,
      reason_code: reasonCode,
      reason: reasonCode === 'other' ? reason.trim() : reason.trim() || null,
      bank_reference: bankReference.trim() || null,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success(t('admin.finance.cheques.lifecycle.chequeRejectedSuccess'));
      onSuccess(extractChequeTransitionData(res.data));
      onClose();
      return;
    }
    submittedRef.current = false;
    const key = chequeErrorMessageKey(res.error?.code);
    toast.error(key ? t(key) : res.error?.message ?? t('admin.finance.cheques.errors.chequeRejectionFailed'));
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={submitting ? undefined : onClose}>
      <form
        className="card modal-panel finance-cheque-dialog finance-cheque-dialog--reject"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3>{t('admin.finance.cheques.lifecycle.confirmRejectionTitle')}</h3>
        <p className="finance-cheque-dialog__description">
          {t('admin.finance.cheques.lifecycle.rejectionDescription')}
        </p>
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
              <ChequeStatusBadge state={summary.currentState} settlementStatus={summary.settlementStatus} />
            </dd>
          </div>
        </dl>
        <label className="finance-cheque-dialog__field">
          <span>
            {t('admin.finance.cheques.lifecycle.rejectionDate')}
            <span className="finance-cheque-dialog__required" aria-hidden>
              {' '}
              *
            </span>
          </span>
          <input
            className="input"
            type="date"
            required
            value={rejectionDate}
            disabled={submitting}
            onChange={(e) => setRejectionDate(e.target.value)}
          />
        </label>
        <label className="finance-cheque-dialog__field">
          <span>
            {t('admin.finance.cheques.lifecycle.rejectionReasonCode')}
            <span className="finance-cheque-dialog__required" aria-hidden>
              {' '}
              *
            </span>
          </span>
          <select
            className="input"
            required
            value={reasonCode}
            disabled={submitting}
            onChange={(e) => setReasonCode(e.target.value as ChequeRejectionReasonCode)}
          >
            {CHEQUE_REJECTION_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`admin.finance.cheques.lifecycle.rejectionReasons.${code}`)}
              </option>
            ))}
          </select>
        </label>
        {reasonCode === 'other' ? (
          <label className="finance-cheque-dialog__field">
            <span>
              {t('admin.finance.cheques.lifecycle.rejectionReason')}
              <span className="finance-cheque-dialog__required" aria-hidden>
                {' '}
                *
              </span>
            </span>
            <textarea
              className="input"
              rows={3}
              required
              value={reason}
              disabled={submitting}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        ) : (
          <label className="finance-cheque-dialog__field">
            {t('admin.finance.cheques.lifecycle.rejectionReason')}
            <textarea
              className="input"
              rows={2}
              value={reason}
              disabled={submitting}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        <label className="finance-cheque-dialog__field">
          {t('admin.finance.cheques.lifecycle.bankReference')}
          <input
            className="input mono"
            dir="ltr"
            value={bankReference}
            disabled={submitting}
            onChange={(e) => setBankReference(e.target.value)}
          />
        </label>
        <label className="finance-cheque-dialog__field">
          {t('admin.finance.cheques.lifecycle.settlementNote')}
          <textarea
            className="input"
            rows={2}
            value={note}
            disabled={submitting}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className="finance-cheque-dialog__actions">
          <button type="submit" className="btn btn--danger btn--sm" disabled={submitting}>
            {submitting ? t('common.submitting') : t('admin.finance.cheques.lifecycle.confirmRejection')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
