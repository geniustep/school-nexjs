import type { PaymentCollection } from '@/types/finance';
import { resolveLegacyCollectionPayerLabel } from './resolve-legacy-collection-display';

type PayerSource = Pick<
  PaymentCollection,
  'payer_name' | 'billing_partner'
> & {
  billing_partner_name?: string | null;
  financial_responsible_name?: string | null;
};

/** Official payer label with legacy fallback for historical records only. */
export function resolveCollectionPayerLabel(
  coll: PayerSource,
  fallback: string,
): string {
  const payer = coll.payer_name?.trim();
  if (payer) return payer;
  return resolveLegacyCollectionPayerLabel(coll, fallback);
}
