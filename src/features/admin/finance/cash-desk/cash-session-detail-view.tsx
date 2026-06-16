'use client';

import { useCallback, useState } from 'react';
import { InfoBanner, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { AddCashMovementDialog } from '@/features/admin/finance/cash-desk/add-movement-dialog';
import { CashSessionActionsBar } from '@/features/admin/finance/cash-desk/cash-session-actions-bar';
import { CashSessionKpiGrid } from '@/features/admin/finance/cash-desk/cash-session-kpi-grid';
import { CashSessionOverviewHeader } from '@/features/admin/finance/cash-desk/cash-session-overview-header';
import {
  CashSessionCollectionsSection,
  CashSessionMovementsSection,
} from '@/features/admin/finance/cash-desk/cash-session-sections';
import { CashSessionTimeline } from '@/features/admin/finance/cash-desk/cash-session-timeline';
import { ReopenCashSessionDialog } from '@/features/admin/finance/cash-desk/reopen-session-dialog';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { closeCashSession, startCashSessionClosing } from '@/lib/api/finance-cash-desk';
import { cashSessionCurrency } from '@/lib/utils/cash-session-currency';
import { cashSessionErrorMessageKey } from '@/lib/utils/cash-session-errors';
import {
  cashSessionAllowsAction,
  cashSessionIsClosing,
  previewCashDifference,
} from '@/lib/utils/cash-session-normalize';
import { refName } from '@/lib/utils/finance';
import type { CashSession } from '@/types/finance-cash-desk';

function DifferenceStatus({ difference }: { difference: number | null | undefined }) {
  const t = useT();
  if (difference == null || difference === 0) {
    return <span className="cash-desk-diff cash-desk-diff--match">{t('admin.finance.cashDesk.differenceMatch')}</span>;
  }
  if (difference > 0) {
    return (
      <span className="cash-desk-diff cash-desk-diff--surplus">
        {t('admin.finance.cashDesk.differenceSurplus')}
      </span>
    );
  }
  return (
    <span className="cash-desk-diff cash-desk-diff--shortage">
      {t('admin.finance.cashDesk.differenceShortage')}
    </span>
  );
}

function ClosingPanel({ session, onReload }: { session: CashSession; onReload: () => void }) {
  const t = useT();
  const toast = useToast();
  const currency = cashSessionCurrency(session);
  const expected = session.summary?.expected_balance ?? session.expected_balance ?? null;
  const [countedBalance, setCountedBalance] = useState('');
  const [differenceReason, setDifferenceReason] = useState(session.difference_reason ?? '');
  const [closingNote, setClosingNote] = useState(session.closing_note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedCounted = countedBalance === '' ? null : Number(countedBalance);
  const previewDiff = previewCashDifference(parsedCounted, expected);
  const needsReason = previewDiff != null && previewDiff !== 0;
  const canClose = cashSessionAllowsAction(session, 'close');
  const needsApproval =
    needsReason && !cashSessionAllowsAction(session, 'approve_difference') && previewDiff !== 0;

  const handleClose = useCallback(async () => {
    if (parsedCounted == null || Number.isNaN(parsedCounted) || parsedCounted < 0) {
      setError(t('admin.finance.cashDesk.errors.countedRequired'));
      return;
    }
    if (needsReason && !differenceReason.trim()) {
      setError(t('admin.finance.cashDesk.errors.differenceReasonRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await closeCashSession(session.id, {
      counted_balance: parsedCounted,
      difference_reason: needsReason ? differenceReason.trim() : undefined,
      closing_note: closingNote.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      const key = cashSessionErrorMessageKey(res.error.code, res.error.message);
      setError(key ? t(key) : res.error.message);
      if (res.error.code === 'cash_difference_approval_required') {
        toast.error(t('admin.finance.cashDesk.errors.differenceApprovalRequired'));
      }
      return;
    }
    toast.success(t('admin.finance.cashDesk.closeSuccess'));
    onReload();
  }, [closingNote, differenceReason, needsReason, onReload, parsedCounted, session.id, t, toast]);

  return (
    <section className="card card--pad cash-desk-closing">
      <SectionHead title={t('admin.finance.cashDesk.closingTitle')} />
      <dl className="detail-list compact">
        <div>
          <dt>{t('admin.finance.cashDesk.kpiExpected')}</dt>
          <dd>
            <FinanceMoney amount={expected} currency={currency} />
          </dd>
        </div>
      </dl>
      <div className="form-stack cash-desk-closing__form">
        <label className="field">
          <span>{t('admin.finance.cashDesk.fields.countedBalance')}</span>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={countedBalance}
            onChange={(e) => setCountedBalance(e.target.value)}
            disabled={submitting}
          />
        </label>
        <div className="cash-desk-diff-row">
          <span>{t('admin.finance.cashDesk.fields.differencePreview')}</span>
          <FinanceMoney amount={previewDiff} currency={currency} />
          <DifferenceStatus difference={previewDiff} />
        </div>
        {needsReason ? (
          <label className="field">
            <span>{t('admin.finance.cashDesk.fields.differenceReason')}</span>
            <textarea
              className="input"
              rows={2}
              value={differenceReason}
              onChange={(e) => setDifferenceReason(e.target.value)}
              disabled={submitting}
            />
          </label>
        ) : null}
        <label className="field">
          <span>{t('admin.finance.cashDesk.fields.closingNoteOptional')}</span>
          <textarea
            className="input"
            rows={2}
            value={closingNote}
            onChange={(e) => setClosingNote(e.target.value)}
            disabled={submitting}
          />
        </label>
        {needsApproval ? (
          <InfoBanner tone="amber" title={t('admin.finance.cashDesk.errors.differenceApprovalRequired')} />
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {canClose && !needsApproval ? (
          <button
            type="button"
            className="btn btn--primary"
            disabled={submitting}
            aria-busy={submitting}
            onClick={() => void handleClose()}
          >
            {submitting ? t('common.saving') : t('admin.finance.cashDesk.closeAction')}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ClosedSummary({ session }: { session: CashSession }) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const currency = cashSessionCurrency(session);

  return (
    <section className="card card--pad cash-desk-closed-summary">
      <SectionHead title={t('admin.finance.cashDesk.closedTitle')} />
      <dl className="detail-list compact">
        <div>
          <dt>{t('admin.finance.cashDesk.fields.closedAt')}</dt>
          <dd>{session.closed_at ? formatDateTime(session.closed_at) : '—'}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.fields.closedBy')}</dt>
          <dd>{refName(session.closed_by) ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.kpiExpected')}</dt>
          <dd>
            <FinanceMoney amount={session.expected_balance ?? null} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.fields.countedBalance')}</dt>
          <dd>
            <FinanceMoney amount={session.counted_balance ?? null} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.fields.difference')}</dt>
          <dd>
            <FinanceMoney amount={session.difference ?? null} currency={currency} />
            <DifferenceStatus difference={session.difference} />
          </dd>
        </div>
        {session.difference_reason ? (
          <div>
            <dt>{t('admin.finance.cashDesk.fields.differenceReason')}</dt>
            <dd>{session.difference_reason}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

export function CashSessionDetailView({
  session,
  onReload,
  returnTo,
  readOnly = false,
  showOverview = true,
}: {
  session: CashSession;
  onReload: () => void;
  returnTo?: string;
  readOnly?: boolean;
  showOverview?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const [movementOpen, setMovementOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [confirmClosingOpen, setConfirmClosingOpen] = useState(false);
  const [startingClosing, setStartingClosing] = useState(false);

  const closing = cashSessionIsClosing(session.state);
  const closed = session.state === 'closed';

  const handleStartClosing = useCallback(async () => {
    setStartingClosing(true);
    const res = await startCashSessionClosing(session.id);
    setStartingClosing(false);
    setConfirmClosingOpen(false);
    if (!res.success) {
      const key = cashSessionErrorMessageKey(res.error.code, res.error.message);
      toast.error(key ? t(key) : res.error.message);
      return;
    }
    toast.success(t('admin.finance.cashDesk.startClosingSuccess'));
    onReload();
  }, [onReload, session.id, t, toast]);

  return (
    <div className="cash-desk-detail">
      {showOverview ? <CashSessionOverviewHeader session={session} /> : null}
      <CashSessionKpiGrid session={session} />

      <CashSessionActionsBar
        session={session}
        readOnly={readOnly}
        onAddMovement={() => setMovementOpen(true)}
        onStartClosing={() => setConfirmClosingOpen(true)}
        onReopen={() => setReopenOpen(true)}
      />

      {closing && !readOnly ? <ClosingPanel session={session} onReload={onReload} /> : null}
      {closed ? <ClosedSummary session={session} /> : null}

      <CashSessionCollectionsSection session={session} returnTo={returnTo} />
      <CashSessionMovementsSection session={session} />
      <CashSessionTimeline session={session} />

      <AddCashMovementDialog
        open={movementOpen}
        sessionId={session.id}
        onClose={() => setMovementOpen(false)}
        onSuccess={onReload}
      />
      <ReopenCashSessionDialog
        open={reopenOpen}
        sessionId={session.id}
        onClose={() => setReopenOpen(false)}
        onSuccess={onReload}
      />

      {confirmClosingOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirmClosingOpen(false)}>
          <div
            className="modal card cash-desk-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cash-desk-start-closing-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cash-desk-dialog__body">
              <h2 id="cash-desk-start-closing-title">{t('admin.finance.cashDesk.startClosingConfirmTitle')}</h2>
              <ul className="cash-desk-confirm-list">
                <li>{t('admin.finance.cashDesk.startClosingConfirm1')}</li>
                <li>{t('admin.finance.cashDesk.startClosingConfirm2')}</li>
                <li>{t('admin.finance.cashDesk.startClosingConfirm3')}</li>
              </ul>
            </div>
            <div className="cash-desk-dialog__footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirmClosingOpen(false)}
                disabled={startingClosing}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={startingClosing}
                aria-busy={startingClosing}
                onClick={() => void handleStartClosing()}
              >
                {startingClosing ? t('common.saving') : t('admin.finance.cashDesk.startClosingAction')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { CashSessionKpiGrid } from '@/features/admin/finance/cash-desk/cash-session-kpi-grid';
