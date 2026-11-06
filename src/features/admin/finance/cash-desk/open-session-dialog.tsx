'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT, useLocale } from '@/features/i18n/locale-context';
import { copy as cashBoxCopy } from '@/features/admin/finance/cash-boxes/copy';
import type { CashRecord } from '@/features/admin/finance/cash-boxes/model';
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
  cashBoxes,
  defaultCashBoxId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  journals: PaymentJournal[];
  defaultJournalId?: number | string;
  existingSession?: CashSession | null;
  cashBoxes: CashRecord[];
  defaultCashBoxId?: number | string;
  onClose: () => void;
  onSuccess: (sessionId: number) => void;
}) {
  const t = useT();
  const {locale}=useLocale();
  const cashCopy=cashBoxCopy[locale==='en'||locale==='fr'?locale:'ar'];
  const toast = useToast();
  const titleId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [journalId, setJournalId] = useState('');
  const [cashBoxId, setCashBoxId] = useState('');
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
    setCashBoxId(defaultCashBoxId != null ? String(defaultCashBoxId) : '');
  }, [open, defaultJournalId, defaultCashBoxId, journals]);

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
  const eligibleBoxes=cashBoxes.filter(box=>String(box.journal_id)===journalId);
  const selectedBoxId=eligibleBoxes.length===1?String(eligibleBoxes[0].id):cashBoxId;
  const validBox=eligibleBoxes.length===0||eligibleBoxes.some(box=>String(box.id)===selectedBoxId);
  const v2Contract=eligibleBoxes.some(box=>box.journal_link_mode==='shared'||box.journal_link_mode==='dedicated');
  const parsedOpening=Number(openingBalance);
  const positiveSourceUnavailable=v2Contract&&parsedOpening>0;
  const canSubmit =
    !!journalId &&
    !Number.isNaN(parsedOpening) &&
    parsedOpening >= 0 &&
    validBox && !positiveSourceUnavailable &&
    !submitting &&
    !blockedByExistingSession;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await openCashSession({
      journal_id: Number(journalId),
      ...(selectedBoxId?{cash_box_id:Number(selectedBoxId)}:{}),
      opening_balance: parsedOpening,
      note: note.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      if (res.error.code === 'cash_session_already_open') {
        const current = await fetchCurrentCashSession(journalId,selectedBoxId||undefined);
        const cashierName = cashSessionCashierName(current) ?? t('common.dash');
        const message = t('admin.finance.cashDesk.openBlockedExistingSession', { cashierName });
        setError(message);
        toast.error(message);
        onSuccess(0);
        return;
      }
      setError(res.error.code==='cash_box_required'?cashCopy.boxRequired:res.error.code==='opening_balance_source_required'||res.error.code==='opening_balance_source_invalid'?cashCopy.sourceUnavailable:resolveCashSessionErrorMessage(res.error,t));
      return;
    }
    toast.success(t('admin.finance.cashDesk.openSuccess'));
    onSuccess(res.data.id);
  }, [canSubmit,journalId,selectedBoxId,note,onSuccess,parsedOpening,t,toast,cashCopy.boxRequired,cashCopy.sourceUnavailable]);

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
                onChange={(e) => {setJournalId(e.target.value);setCashBoxId('');}}
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
            {eligibleBoxes.length>0?<label className="field"><span>{cashCopy.boxRequired}</span><select className="input" value={selectedBoxId} onChange={e=>setCashBoxId(e.target.value)} disabled={submitting||blockedByExistingSession}>{eligibleBoxes.length>1?<option value="">—</option>:null}{eligibleBoxes.map(box=><option key={box.id} value={box.id}>{box.name} · #{box.id}</option>)}</select></label>:null}
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
                {positiveSourceUnavailable?cashCopy.sourceUnavailable:t('admin.finance.cashDesk.fields.openingBalanceHint')}
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
