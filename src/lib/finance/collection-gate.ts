import type { CollectionGate } from '@/types/payment-collection-preview';
import type { CollectibleItemsSummary } from '@/types/student-financial-overview';
import { collectionErrorMessageKey } from '@/lib/utils/collection-errors';

export function resolveCollectionGateBlocked(
  gate: CollectionGate | null | undefined,
  summary: CollectibleItemsSummary | null | undefined,
): { blocked: boolean; reasonKey: string | null; backendMessage: string | null } {
  const backendMessage = gate?.collect_block_message?.trim() || null;
  const reason = gate?.collect_block_reason?.trim() || null;

  if (gate && gate.collect_allowed === false) {
    const reasonKey = collectionErrorMessageKey(reason ?? 'agreement_not_active');
    return { blocked: true, reasonKey, backendMessage };
  }

  if ((summary?.remaining ?? 0) <= 0) {
    return {
      blocked: true,
      reasonKey: 'admin.finance.collectionWorkflow.errors.noOpenBalance',
      backendMessage,
    };
  }

  return { blocked: false, reasonKey: null, backendMessage: null };
}

export function resolvePrepaymentBadgeKey(
  gate: CollectionGate | null | undefined,
  agreementState?: string | null,
): 'yes' | 'unavailable' {
  if (gate?.prepayment_allowed === true) return 'yes';
  if (agreementState === 'active' && gate?.prepayment_allowed === false) return 'unavailable';
  if (gate?.collect_allowed === false || agreementState === 'draft') return 'unavailable';
  return gate?.prepayment_allowed ? 'yes' : 'unavailable';
}
