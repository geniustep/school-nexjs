'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { EmptyState } from '@/components/states/states';
import { InfoBanner, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { AddCashMovementDialog } from '@/features/admin/finance/cash-desk/add-movement-dialog';
import { CashClosurePdfActions } from '@/features/admin/finance/cash-desk/cash-closure-pdf-actions';
import { ReopenCashSessionDialog } from '@/features/admin/finance/cash-desk/reopen-session-dialog';
import {
  cashMovementTypeLabelKey,
  CashSessionStatusBadge,
} from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { closeCashSession, startCashSessionClosing } from '@/lib/api/finance-cash-desk';
import { cashSessionErrorMessageKey } from '@/lib/utils/cash-session-errors';
import {
  cashSessionAllowsAction,
  cashSessionDisplayNumber,
  cashSessionIsActive,
  cashSessionIsClosed,
  cashSessionIsClosing,
  cashSessionJournalLabel,
  previewCashDifference,
} from '@/lib/utils/cash-session-normalize';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { refName } from '@/lib/utils/finance';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import type {
  CashSession,
  CashSessionCollectionRow,
  CashSessionMovement,
} from '@/types/finance-cash-desk';

function DifferenceStatus({
  difference,
}: {
  difference: number | null | undefined;
}) {
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

export function CashSessionKpiGrid({ session }: { session: CashSession }) {
  const t = useT();
  const summary = session.summary;
  const currency = session.currency ?? session.currency_code;
  const items = [
    { label: t('admin.finance.cashDesk.kpiOpening'), value: summary?.opening_balance ?? session.opening_balance },
    {
      label: t('admin.finance.cashDesk.kpiCollections'),
      value: summary?.cash_collections_total,
    },
    { label: t('admin.finance.cashDesk.kpiMovementsIn'), value: summary?.movements_in_total ?? summary?.total_cash_in },
    { label: t('admin.finance.cashDesk.kpiMovementsOut'), value: summary?.movements_out_total ?? summary?.total_cash_out },
    { label: t('admin.finance.cashDesk.kpiExpected'), value: summary?.expected_balance ?? session.expected_balance },
    { label: t('admin.finance.cashDesk.kpiCollectionsCount'), value: summary?.collections_count, count: true },
    { label: t('admin.finance.cashDesk.kpiReceiptsCount'), value: summary?.receipts_count, count: true },
  ];

  return (
    <div className="finance-metrics-grid cash-desk-kpi-grid">
      {items.map((item) => (
        <div key={item.label} className="card finance-metric-card">
          <span className="muted">{item.label}</span>
          <strong>
            {item.count ? (
              item.value ?? 0
            ) : (
              <FinanceMoney amount={item.value ?? null} currency={currency} />
            )}
          </strong>
        </div>
      ))}
    </div>
  );
}

function CashSessionInfo({ session }: { session: CashSession }) {
  const t = useT();
  const { formatDateTime } = useFormat();
  return (
    <dl className="detail-list compact">
      <div>
        <dt>{t('admin.finance.cashDesk.fields.sessionNumber')}</dt>
        <dd>{cashSessionDisplayNumber(session)}</dd>
      </div>
      <div>
        <dt>{t('admin.finance.cashDesk.fields.journal')}</dt>
        <dd>{cashSessionJournalLabel(session) ?? '—'}</dd>
      </div>
      <div>
        <dt>{t('admin.finance.cashDesk.fields.cashier')}</dt>
        <dd>{session.cashier_name ?? refName(session.cashier) ?? '—'}</dd>
      </div>
      <div>
        <dt>{t('admin.finance.cashDesk.fields.openedAt')}</dt>
        <dd>{session.opened_at ? formatDateTime(session.opened_at) : '—'}</dd>
      </div>
      <div>
        <dt>{t('admin.finance.cashDesk.fields.state')}</dt>
        <dd>
          <CashSessionStatusBadge state={session.state} />
        </dd>
      </div>
      <div>
        <dt>{t('admin.finance.cashDesk.fields.school')}</dt>
        <dd>{refName(session.school) ?? '—'}</dd>
      </div>
      <div>
        <dt>{t('admin.finance.cashDesk.fields.currency')}</dt>
        <dd>{typeof session.currency === 'string' ? session.currency : session.currency?.name ?? '—'}</dd>
      </div>
      {session.reopen_count != null && session.reopen_count > 0 ? (
        <div>
          <dt>{t('admin.finance.cashDesk.fields.reopenCount')}</dt>
          <dd>{session.reopen_count}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function CashSessionCollectionsTable({
  session,
  returnTo,
}: {
  session: CashSession;
  returnTo?: string;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const rows = session.collections ?? [];

  const columns: Column<CashSessionCollectionRow>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.cashDesk.collections.number'),
        render: (row) => row.number ?? row.reference ?? `#${row.id}`,
      },
      {
        key: 'receipt',
        header: t('admin.finance.cashDesk.collections.receipt'),
        render: (row) =>
          row.receipt_id ? (
            <Link href={appendReturnTo(`/admin/finance/receipts/${row.receipt_id}`, returnTo)}>
              {row.receipt_number ?? `#${row.receipt_id}`}
            </Link>
          ) : (
            row.receipt_number ?? '—'
          ),
      },
      {
        key: 'date',
        header: t('admin.finance.cashDesk.collections.date'),
        render: (row) => formatDate(row.date ?? row.collection_date ?? ''),
      },
      {
        key: 'payer',
        header: t('admin.finance.cashDesk.collections.payer'),
        render: (row) => row.student_name ?? row.payer_name ?? refName(row.payer) ?? '—',
      },
      {
        key: 'amount',
        header: t('admin.finance.cashDesk.collections.amount'),
        render: (row) => <FinanceMoney amount={row.amount ?? null} currency={session.currency} />,
      },
      {
        key: 'method',
        header: t('admin.finance.cashDesk.collections.method'),
        render: (row) => paymentMethodLabel(row.payment_method, t),
      },
      {
        key: 'state',
        header: t('admin.finance.cashDesk.collections.state'),
        render: (row) => row.state ?? row.status ?? '—',
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <Link
            className="btn btn--ghost btn--sm"
            href={appendReturnTo(`/admin/finance/collections/${row.id}`, returnTo)}
          >
            {t('admin.finance.cashDesk.collections.open')}
          </Link>
        ),
      },
    ],
    [formatDate, returnTo, session.currency, t],
  );

  if (!rows.length) {
    return <EmptyState title={t('admin.finance.cashDesk.collectionsEmpty')} />;
  }

  return <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />;
}

function CashSessionMovementsTable({ session }: { session: CashSession }) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const rows = session.movements ?? [];

  const columns: Column<CashSessionMovement>[] = useMemo(
    () => [
      {
        key: 'type',
        header: t('admin.finance.cashDesk.movements.type'),
        render: (row) => t(cashMovementTypeLabelKey(row.type)),
      },
      {
        key: 'amount',
        header: t('admin.finance.cashDesk.movements.amount'),
        render: (row) => <FinanceMoney amount={row.amount ?? null} currency={session.currency} />,
      },
      {
        key: 'reason',
        header: t('admin.finance.cashDesk.movements.reason'),
        render: (row) => row.reason ?? '—',
      },
      {
        key: 'reference',
        header: t('admin.finance.cashDesk.movements.reference'),
        render: (row) => row.reference ?? '—',
      },
      {
        key: 'at',
        header: t('admin.finance.cashDesk.movements.date'),
        render: (row) => (row.created_at ? formatDateTime(row.created_at) : '—'),
      },
    ],
    [formatDateTime, session.currency, t],
  );

  if (!rows.length) {
    return <EmptyState title={t('admin.finance.cashDesk.movementsEmpty')} />;
  }

  return <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />;
}

function CashSessionTimeline({ session }: { session: CashSession }) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const events = session.timeline?.length ? session.timeline : session.audit_events ?? [];
  if (!events.length) return null;

  return (
    <section className="cash-desk-timeline">
      <SectionHead title={t('admin.finance.cashDesk.timelineTitle')} />
      <ol className="cash-desk-timeline__list">
        {events.map((event) => (
          <li key={String(event.id)}>
            <strong>{event.label ?? event.action ?? '—'}</strong>
            <span className="muted">
              {event.at || event.date ? formatDateTime(event.at ?? event.date ?? '') : null}
            </span>
            {event.reason ? <p>{event.reason}</p> : null}
            {event.note ? <p>{event.note}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ClosingPanel({
  session,
  onReload,
}: {
  session: CashSession;
  onReload: () => void;
}) {
  const t = useT();
  const toast = useToast();
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
      const key = cashSessionErrorMessageKey(res.error.code);
      setError(key ? t(key) : res.error.message);
      if (res.error.code === 'cash_difference_approval_required') {
        toast.error(t('admin.finance.cashDesk.errors.differenceApprovalRequired'));
      }
      return;
    }
    toast.success(t('admin.finance.cashDesk.closeSuccess'));
    onReload();
  }, [
    closingNote,
    differenceReason,
    needsReason,
    onReload,
    parsedCounted,
    session.id,
    t,
    toast,
  ]);

  return (
    <section className="card card--pad cash-desk-closing">
      <SectionHead title={t('admin.finance.cashDesk.closingTitle')} />
      <dl className="detail-list compact">
        <div>
          <dt>{t('admin.finance.cashDesk.kpiOpening')}</dt>
          <dd>
            <FinanceMoney
              amount={session.summary?.opening_balance ?? session.opening_balance ?? null}
              currency={session.currency}
            />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.kpiMovementsIn')}</dt>
          <dd>
            <FinanceMoney
              amount={session.summary?.movements_in_total ?? session.summary?.total_cash_in ?? null}
              currency={session.currency}
            />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.kpiMovementsOut')}</dt>
          <dd>
            <FinanceMoney
              amount={session.summary?.movements_out_total ?? session.summary?.total_cash_out ?? null}
              currency={session.currency}
            />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.kpiExpected')}</dt>
          <dd>
            <FinanceMoney amount={expected} currency={session.currency} />
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
          <FinanceMoney amount={previewDiff} currency={session.currency} />
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
          <InfoBanner
            tone="amber"
            title={t('admin.finance.cashDesk.errors.differenceApprovalRequired')}
          />
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
            <FinanceMoney amount={session.expected_balance ?? null} currency={session.currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.fields.countedBalance')}</dt>
          <dd>
            <FinanceMoney amount={session.counted_balance ?? null} currency={session.currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.cashDesk.fields.difference')}</dt>
          <dd>
            <FinanceMoney amount={session.difference ?? null} currency={session.currency} />
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
      <CashClosurePdfActions session={session} />
    </section>
  );
}

export function CashSessionDetailView({
  session,
  onReload,
  returnTo,
  readOnly = false,
}: {
  session: CashSession;
  onReload: () => void;
  returnTo?: string;
  readOnly?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const [movementOpen, setMovementOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [confirmClosingOpen, setConfirmClosingOpen] = useState(false);
  const [startingClosing, setStartingClosing] = useState(false);

  const active = cashSessionIsActive(session.state);
  const closing = cashSessionIsClosing(session.state);
  const closed = cashSessionIsClosed(session.state);

  const handleStartClosing = useCallback(async () => {
    setStartingClosing(true);
    const res = await startCashSessionClosing(session.id);
    setStartingClosing(false);
    setConfirmClosingOpen(false);
    if (!res.success) {
      const key = cashSessionErrorMessageKey(res.error.code);
      toast.error(key ? t(key) : res.error.message);
      return;
    }
    toast.success(t('admin.finance.cashDesk.startClosingSuccess'));
    onReload();
  }, [onReload, session.id, t, toast]);

  return (
    <div className="cash-desk-detail">
      <CashSessionInfo session={session} />
      <CashSessionKpiGrid session={session} />

      {active && !readOnly ? (
        <div className="row cash-desk-actions">
          {cashSessionAllowsAction(session, 'add_movement') ? (
            <button type="button" className="btn btn--ghost" onClick={() => setMovementOpen(true)}>
              {t('admin.finance.cashDesk.addMovementAction')}
            </button>
          ) : null}
          {cashSessionAllowsAction(session, 'start_closing') ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setConfirmClosingOpen(true)}
            >
              {t('admin.finance.cashDesk.startClosingAction')}
            </button>
          ) : null}
        </div>
      ) : null}

      {closing && !readOnly ? <ClosingPanel session={session} onReload={onReload} /> : null}
      {closed ? <ClosedSummary session={session} /> : null}

      {closed && !readOnly && cashSessionAllowsAction(session, 'reopen') ? (
        <button type="button" className="btn btn--danger btn--sm" onClick={() => setReopenOpen(true)}>
          {t('admin.finance.cashDesk.reopenAction')}
        </button>
      ) : null}

      <section>
        <SectionHead title={t('admin.finance.cashDesk.collectionsTitle')} />
        <CashSessionCollectionsTable session={session} returnTo={returnTo} />
      </section>

      <section>
        <SectionHead title={t('admin.finance.cashDesk.movementsTitle')} />
        <CashSessionMovementsTable session={session} />
      </section>

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
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t('admin.finance.cashDesk.startClosingConfirmTitle')}</h2>
            <ul className="cash-desk-confirm-list">
              <li>{t('admin.finance.cashDesk.startClosingConfirm1')}</li>
              <li>{t('admin.finance.cashDesk.startClosingConfirm2')}</li>
              <li>{t('admin.finance.cashDesk.startClosingConfirm3')}</li>
            </ul>
            <div className="row form-actions">
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
                {startingClosing
                  ? t('common.saving')
                  : t('admin.finance.cashDesk.startClosingAction')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
