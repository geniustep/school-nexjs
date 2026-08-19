import type { CurrentUser } from '@/types/user';

export const ACCOUNT_CREATED_MESSAGING_PATH =
  '/admin/integrations/raqeem/messaging/account-created';

export type AccountCreatedTemplateMetadata = {
  tenantCode: string;
  schoolNameFr: string;
  schoolNameAr: string;
};

export type AccountCreatedPayload = {
  recipient: string;
  parameters: {
    tenant_code: string;
    school_name_fr: string;
    school_name_ar: string;
  };
  idempotency_key: string;
};

export function isWhatsAppMessagingEnabled(user: CurrentUser | null | undefined): boolean {
  return user?.services?.messaging?.whatsapp?.enabled === true;
}

export function resolveTenantCodeForAccountCreated(
  hostname: string,
  fallbackSchoolCode?: string | null,
): string | null {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  const match = host.match(/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.raqeem\.ma$/);
  if (match && match[1] !== 'www') return match[1];

  const fallback = fallbackSchoolCode?.trim().toLowerCase() ?? '';
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(fallback)) return fallback;
  return null;
}

export function resolveAccountCreatedTemplateMetadata(input: {
  tenantCode: string | null;
  schoolName: string | null | undefined;
  schoolNameFr?: string | null;
  schoolNameAr?: string | null;
}): AccountCreatedTemplateMetadata | null {
  const tenantCode = input.tenantCode?.trim() ?? '';
  const canonicalName = input.schoolName?.trim() ?? '';
  if (!tenantCode || !canonicalName) return null;

  // Do not synthesize translations. Until Odoo exposes localized names, the
  // canonical school name is reused verbatim for the corresponding template slot.
  const schoolNameFr = input.schoolNameFr?.trim() || canonicalName;
  const schoolNameAr = input.schoolNameAr?.trim() || canonicalName;

  return { tenantCode, schoolNameFr, schoolNameAr };
}

export function ensureAccountCreatedAttemptKey(
  current: string | null,
  makeKey: () => string = () => globalThis.crypto.randomUUID(),
): string {
  return current || makeKey();
}

export function buildAccountCreatedPayload(input: {
  recipient: string;
  metadata: AccountCreatedTemplateMetadata;
  idempotencyKey: string;
}): AccountCreatedPayload {
  const recipient = input.recipient.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  if (!recipient || !idempotencyKey) {
    throw new Error('recipient_and_idempotency_key_required');
  }

  return {
    recipient,
    parameters: {
      tenant_code: input.metadata.tenantCode.trim(),
      school_name_fr: input.metadata.schoolNameFr.trim(),
      school_name_ar: input.metadata.schoolNameAr.trim(),
    },
    idempotency_key: idempotencyKey,
  };
}
