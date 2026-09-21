import type { ParentAccountActivationLinkStatus } from '@/types/parent';

export const PARENT_ACCOUNT_ACTIVATION_LINK_PATH =
  '/admin/integrations/raqeem/messaging/account-activation-link';

export type ParentAccountActivationLinkPayload = {
  parent_id: number;
  idempotency_key: string;
};

export function canSendParentActivationLink(
  status: ParentAccountActivationLinkStatus | null | undefined,
): boolean {
  return status?.can_send_activation_link === true;
}

export function buildParentActivationLinkPayload(input: {
  parentId: number;
  idempotencyKey: string;
}): ParentAccountActivationLinkPayload {
  const parentId = Number(input.parentId);
  const idempotencyKey = input.idempotencyKey.trim();
  if (!Number.isSafeInteger(parentId) || parentId <= 0) throw new Error('parent_id_required');
  if (!idempotencyKey) throw new Error('idempotency_key_required');
  return { parent_id: parentId, idempotency_key: idempotencyKey };
}

export function ensureParentActivationAttemptKey(
  current: string | null,
  makeKey: () => string = () => globalThis.crypto.randomUUID(),
): string {
  return current || makeKey();
}
