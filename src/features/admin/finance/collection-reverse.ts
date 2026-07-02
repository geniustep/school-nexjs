import type { PaymentCollection } from '@/types/finance';

/** Odoo contract: show reverse only when allowed_actions.cancel is explicitly true. */
export function collectionCanReverse(
  coll: Pick<PaymentCollection, 'allowed_actions'> | null | undefined,
): boolean {
  const raw = coll?.allowed_actions;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return raw.cancel === true;
}

export function validateCollectionReverseReason(reason: string): boolean {
  return reason.trim().length > 0;
}

export function collectionReverseErrorMessageKey(
  code: string | undefined,
  status?: number,
): string {
  if (status === 403 || code === 'forbidden' || code === 'permission_denied') {
    return 'admin.finance.collections.detail.reverse.errors.forbidden';
  }
  if (status === 404 || code === 'not_found') {
    return 'admin.finance.collections.detail.reverse.errors.notFound';
  }
  if (
    status === 422 ||
    code === 'validation_error' ||
    code === 'cannot_cancel' ||
    code === 'cannot_reverse' ||
    code === 'collection_not_reversible'
  ) {
    return 'admin.finance.collections.detail.reverse.errors.cannotReverse';
  }
  return 'admin.finance.collections.detail.reverse.errors.generic';
}

export function collectionReceiptState(
  coll: Pick<PaymentCollection, 'receipt'> | null | undefined,
): string | null {
  const receipt = coll?.receipt;
  if (!receipt || typeof receipt !== 'object') return null;
  const state = receipt.state?.trim();
  return state || null;
}
