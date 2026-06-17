import type { ChequeState, FinanceCheque, ParentChequeInfo, PaymentCollection } from '@/types/finance';

export function isChequePayment(method: string | undefined | null): boolean {
  const m = (method ?? '').toLowerCase();
  return m === 'cheque' || m === 'check';
}

import { normalizeChequeStatus } from '@/lib/utils/cheque-status';

export function normalizeChequeState(state: string | undefined | null): ChequeState | string {
  return normalizeChequeStatus(state);
}

export function chequeStateTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'cleared':
      return 'green';
    case 'deposited':
      return 'blue';
    case 'received':
      return 'amber';
    case 'rejected':
    case 'cancelled':
      return 'red';
    default:
      return 'slate';
  }
}

/** Admin badge key for student/fee/collection markers */
export function adminChequeMarkerKey(
  cheque: Pick<FinanceCheque, 'state' | 'reversal_applied'> | ParentChequeInfo | null | undefined,
): string | null {
  if (!cheque?.state) return null;
  const state = normalizeChequeState(cheque.state);
  if (cheque.reversal_applied && state === 'rejected') {
    return 'admin.finance.cheques.markerReversalRejected';
  }
  if (cheque.reversal_applied && state === 'cancelled') {
    return 'admin.finance.cheques.markerReversalCancelled';
  }
  switch (state) {
    case 'received':
      return 'admin.finance.cheques.markerPending';
    case 'deposited':
      return 'admin.finance.cheques.markerDeposited';
    case 'cleared':
      return 'admin.finance.cheques.markerCleared';
    case 'rejected':
      return 'admin.finance.cheques.markerReversalRejected';
    case 'cancelled':
      return 'admin.finance.cheques.markerReversalCancelled';
    default:
      return null;
  }
}

export function parentChequeMarkerKey(
  cheque: ParentChequeInfo | null | undefined,
): string | null {
  if (!cheque?.state) return null;
  const state = normalizeChequeState(cheque.state);
  if (state === 'rejected') return 'parent.finance.cheques.rejected';
  if (state === 'cancelled') return 'parent.finance.cheques.cancelled';
  switch (state) {
    case 'received':
      return 'parent.finance.cheques.pending';
    case 'deposited':
      return 'parent.finance.cheques.deposited';
    case 'cleared':
      return 'parent.finance.cheques.cleared';
    default:
      return null;
  }
}

export function isCollectionChequeReversed(coll: PaymentCollection): boolean {
  if (coll.reversal_applied === true) return true;
  const ch = coll.cheque;
  if (!ch) return false;
  const state = normalizeChequeState(ch.state);
  return state === 'rejected' || state === 'cancelled' || ch.reversal_applied === true;
}

export function collectionSuccessDisplay(coll: PaymentCollection): boolean {
  if (isCollectionChequeReversed(coll)) return false;
  const st = coll.state ?? coll.status;
  return st === 'confirmed';
}

export type ChequeLifecycleAction = 'deposit' | 'settle' | 'reject' | 'cancel';

/** @deprecated Use ChequeLifecycleAction */
export type ChequeTransitionAction = ChequeLifecycleAction;

export function availableChequeTransitions(state: string): ChequeLifecycleAction[] {
  switch (normalizeChequeState(state)) {
    case 'received':
      return ['deposit', 'reject', 'cancel'];
    case 'deposited':
      return ['settle', 'reject', 'cancel'];
    default:
      return [];
  }
}

export function chequeErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'invalid_cheque_data':
      return 'admin.finance.cheques.errors.invalidChequeData';
    case 'cheque_required':
      return 'admin.finance.cheques.errors.chequeRequired';
    case 'invalid_cheque_state':
    case 'cheque_invalid_state':
      return 'admin.finance.cheques.errors.invalidChequeState';
    case 'cheque_already_cleared':
    case 'cheque_already_settled':
      return 'admin.finance.cheques.errors.chequeAlreadySettled';
    case 'cheque_already_rejected':
      return 'admin.finance.cheques.errors.chequeAlreadyRejected';
    case 'cheque_reversal_already_applied':
    case 'reversal_already_applied':
      return 'admin.finance.cheques.errors.reversalAlreadyApplied';
    case 'cheque_school_mismatch':
      return 'admin.finance.cheques.errors.chequeSchoolMismatch';
    case 'cheque_amount_mismatch':
      return 'admin.finance.cheques.errors.chequeAmountMismatch';
    case 'cheque_not_found':
      return 'admin.finance.cheques.errors.chequeNotFound';
    case 'cheque_action_forbidden':
      return 'admin.finance.cheques.errors.chequeActionForbidden';
    case 'cheque_settlement_date_required':
      return 'admin.finance.cheques.errors.chequeSettlementDateRequired';
    case 'cheque_rejection_reason_required':
      return 'admin.finance.cheques.errors.chequeRejectionReasonRequired';
    case 'cheque_collection_not_confirmed':
      return 'admin.finance.cheques.errors.chequeCollectionNotConfirmed';
    case 'cheque_allocations_not_posted':
      return 'admin.finance.cheques.errors.chequeAllocationsNotPosted';
    case 'cheque_settlement_failed':
      return 'admin.finance.cheques.errors.chequeSettlementFailed';
    case 'cheque_rejection_failed':
      return 'admin.finance.cheques.errors.chequeRejectionFailed';
    default:
      return null;
  }
}
