'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { fetchCurrentCashSession, openCashSession } from '@/lib/api/finance-cash-desk';
import { cashSessionCashierName } from '@/lib/utils/cash-session-access';
import { resolveCashSessionErrorMessage } from '@/lib/utils/cash-session-errors';
import { cashSessionIsActive } from '@/lib/utils/cash-session-normalize';
import type { PaymentJournal } from '@/types/finance';
import type { CashSession } from '@/types/finance-cash-desk';

export function OpenCashSessionDialog({
  open,
  journals,
  defaultJournalId,
  existingSession,
  onClose,
  onSuccess,
}: {
  open: boolean;
  journals: PaymentJournal[];
  defaultJournalId?: number | string;
  existingSession?: CashSession | null;
  onClose: () => void;
  onSuccess: (sessionId: number) => void;
}) {
  const t = useT();
  const toast = useToast();
  const titleId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [journalId, setJournalId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockedByExistingSession =
    !!existingSession && cashSessionIsActive(existingSession.state);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError(null);
    setNote('');
    setOpeningBalance('0');
    const fallback = defaultJournalId ?? journals[0]?.id;
    setJournalId(fallback != null ? String(fallback) : '');
  }, [open, defaultJournalId, journals]);

  useEffect(() => {
    if (!open || !blockedByExistingSession) return;
    setError(
      t('admin.finance.cashDesk.openBlockedExistingSession', {
        cashierName: cashSessionCashierName(existingSession) ?? t('common.dash'),
      }),
    );
  }, [blockedByExistingSession, existingSession, open, t]);

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

  const selectedJournal = journals.find((j) => String(j.id) === journalId);
  const currencyLabel =
    selectedJournal?.currency ?? selectedJournal?.currency_code ?? null;
  const parsedOpening = Number(openingBalance);
  const canSubmit =
    !!journalId &&
    !Number.isNaN(parsedOpening) &&
    parsedOpening >= 0 &&
    !submitting &&
    !blockedByExistingSession;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await openCashSession({
      journal_id: Number(journalId),
      opening_balance: parsedOpening,
      note: note.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      if (res.error.code === 'cash_session_already_open') {
        const current = await fetchCurrentCashSession(journalId);
        const cashierName = cashSessionCashierName(current) ?? t('common.dash');
        const message = t('admin.finance.cashDesk.openBlockedExistingSession', { cashierName });
        setError(message);
        toast.error(message);
        onSuccess(0);
        return;
      }
      setError(resolveCashSessionErrorMessage(res.error, t));
      return;
    }
    toast.success(t('admin.finance.cashDesk.openSuccess'));
    onSuccess(res.data.id);
  }, [canSubmit, journalId, note, onSuccess, parsedOpening, t, toast]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card cash-desk-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cash-desk-dialog__body">
          <h2 id={titleId}>{t('admin.finance.cashDesk.openDialogTitle')}</h2>
          <div className="form-stack">
            <label className="field">
              <span>{t('admin.finance.cashDesk.fields.journal')}</span>
              <select
                className="input"
                value={journalId}
                onChange={(e) => setJournalId(e.target.value)}
                disabled={submitting || journals.length <= 1}
              >
                {journals.map((journal) => (
                  <option key={journal.id} value={journal.id}>
                    {journal.name}
                    {journal.code ? ` (${journal.code})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('admin.finance.cashDesk.fields.openingBalance')}</span>
              <div className="cash-desk-amount-with-currency">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={openingBalance}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === '' || Number(next) >= 0) setOpeningBalance(next);
                  }}
                  disabled={submitting || blockedByExistingSession}
                  aria-describedby={`${titleId}-opening-hint`}
                />
                {currencyLabel ? (
                  <span className="cash-desk-amount-with-currency__suffix" aria-hidden="true">
                    {currencyLabel}
                  </span>
                ) : null}
              </div>
              <span id={`${titleId}-opening-hint`} className="cash-desk-field-hint">
                {t('admin.finance.cashDesk.fields.openingBalanceHint')}
              </span>
            </label>
            <label className="field">
              <span>{t('admin.finance.cashDesk.fields.noteOptional')}</span>
              <textarea
                className="input"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting || blockedByExistingSession}
              />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
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
            {submitting ? t('common.saving') : t('admin.finance.cashDesk.openAction')}
          </button>
        </div>
      </div>
    </div>
  );
}
