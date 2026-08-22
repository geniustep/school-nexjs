import type { CurrentUser } from '@/types/user';

export const ACCOUNT_ACTIVATION_MESSAGING_PATH =
  '/admin/integrations/raqeem/messaging/account-activation';

export type AccountActivationPayload = {
  staff_id: number;
  idempotency_key: string;
};

export function isWhatsAppMessagingEnabled(user: CurrentUser | null | undefined): boolean {
  return user?.services?.messaging?.whatsapp?.enabled === true;
}

export function ensureAccountActivationAttemptKey(
  current: string | null,
  makeKey: () => string = () => globalThis.crypto.randomUUID(),
): string {
  return current || makeKey();
}

export function buildAccountActivationPayload(input: {
  staffId: number;
  idempotencyKey: string;
}): AccountActivationPayload {
  const staffId = Number(input.staffId);
  const idempotencyKey = input.idempotencyKey.trim();
  if (!Number.isSafeInteger(staffId) || staffId <= 0) {
    throw new Error('staff_id_required');
  }
  if (!idempotencyKey) {
    throw new Error('idempotency_key_required');
  }

  return { staff_id: staffId, idempotency_key: idempotencyKey };
}
