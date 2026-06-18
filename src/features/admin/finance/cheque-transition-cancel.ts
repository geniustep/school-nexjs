import type { ChequeTransitionAction } from '@/lib/utils/cheque';
import { chequeErrorMessageKey } from '@/lib/utils/cheque';

export type ChequeCancelBlockedReason = 'cancel_reason_required';

export function buildChequeTransitionRequestBody(
  action: ChequeTransitionAction,
  input: { depositedDate: string; cancelReason: string },
): { body: Record<string, unknown> } | { blocked: ChequeCancelBlockedReason } {
  if (action === 'deposit') {
    return { body: { deposited_date: input.depositedDate } };
  }
  if (action === 'cancel') {
    const reason = input.cancelReason.trim();
    if (!reason) return { blocked: 'cancel_reason_required' };
    return { body: { reason } };
  }
  return { blocked: 'cancel_reason_required' };
}

export function canSubmitChequeCancel(cancelReason: string, submitting: boolean): boolean {
  return !submitting && cancelReason.trim().length > 0;
}

export function resolveChequeTransitionErrorMessage(
  code: string | undefined,
  fallbackMessage: string,
  t: (key: string) => string,
  action?: 'cancel' | 'deposit',
): string {
  if (code === 'forbidden' && action === 'cancel') {
    const key = 'admin.finance.cheques.errors.chequeCancelForbidden';
    const translated = t(key);
    return translated !== key ? translated : fallbackMessage;
  }
  const key = chequeErrorMessageKey(code);
  if (!key) return fallbackMessage;
  const translated = t(key);
  return translated !== key ? translated : fallbackMessage;
}
