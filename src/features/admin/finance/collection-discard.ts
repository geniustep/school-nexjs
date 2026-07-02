import type { PaymentCollection } from '@/types/finance';

/** Odoo contract: show discard draft only when allowed_actions.discard_draft is explicitly true. */
export function collectionCanDiscardDraft(
  coll: Pick<PaymentCollection, 'allowed_actions'> | null | undefined,
): boolean {
  const raw = coll?.allowed_actions;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return raw.discard_draft === true;
}

export function collectionDiscardErrorMessageKey(
  code: string | undefined,
  status?: number,
): string {
  if (status === 403 || code === 'forbidden' || code === 'permission_denied') {
    return 'admin.finance.collections.detail.discardDraft.errors.forbidden';
  }
  if (status === 404 || code === 'not_found') {
    return 'admin.finance.collections.detail.discardDraft.errors.notFound';
  }
  if (
    status === 422 ||
    code === 'validation_error' ||
    code === 'cannot_discard' ||
    code === 'collection_not_discardable'
  ) {
    return 'admin.finance.collections.detail.discardDraft.errors.cannotDiscard';
  }
  return 'admin.finance.collections.detail.discardDraft.errors.generic';
}
