import type { FinanceOperationKind } from '../types/agreement-context';

export type FinanceOperationTone = 'agreement' | 'payment' | 'billing' | 'danger' | 'neutral';

export function resolveFinanceOperationTone(kind: FinanceOperationKind): FinanceOperationTone {
  switch (kind) {
    case 'agreement_created':
    case 'agreement_submitted':
    case 'agreement_approved':
    case 'agreement_activated':
    case 'agreement_amended':
      return 'agreement';
    case 'agreement_cancelled':
    case 'agreement_reset':
    case 'collection_reversed':
      return 'danger';
    case 'payment_collected':
    case 'receipt_issued':
      return 'payment';
    case 'fees_generated':
    case 'installments_generated':
      return 'billing';
    default:
      return 'neutral';
  }
}

export function resolveFinanceOperationStateTone(state: string | null | undefined): FinanceOperationTone {
  if (!state) return 'neutral';
  const slug = state.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['done', 'posted', 'confirmed', 'paid', 'active', 'success', 'completed'].includes(slug)) {
    return 'payment';
  }
  if (['cancelled', 'canceled', 'reversed', 'failed', 'error'].includes(slug)) {
    return 'danger';
  }
  if (['draft', 'pending', 'waiting', 'processing'].includes(slug)) {
    return 'billing';
  }
  return 'neutral';
}
