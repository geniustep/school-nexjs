'use client';

import { CashClosurePdfActions } from '@/features/admin/finance/cash-desk/cash-closure-pdf-actions';
import { useT } from '@/features/i18n/locale-context';
import {
  cashSessionAllowsAction,
  cashSessionIsActive,
  cashSessionIsClosed,
  cashSessionIsClosing,
} from '@/lib/utils/cash-session-normalize';
import type { CashSession } from '@/types/finance-cash-desk';

export function CashSessionActionsBar({
  session,
  readOnly,
  onAddMovement,
  onStartClosing,
  onReopen,
}: {
  session: CashSession;
  readOnly?: boolean;
  onAddMovement: () => void;
  onStartClosing: () => void;
  onReopen: () => void;
}) {
  const t = useT();
  const active = cashSessionIsActive(session.state);
  const closing = cashSessionIsClosing(session.state);
  const closed = cashSessionIsClosed(session.state);

  if (readOnly && closed) {
    return (
      <div className="cash-desk-actions-bar">
        <CashClosurePdfActions session={session} />
      </div>
    );
  }

  if (readOnly) return null;

  if (active) {
    const canAdd = cashSessionAllowsAction(session, 'add_movement');
    const canClose = cashSessionAllowsAction(session, 'start_closing');
    if (!canAdd && !canClose) return null;
    return (
      <div className="cash-desk-actions-bar">
        {canClose ? (
          <button type="button" className="btn btn--primary" onClick={onStartClosing}>
            {t('admin.finance.cashDesk.startClosingAction')}
          </button>
        ) : null}
        {canAdd ? (
          <button type="button" className="btn btn--ghost" onClick={onAddMovement}>
            {t('admin.finance.cashDesk.addMovementAction')}
          </button>
        ) : null}
      </div>
    );
  }

  if (closing) {
    return (
      <div className="cash-desk-actions-bar">
        <span className="muted">{t('admin.finance.cashDesk.closingInProgressHint')}</span>
      </div>
    );
  }

  if (closed) {
    const canReopen = cashSessionAllowsAction(session, 'reopen');
    const canPrint = cashSessionAllowsAction(session, 'print_closure');
    if (!canReopen && !canPrint) return null;
    return (
      <div className="cash-desk-actions-bar">
        {canPrint ? <CashClosurePdfActions session={session} /> : null}
        {canReopen ? (
          <button type="button" className="btn btn--danger btn--sm" onClick={onReopen}>
            {t('admin.finance.cashDesk.reopenAction')}
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
