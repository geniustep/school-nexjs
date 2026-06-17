import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { CollectibleItemsResponse } from '@/types/student-financial-overview';

export interface ResolvedCollectionBilling {
  billingProfileId: number | null;
  billingPartnerId: number | null;
  billingPartnerName: string | null;
  billingPartyType: string | null;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Resolve official billing fields for collection payload (collectible-items → overview → UI). */
export function resolveCollectionBilling(input: {
  collectible?: CollectibleItemsResponse | null;
  overview?: StudentFinancialOverview | null;
  initialBillingProfileId?: number | string | null;
  initialBillingPartnerId?: number | string | null;
  selectedBillingPartnerId?: string;
}): ResolvedCollectionBilling {
  const profileFromCollectible = input.collectible?.billing_profile_id ?? null;
  const partnerFromCollectible = input.collectible?.billing_partner_id ?? null;
  const nameFromCollectible = input.collectible?.billing_partner_name ?? null;
  const typeFromCollectible = input.collectible?.billing_party_type ?? null;

  const overviewProfile = input.overview?.billing_profile;
  const profileId =
    profileFromCollectible ??
    toNumber(input.initialBillingProfileId) ??
    input.overview?.billing_profile_id ??
    overviewProfile?.id ??
    null;

  const partnerId =
    partnerFromCollectible ??
    toNumber(input.selectedBillingPartnerId) ??
    toNumber(input.initialBillingPartnerId) ??
    overviewProfile?.billing_partner_id ??
    null;

  const partnerName =
    nameFromCollectible ??
    (typeof overviewProfile?.billing_partner_name === 'string'
      ? overviewProfile.billing_partner_name
      : null);

  const partyType =
    typeFromCollectible ??
    overviewProfile?.billing_party_type ??
    null;

  return {
    billingProfileId: profileId,
    billingPartnerId: partnerId,
    billingPartnerName: partnerName,
    billingPartyType: partyType,
  };
}
