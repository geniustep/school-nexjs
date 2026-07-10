import {
  isIdentityDocumentType,
  type IdentityDocumentReadFields,
  type IdentityDocumentType,
  type IdentityDocumentWriteFields,
} from '@/types/identity-document';

export const DEFAULT_NATIONAL_ID_COUNTRY = 'MA';

export interface IdentityDocumentFormValues {
  type: IdentityDocumentType | '';
  number: string;
  country: string;
  /** Intentional clear on edit submit — not set by emptying the input while typing. */
  clear: boolean;
}

export type IdentityDocumentFieldErrors = Partial<
  Record<'type' | 'number' | 'country', string>
>;

export function emptyIdentityDocumentFormValues(): IdentityDocumentFormValues {
  return { type: '', number: '', country: '', clear: false };
}

export function identityDocumentFromEntity(
  entity: IdentityDocumentReadFields | null | undefined,
): IdentityDocumentFormValues {
  if (!entity) return emptyIdentityDocumentFormValues();

  const type = isIdentityDocumentType(entity.identity_document_type)
    ? entity.identity_document_type
    : entity.national_id
      ? 'national_id'
      : '';

  const number =
    (typeof entity.identity_document_number === 'string' && entity.identity_document_number.trim()) ||
    (typeof entity.national_id === 'string' && entity.national_id.trim()) ||
    '';

  let country =
    (typeof entity.identity_document_country === 'string' &&
      entity.identity_document_country.trim()) ||
    '';

  if (type === 'national_id' && !country) {
    country = DEFAULT_NATIONAL_ID_COUNTRY;
  }

  return { type, number, country, clear: false };
}

export function identityDocumentTypeLabelKey(type: IdentityDocumentType): string {
  return `admin.identityDocument.types.${type}`;
}

export function showsIdentityDocumentCountry(type: IdentityDocumentType | ''): boolean {
  return type === 'passport' || type === 'residence_card' || type === 'other';
}

export function isIdentityDocumentCountryRequired(type: IdentityDocumentType | ''): boolean {
  return type === 'passport' || type === 'residence_card';
}

export function resolveIdentityDocumentCountry(
  type: IdentityDocumentType | '',
  country: string,
): string | undefined {
  if (type === 'national_id') return DEFAULT_NATIONAL_ID_COUNTRY;
  const trimmed = country.trim().toUpperCase();
  return trimmed || undefined;
}

/**
 * Build create/update write fields from the form.
 * Uses the general identity_document_* tuple only — never pairs conflicting national_id.
 */
export function buildIdentityDocumentCreatePayload(
  values: IdentityDocumentFormValues,
): IdentityDocumentWriteFields | null {
  if (!values.type || !values.number.trim()) return null;

  const country = resolveIdentityDocumentCountry(values.type, values.country);
  const payload: IdentityDocumentWriteFields = {
    identity_document_type: values.type,
    identity_document_number: values.number.trim(),
  };
  if (country) payload.identity_document_country = country;
  return payload;
}

/**
 * Edit payload semantics:
 * - intentional clear → nulls
 * - unchanged → omit (null return)
 * - emptied without clear → omit (no accidental clear while typing)
 * - changed with number → new tuple
 */
export function buildIdentityDocumentUpdatePayload(
  values: IdentityDocumentFormValues,
  initial: IdentityDocumentFormValues,
): IdentityDocumentWriteFields | null {
  if (values.clear) {
    return {
      identity_document_type: null,
      identity_document_number: null,
      identity_document_country: null,
    };
  }

  const next = buildIdentityDocumentCreatePayload(values);
  const prev = buildIdentityDocumentCreatePayload(initial);

  if (!next && !prev) return null;
  if (!next && prev) return null; // emptied without intentional clear → no change

  if (
    next &&
    prev &&
    next.identity_document_type === prev.identity_document_type &&
    next.identity_document_number === prev.identity_document_number &&
    (next.identity_document_country ?? null) === (prev.identity_document_country ?? null)
  ) {
    return null;
  }

  return next;
}

export function validateIdentityDocumentForm(
  values: IdentityDocumentFormValues,
  t: (key: string) => string,
  options?: { required?: boolean },
): IdentityDocumentFieldErrors {
  const errors: IdentityDocumentFieldErrors = {};
  const hasType = Boolean(values.type);
  const hasNumber = Boolean(values.number.trim());

  if (values.clear) return errors;

  if (options?.required && !hasType && !hasNumber) {
    errors.type = t('admin.identityDocument.errors.required');
    return errors;
  }

  if (!hasType && !hasNumber) return errors;

  if (hasType && !hasNumber) {
    errors.number = t('admin.identityDocument.errors.numberRequired');
  }
  if (hasNumber && !hasType) {
    errors.type = t('admin.identityDocument.errors.typeRequired');
  }
  if (
    hasType &&
    isIdentityDocumentCountryRequired(values.type) &&
    !values.country.trim()
  ) {
    errors.country = t('admin.identityDocument.errors.countryRequired');
  }

  return errors;
}

/** Masked value for list / search / candidates. Never falls back to full number. */
export function resolveMaskedIdentityDocument(
  entity: IdentityDocumentReadFields | null | undefined,
): string | null {
  if (!entity) return null;
  const masked =
    (typeof entity.national_id_masked === 'string' && entity.national_id_masked.trim()) ||
    (typeof entity.identity_document_number_masked === 'string' &&
      entity.identity_document_number_masked.trim()) ||
    '';
  return masked || null;
}

/** Full number for authorized parent detail / edit only. */
export function resolveFullIdentityDocumentNumber(
  entity: IdentityDocumentReadFields | null | undefined,
): string | null {
  if (!entity) return null;
  const full =
    (typeof entity.identity_document_number === 'string' &&
      entity.identity_document_number.trim()) ||
    (typeof entity.national_id === 'string' && entity.national_id.trim()) ||
    '';
  return full || null;
}

export function hasIdentityDocument(
  entity: IdentityDocumentReadFields | null | undefined,
): boolean {
  if (!entity) return false;
  return Boolean(
    resolveFullIdentityDocumentNumber(entity) ||
      resolveMaskedIdentityDocument(entity) ||
      isIdentityDocumentType(entity.identity_document_type),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normalize identity fields from an API record (parent/guardian/search). */
export function readIdentityDocumentFields(
  raw: Record<string, unknown>,
): IdentityDocumentReadFields {
  const typeRaw = raw.identity_document_type;
  const type = isIdentityDocumentType(typeRaw) ? typeRaw : null;

  const identityNumber = readNullableString(raw.identity_document_number);
  const nationalId = readNullableString(raw.national_id) ?? readNullableString(raw.id_number);

  return {
    identity_document_type: type,
    identity_document_number: identityNumber,
    identity_document_country: readNullableString(raw.identity_document_country),
    national_id_masked: readNullableString(raw.national_id_masked),
    identity_document_number_masked: readNullableString(raw.identity_document_number_masked),
    national_id: nationalId,
  };
}

export function readIdentityDocumentFieldsFromUnknown(
  data: unknown,
): IdentityDocumentReadFields {
  const raw = asRecord(data);
  return raw ? readIdentityDocumentFields(raw) : {};
}

/** True when a payload would send conflicting national_id + identity_document_* tuple. */
export function hasConflictingIdentityPayload(payload: Record<string, unknown>): boolean {
  const hasTuple =
    payload.identity_document_type != null ||
    payload.identity_document_number != null ||
    payload.identity_document_country != null;
  const hasNationalIdAlias =
    payload.national_id != null && String(payload.national_id).trim() !== '';
  return hasTuple && hasNationalIdAlias;
}
