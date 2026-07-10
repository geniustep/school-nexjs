import type { IdentityDocumentWriteFields } from '@/types/identity-document';
import {
  buildIdentityDocumentCreatePayload,
  emptyIdentityDocumentFormValues,
  type IdentityDocumentFormValues,
} from '@/features/admin/parents/utils/identity-document';
import { moroccanPhoneSearchQuery } from './normalize-moroccan-phone';

export interface GuardianQuickCreateFormInput {
  firstName: string;
  lastName: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  identityDocument: IdentityDocumentFormValues;
}

export type GuardianQuickCreateRequestPayload = {
  name: string;
  phone: string;
  secondary_phone?: string;
  email?: string;
  address?: string;
} & IdentityDocumentWriteFields;

function buildFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

/**
 * Builds POST /admin/guardians/quick-create body.
 * Uses identity_document_* tuple only — never pairs conflicting national_id.
 */
export function buildGuardianQuickCreatePayload(
  values: GuardianQuickCreateFormInput,
): GuardianQuickCreateRequestPayload {
  const payload: GuardianQuickCreateRequestPayload = {
    name: buildFullName(values.firstName, values.lastName),
    phone: moroccanPhoneSearchQuery(values.phone),
  };

  const secondary = values.secondaryPhone?.trim();
  if (secondary) payload.secondary_phone = moroccanPhoneSearchQuery(secondary);

  const email = values.email?.trim().toLowerCase();
  if (email) payload.email = email;

  const address = [values.address?.trim() ?? '', values.city?.trim() ?? '']
    .filter(Boolean)
    .join(', ');
  if (address) payload.address = address;

  const identity = buildIdentityDocumentCreatePayload(
    values.identityDocument ?? emptyIdentityDocumentFormValues(),
  );
  if (identity) Object.assign(payload, identity);

  return payload;
}

/** True when a quick-create / family-batch-like payload contains identity document keys. */
export function payloadHasIdentityDocumentFields(
  payload: Record<string, unknown>,
): boolean {
  return (
    'identity_document_type' in payload ||
    'identity_document_number' in payload ||
    'identity_document_country' in payload ||
    'national_id' in payload ||
    'national_id_masked' in payload
  );
}
