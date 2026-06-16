'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { addCashSessionMovement } from '@/lib/api/finance-cash-desk';
import {
  cashMovementRequiresReference,
} from '@/lib/utils/cash-movement-rules';
import { resolveCashSessionErrorMessage } from '@/lib/utils/cash-session-errors';
import {
  cashMovementTypeLabelKey,
  CASH_MOVEMENT_TYPE_OPTIONS,
} from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import type { CashMovementType } from '@/types/finance-cash-desk';

export function AddCashMovementDialog({
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
  const referenceId = useId();
  const referenceErrorId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [type, setType] = useState<CashMovementType>('cash_in_adjustment');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referenceRequired = cashMovementRequiresReference(type);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setType('cash_in_adjustment');
    setAmount('');
    setReason('');
    setReference('');
    setNote('');
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

  useEffect(() => {
    if (open) return;
    triggerRef.current?.focus();
  }, [open]);

  const parsedAmount = Number(amount);
  const referenceValid = referenceRequired ? !!reference.trim() : true;
  const canSubmit =
    !!reason.trim() &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    referenceValid &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await addCashSessionMovement(sessionId, {
      movement_type: type,
      amount: parsedAmount,
      reason: reason.trim(),
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(resolveCashSessionErrorMessage(res.error, t));
      return;
    }
    toast.success(t('admin.finance.cashDesk.movementAdded'));
    onSuccess();
    onClose();
  }, [canSubmit, note, onClose, onSuccess, parsedAmount, reason, reference, sessionId, t, toast, type]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal card cash-desk-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cash-desk-dialog__body">
          <h2 id={titleId}>{t('admin.finance.cashDesk.addMovementTitle')}</h2>
          <div className="form-stack">
            <label className="field">
              <span>{t('admin.finance.cashDesk.fields.movementType')}</span>
              <select
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value as CashMovementType)}
                disabled={submitting}
              >
                {CASH_MOVEMENT_TYPE_OPTIONS.map((code) => (
                  <option key={code} value={code}>
                    {t(cashMovementTypeLabelKey(code))}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('admin.finance.cashDesk.fields.amount')}</span>
              <input
                className="input"
                type="number"
                min={0.01}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="field">
              <span>{t('admin.finance.cashDesk.fields.reason')}</span>
              <input
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                aria-describedby={`${titleId}-reason-hint`}
              />
              <span id={`${titleId}-reason-hint`} className="cash-desk-field-hint">
                {t('admin.finance.cashDesk.fields.reasonHint')}
              </span>
            </label>
            <label className="field">
              <span>
                {referenceRequired
                  ? t('admin.finance.cashDesk.fields.referenceRequired')
                  : t('admin.finance.cashDesk.fields.referenceOptional')}
              </span>
              <input
                id={referenceId}
                className="input"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={submitting}
                required={referenceRequired}
                aria-invalid={referenceRequired && !reference.trim()}
                aria-describedby={`${referenceId}-hint${error ? ` ${referenceErrorId}` : ''}`}
              />
              <span id={`${referenceId}-hint`} className="cash-desk-field-hint">
                {referenceRequired
                  ? t('admin.finance.cashDesk.fields.referenceRequiredHint')
                  : t('admin.finance.cashDesk.fields.referenceOptionalHint')}
              </span>
            </label>
            <label className="field">
              <span>{t('admin.finance.cashDesk.fields.noteOptional')}</span>
              <textarea
                className="input"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting}
                aria-describedby={`${titleId}-note-hint`}
              />
              <span id={`${titleId}-note-hint`} className="cash-desk-field-hint">
                {t('admin.finance.cashDesk.fields.noteHint')}
              </span>
            </label>
            {error ? (
              <p id={referenceErrorId} className="form-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="cash-desk-dialog__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSubmit}
            aria-busy={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? t('common.saving') : t('admin.finance.cashDesk.addMovementAction')}
          </button>
        </div>
      </div>
    </div>
  );
}
