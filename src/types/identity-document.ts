/** Guardian / parent identity document — SSC-API-2026.07.003 */

export const IDENTITY_DOCUMENT_TYPES = [
  'national_id',
  'passport',
  'residence_card',
  'other',
] as const;

export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

export type GuardianSearchMatchBasis =
  | 'name'
  | 'phone'
  | 'email'
  | 'identity_document'
  | string;

/** Writable identity document fields for create/update payloads. */
export interface IdentityDocumentWriteFields {
  identity_document_type?: IdentityDocumentType | null;
  identity_document_number?: string | null;
  identity_document_country?: string | null;
}

/** Read-side identity fields shared across parent/guardian surfaces. */
export interface IdentityDocumentReadFields {
  identity_document_type?: IdentityDocumentType | null;
  identity_document_number?: string | null;
  identity_document_country?: string | null;
  /** Masked value for list/search/candidates — never show full number here. */
  national_id_masked?: string | null;
  identity_document_number_masked?: string | null;
  /**
   * Alias for national_id document type only.
   * Full value may appear on authorized parent detail; list/search must use masked.
   */
  national_id?: string | null;
}

export function isIdentityDocumentType(value: unknown): value is IdentityDocumentType {
  return (
    typeof value === 'string' &&
    (IDENTITY_DOCUMENT_TYPES as readonly string[]).includes(value)
  );
}
