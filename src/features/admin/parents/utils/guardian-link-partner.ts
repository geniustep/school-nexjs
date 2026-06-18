import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { GuardianLinkPartnerPayload } from '@/types/guardian-link';
import { normalizeGuardianLinkPartnerResponse } from './normalize-guardian-link-partner';

export async function linkPartnerAsGuardian(payload: GuardianLinkPartnerPayload) {
  return api.post(endpoints.admin.guardiansLinkPartner, payload);
}

export { normalizeGuardianLinkPartnerResponse };
