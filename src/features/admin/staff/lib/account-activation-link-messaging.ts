import type { CurrentUser } from '@/types/user';
import type { StaffMember } from '@/types/academic-setup';

export const ACCOUNT_ACTIVATION_LINK_MESSAGING_PATH =
  '/admin/integrations/raqeem/messaging/account-activation-link';

export type AccountActivationLinkPayload = {
  staff_id: number;
  idempotency_key: string;
};

export type AccountActivationLinkBlocker =
  | 'whatsapp_unavailable'
  | 'staff_inactive'
  | 'phone_missing'
  | 'name_ar_missing'
  | 'name_fr_missing'
  | 'language_missing';

export function isWhatsAppMessagingEnabled(user: CurrentUser | null | undefined): boolean {
  return user?.services?.messaging?.whatsapp?.enabled === true;
}

export function activationLinkBlockers(
  member: Pick<StaffMember, 'active' | 'mobile' | 'phone' | 'name_ar' | 'name_fr' | 'account_activation_language'>,
  whatsappEnabled: boolean,
): AccountActivationLinkBlocker[] {
  const blockers: AccountActivationLinkBlocker[] = [];
  if (!whatsappEnabled) blockers.push('whatsapp_unavailable');
  if (!member.active) blockers.push('staff_inactive');
  if (!(member.mobile ?? member.phone ?? '').trim()) blockers.push('phone_missing');
  if (!member.name_ar?.trim()) blockers.push('name_ar_missing');
  if (!member.name_fr?.trim()) blockers.push('name_fr_missing');
  if (member.account_activation_language !== 'ar' && member.account_activation_language !== 'fr') {
    blockers.push('language_missing');
  }
  return blockers;
}

export function ensureAccountActivationAttemptKey(
  current: string | null,
  makeKey: () => string = () => globalThis.crypto.randomUUID(),
): string {
  return current || makeKey();
}

export function buildAccountActivationLinkPayload(input: {
  staffId: number;
  idempotencyKey: string;
}): AccountActivationLinkPayload {
  const staffId = Number(input.staffId);
  const idempotencyKey = input.idempotencyKey.trim();
  if (!Number.isSafeInteger(staffId) || staffId <= 0) throw new Error('staff_id_required');
  if (!idempotencyKey) throw new Error('idempotency_key_required');
  return { staff_id: staffId, idempotency_key: idempotencyKey };
}
