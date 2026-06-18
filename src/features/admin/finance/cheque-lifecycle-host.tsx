'use client';

import { ChequeRejectionDialog } from '@/features/admin/finance/cheque-rejection-dialog';
import { ChequeSettlementDialog } from '@/features/admin/finance/cheque-settlement-dialog';
import { ChequeTransitionDialog } from '@/features/admin/finance/cheque-transition-dialog';
import {
  notifyFinanceLifecycleRefresh,
  type ChequeLifecycleTransitionData,
} from '@/features/admin/finance/cheque-lifecycle-api';
import { buildChequeTransitionSummary } from '@/features/admin/finance/cheque-transition-summary';
import { endpoints } from '@/lib/api/endpoints';
import type { ChequeLifecycleAction } from '@/lib/utils/cheque';
import type { FinanceCheque } from '@/types/finance';

export function ChequeLifecycleDialogs({
  cheque,
  openAction,
  onClose,
  onComplete,
}: {
  cheque: FinanceCheque;
  openAction: ChequeLifecycleAction | null;
  onClose: () => void;
  onComplete: (data: ChequeLifecycleTransitionData) => void;
}) {
  const summary = buildChequeTransitionSummary(cheque);

  function handleSuccess(data: ChequeLifecycleTransitionData) {
    notifyFinanceLifecycleRefresh({
      studentId: data.cheque?.student_id ?? cheque.student_id ?? null,
      collectionId: data.collection?.id ?? data.cheque?.collection_id ?? cheque.collection_id ?? null,
      chequeId: data.cheque?.id ?? cheque.id,
      updatedOverview: data.updated_overview ?? null,
    });
    onComplete(data);
  }

  if (!openAction) return null;

  if (openAction === 'settle') {
    return (
      <ChequeSettlementDialog
        chequeId={cheque.id}
        open
        summary={summary}
        onClose={onClose}
        onSuccess={handleSuccess}
      />
    );
  }

  if (openAction === 'reject') {
    return (
      <ChequeRejectionDialog
        chequeId={cheque.id}
        open
        summary={summary}
        onClose={onClose}
        onSuccess={handleSuccess}
      />
    );
  }

  if (openAction === 'deposit' || openAction === 'cancel') {
    const path =
      openAction === 'deposit'
        ? endpoints.admin.financeChequeDeposit(cheque.id)
        : endpoints.admin.financeChequeCancel(cheque.id);
    return (
      <ChequeTransitionDialog
        action={openAction}
        path={path}
        open
        summary={openAction === 'deposit' ? summary : null}
        onClose={onClose}
        onSuccess={() => handleSuccess({})}
      />
    );
  }

  return null;
}
