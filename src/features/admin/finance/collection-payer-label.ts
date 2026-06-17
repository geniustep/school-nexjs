import { refName } from '@/lib/utils/finance';
import type { PaymentCollection } from '@/types/finance';

type PayerSource = Pick<
  PaymentCollection,
  'payer_name' | 'billing_partner'
> & {
  billing_partner_name?: string | null;
  financial_responsible_name?: string | null;
};

/** Payer column: payer_name → billing_partner_name → financial_responsible → partner ref. */
export function resolveCollectionPayerLabel(
  coll: PayerSource,
  fallback: string,
): string {
  const payer = coll.payer_name?.trim();
  if (payer) return payer;
  const billingName = coll.billing_partner_name?.trim();
  if (billingName) return billingName;
  const responsible = coll.financial_responsible_name?.trim();
  if (responsible) return responsible;
  const partner = refName(coll.billing_partner)?.trim();
  if (partner) return partner;
  return fallback;
}
