'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { sanitizeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';
import { useFormat } from '@/features/i18n/use-format';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  canCancelCheques,
  canClearCheques,
  canDepositCheques,
  canRejectCheques,
} from '@/lib/permissions/finance';
import { type ChequeLifecycleAction } from '@/lib/utils/cheque';
import { chequeAllowsAction, resolveChequeLifecycleActions } from '@/features/admin/finance/cheque-allowed-actions';
import { ChequeDualBadges } from '@/features/admin/student-finance/components/cheque-dual-badges';
import { ChequeTimeline } from './cheque-timeline';
import { ChequeLifecycleDialogs } from './cheque-lifecycle-host';
import { FinanceMoney } from './finance-money';
import type { FinanceCheque } from '@/types/finance';

export function ChequeDetailDrawer({
  open,
  chequeId,
  onClose,
  onChanged,
}: {
  open: boolean;
  chequeId: number | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const t = useT();
  const user = useSession();
  const { formatDate } = useFormat();
  const state = useAdminResource<FinanceCheque>(chequeId ? endpoints.admin.financeCheque(chequeId) : null);
  const [dialogAction, setDialogAction] = useState<ChequeLifecycleAction | null>(null);

  if (!open || !chequeId) return null;

  const cheque = state.data;

  function canRun(action: ChequeLifecycleAction): boolean {
    if (!cheque || !chequeAllowsAction(cheque, action)) return false;
    switch (action) {
      case 'deposit':
        return canDepositCheques(user);
      case 'settle':
        return canClearCheques(user);
      case 'reject':
        return canRejectCheques(user);
      case 'cancel':
        return canCancelCheques(user);
      default:
        return false;
    }
  }

  const lifecycle = (cheque?.state ?? 'received') as string;
  const transitions = cheque ? resolveChequeLifecycleActions(cheque).filter(canRun) : [];

  return (
    <>
      <SetupDrawer open={open} title={t('admin.finance.collectionWorkflow.chequeDetailTitle')} onClose={onClose}>
        {state.loading && !cheque ? <LoadingState label={t('common.loading')} /> : null}
        {state.error ? (
          <p className="form-error">
            {sanitizeUserFacingErrorMessage(state.error.message, t('errors.loadFailedRetry'))}
          </p>
        ) : null}
        {cheque ? (
          <div className="form-stack finance-cheque-detail-drawer">
            <ChequeDualBadges lifecycleState={lifecycle} maturityStatus={undefined} />
            <dl className="detail-list">
              <div>
                <dt>{t('admin.finance.cheques.chequeNumber')}</dt>
                <dd className="mono">{cheque.cheque_number ?? t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.cheques.bankName')}</dt>
                <dd>{cheque.bank_name ?? t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.cheques.holderName')}</dt>
                <dd>{cheque.holder_name ?? t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.collectionAmount')}</dt>
                <dd>
                  <FinanceMoney amount={cheque.amount} currency={cheque.currency} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.cheques.receivedDate')}</dt>
                <dd>{formatDate(cheque.received_date)}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.cheques.dueDate')}</dt>
                <dd>{formatDate(cheque.due_date)}</dd>
              </div>
            </dl>

            <ChequeTimeline cheque={cheque} />

            {transitions.length ? (
              <div className="row finance-cheque-detail-drawer__actions">
                {transitions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className={
                      action === 'settle'
                        ? 'btn btn--primary btn--sm'
                        : action === 'reject'
                          ? 'btn btn--danger btn--sm'
                          : action === 'cancel'
                            ? 'btn btn--sm'
                            : 'btn btn--ghost btn--sm'
                    }
                    onClick={() => setDialogAction(action)}
                  >
                    {t(
                      action === 'settle'
                        ? 'admin.finance.cheques.lifecycle.settleCheque'
                        : action === 'reject'
                          ? 'admin.finance.cheques.lifecycle.rejectCheque'
                          : `admin.finance.cheques.actions.${action}.button`,
                    )}
                  </button>
                ))}
              </div>
            ) : null}

            {cheque.collection_id ? (
              <Link href={`/admin/finance/collections/${cheque.collection_id}`} className="btn btn--ghost btn--sm">
                {t('admin.finance.cheques.viewCollection')}
              </Link>
            ) : null}
            <Link href={`/admin/finance/cheques/${cheque.id}`} className="btn btn--ghost btn--sm">
              {t('admin.finance.collectionWorkflow.openFullChequePage')}
            </Link>
          </div>
        ) : null}
      </SetupDrawer>

      {dialogAction && cheque ? (
        <ChequeLifecycleDialogs
          cheque={cheque}
          openAction={dialogAction}
          onClose={() => setDialogAction(null)}
          onComplete={() => {
            state.reload();
            onChanged?.();
          }}
        />
      ) : null}
    </>
  );
}
