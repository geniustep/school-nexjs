/** Explicit person-only payload for POST /admin/parents/{id}/update — no relationship fields. */

import type { IdentityDocumentWriteFields } from '@/types/identity-document';
import type { Parent } from '@/types/parent';
import {
  buildIdentityDocumentUpdatePayload,
  emptyIdentityDocumentFormValues,
  identityDocumentFromEntity,
  type IdentityDocumentFormValues,
} from './identity-document';

export interface ParentPersonFormValues {
  name: string;
  name_ar: string;
  name_fr: string;
  phone: string;
  mobile: string;
  email: string;
  street: string;
  street2: string;
  city: string;
  zip: string;
  preferred_language: string;
  notification_opt_in: boolean;
  identityDocument: IdentityDocumentFormValues;
}

export interface ParentUpdatePayload extends IdentityDocumentWriteFields {
  name?: string;
  name_ar?: string;
  name_fr?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  street?: string;
  street2?: string;
  city?: string;
  zip?: string;
  preferred_language?: string;
  notification_opt_in?: boolean;
}

type ParentUpdateStringKey =
  | 'name'
  | 'name_ar'
  | 'name_fr'
  | 'phone'
  | 'mobile'
  | 'email'
  | 'street'
  | 'street2'
  | 'city'
  | 'zip'
  | 'preferred_language';

function setChangedString(
  payload: ParentUpdatePayload,
  key: ParentUpdateStringKey,
  nextValue: string,
  initialValue: string | undefined,
  hasInitial: boolean,
  includeWhenEmpty = false,
): void {
  const next = nextValue.trim();
  if (!hasInitial) {
    if (next || includeWhenEmpty) payload[key] = next;
    return;
  }

  const previous = (initialValue ?? '').trim();
  if (next !== previous) payload[key] = next;
}

export function buildParentUpdatePayload(
  values: ParentPersonFormValues,
  initial?: ParentPersonFormValues,
): ParentUpdatePayload {
  const payload: ParentUpdatePayload = {};
  const hasInitial = initial != null;

  setChangedString(payload, 'name', values.name, initial?.name, hasInitial, true);
  setChangedString(payload, 'name_ar', values.name_ar, initial?.name_ar, hasInitial);
  setChangedString(payload, 'name_fr', values.name_fr, initial?.name_fr, hasInitial);
  setChangedString(payload, 'phone', values.phone, initial?.phone, hasInitial);
  setChangedString(payload, 'mobile', values.mobile, initial?.mobile, hasInitial);
  setChangedString(payload, 'email', values.email, initial?.email, hasInitial);
  setChangedString(payload, 'street', values.street, initial?.street, hasInitial);
  setChangedString(payload, 'street2', values.street2, initial?.street2, hasInitial);
  setChangedString(payload, 'city', values.city, initial?.city, hasInitial);
  setChangedString(payload, 'zip', values.zip, initial?.zip, hasInitial);
  setChangedString(
    payload,
    'preferred_language',
    values.preferred_language,
    initial?.preferred_language,
    hasInitial,
  );

  if (!hasInitial || values.notification_opt_in !== initial.notification_opt_in) {
    payload.notification_opt_in = values.notification_opt_in;
  }

  const identityPayload = buildIdentityDocumentUpdatePayload(
    values.identityDocument,
    initial?.identityDocument ?? emptyIdentityDocumentFormValues(),
  );
  if (identityPayload) Object.assign(payload, identityPayload);

  return payload;
}

export function parentToFormValues(parent: Parent): ParentPersonFormValues {
  return {
    name: parent.name ?? '',
    name_ar: parent.name_ar ?? '',
    name_fr: parent.name_fr ?? '',
    phone: parent.phone ?? '',
    mobile: parent.mobile ?? '',
    email: parent.email ?? '',
    street: parent.street ?? (parent.city ? '' : parent.address ?? ''),
    street2: parent.street2 ?? '',
    city: parent.city ?? '',
    zip: parent.zip ?? '',
    preferred_language: parent.preferred_language ?? 'ar',
    notification_opt_in: parent.notification_opt_in ?? true,
    identityDocument: identityDocumentFromEntity(parent),
  };
}

export function formValuesEqual(a: ParentPersonFormValues, b: ParentPersonFormValues): boolean {
  return (
    a.name === b.name &&
    a.name_ar === b.name_ar &&
    a.name_fr === b.name_fr &&
    a.phone === b.phone &&
    a.mobile === b.mobile &&
    a.email === b.email &&
    a.street === b.street &&
    a.street2 === b.street2 &&
    a.city === b.city &&
    a.zip === b.zip &&
    a.preferred_language === b.preferred_language &&
    a.notification_opt_in === b.notification_opt_in &&
    a.identityDocument.type === b.identityDocument.type &&
    a.identityDocument.number === b.identityDocument.number &&
    a.identityDocument.country === b.identityDocument.country &&
    a.identityDocument.clear === b.identityDocument.clear
  );
}
