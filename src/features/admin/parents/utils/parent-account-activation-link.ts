import type { ParentAccountActivationLinkStatus } from '@/types/parent';

export const PARENT_ACCOUNT_ACTIVATION_LINK_PATH =
  '/admin/integrations/raqeem/messaging/account-activation-link';

export type ParentAccountActivationLinkPayload = {
  parent_id: number;
  idempotency_key: string;
};

export type ParentActivationLinkErrorKind =
  | 'forbidden'
  | 'blocked'
  | 'conflict'
  | 'unavailable'
  | 'network'
  | 'generic';

export type ParentActivationLinkBlockingCopyKey =
  | 'blockedNoActiveRelationship'
  | 'blockedNotEligible'
  | 'blockedCommunicationNotAllowed'
  | 'blockedNoUserAccount'
  | 'blockedInactiveUserAccount'
  | 'blockedIdentityUnavailable'
  | 'blockedWhatsAppUnavailable'
  | 'blockedGeneric';

export function canSendParentActivationLink(
  status: ParentAccountActivationLinkStatus | null | undefined,
): boolean {
  return status?.can_send_activation_link === true;
}

export function parentActivationLinkRequiresConfirmation(
  status: ParentAccountActivationLinkStatus | null | undefined,
): boolean {
  return canSendParentActivationLink(status) && status?.has_logged_in === true;
}

export function parentActivationLinkIsResend(
  status: ParentAccountActivationLinkStatus | null | undefined,
): boolean {
  return status?.sent_before === true || status?.has_logged_in === true;
}

export function parentActivationLinkBlockingCopyKey(
  reason: string | null | undefined,
): ParentActivationLinkBlockingCopyKey {
  switch (reason) {
    case 'no_active_relationship':
      return 'blockedNoActiveRelationship';
    case 'account_not_allowed':
    case 'account_blocked':
    case 'not_legal_guardian':
    case 'legal_status_unknown':
      return 'blockedNotEligible';
    case 'communication_not_allowed':
      return 'blockedCommunicationNotAllowed';
    case 'no_user_account':
      return 'blockedNoUserAccount';
    case 'inactive_user_account':
      return 'blockedInactiveUserAccount';
    case 'identity_unavailable':
      return 'blockedIdentityUnavailable';
    case 'integration_disabled':
    case 'entitlement_disabled':
    case 'activation_unavailable':
      return 'blockedWhatsAppUnavailable';
    default:
      return 'blockedGeneric';
  }
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

export function parentActivationLinkErrorKind(error: {
  code?: string | null;
  details?: Record<string, unknown> | null;
} | null | undefined): ParentActivationLinkErrorKind {
  const code = error?.code ?? '';
  const status = Number(error?.details?.status);

  if (code === 'forbidden' || status === 403) return 'forbidden';
  if (code === 'activation_failed' || code === 'validation_error' || status === 422) return 'blocked';
  if (code === 'idempotency_conflict' || code === 'conflict' || status === 409) return 'conflict';
  if (
    code === 'activation_unavailable' ||
    code === 'messaging_rejected' ||
    code === 'server_error' ||
    status === 503
  ) {
    return 'unavailable';
  }
  if (code === 'network_error') return 'network';
  return 'generic';
}

export function formatParentActivationDateTime(
  value: string | null | undefined,
  locale: string,
): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
      ? `${raw.replace(' ', 'T')}Z`
      : raw;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
