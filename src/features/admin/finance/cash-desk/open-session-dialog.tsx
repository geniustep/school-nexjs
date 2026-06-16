'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { openCashSession } from '@/lib/api/finance-cash-desk';
import { cashSessionErrorMessageKey } from '@/lib/utils/cash-session-errors';
import type { PaymentJournal } from '@/types/finance';

export function OpenCashSessionDialog({
  open,
  journals,
  defaultJournalId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  journals: PaymentJournal[];
  defaultJournalId?: number | string;
  onClose: () => void;
  onSuccess: (sessionId: number) => void;
}) {
  const t = useT();
  const toast = useToast();
  const titleId = useId();
  const [journalId, setJournalId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNote('');
    setOpeningBalance('0');
    const fallback = defaultJournalId ?? journals[0]?.id;
    setJournalId(fallback != null ? String(fallback) : '');
  }, [open, defaultJournalId, journals]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const selectedJournal = journals.find((j) => String(j.id) === journalId);
  const parsedOpening = Number(openingBalance);
  const canSubmit =
    !!journalId &&
    !Number.isNaN(parsedOpening) &&
    parsedOpening >= 0 &&
    !submitting;

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
      const key = cashSessionErrorMessageKey(res.error.code);
      const msg = key ? t(key) : res.error.message;
      setError(msg);
      if (res.error.code === 'cash_session_already_open') {
        toast.error(t('admin.finance.cashDesk.errors.cashSessionAlreadyOpen'));
        onSuccess(0);
      }
      return;
    }
    toast.success(t('admin.finance.cashDesk.openSuccess'));
    onSuccess(res.data.id);
  }, [canSubmit, journalId, note, onSuccess, parsedOpening, t, toast]);

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
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              disabled={submitting}
            />
            {selectedJournal ? (
              <span className="muted">
                {t('admin.finance.cashDesk.fields.currency')}:{' '}
                {selectedJournal.currency ?? selectedJournal.currency_code ?? '—'}
              </span>
            ) : null}
          </label>
          <label className="field">
            <span>{t('admin.finance.cashDesk.fields.noteOptional')}</span>
            <textarea
              className="input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
        <div className="row form-actions">
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
