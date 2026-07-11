/**
 * Admission multi-guardian + identity contract (Backend READY).
 * Source of truth: guardians[]. Legacy guardian_* / shared_contact = primary projection.
 */

import type { IdentityDocumentType } from '@/types/identity-document';

export type AdmissionGuardianDocumentType = IdentityDocumentType;

export type AdmissionGuardianVerificationState =
  | 'unverified'
  | 'reviewed'
  | 'needs_update';

export interface AdmissionGuardianIdentityDocument {
  document_type?: AdmissionGuardianDocumentType | null;
  document_number?: string | null;
  document_number_masked?: string | null;
  issuing_country?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  front_attachment_id?: number | null;
  back_attachment_id?: number | null;
  verification_state?: AdmissionGuardianVerificationState | null;
}

/** Wire shape for create/patch guardians[]. */
export interface AdmissionGuardianWritePayload {
  guardian_id?: number;
  person_id?: number;
  name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  relationship?: string;
  is_primary_contact?: boolean;
  is_accompanying_guardian?: boolean;
  applies_to_all_children?: boolean;
  all_children?: boolean;
  linked_child_ids?: number[];
  /** Family create before child IDs exist — indexes into children[] at submit time. */
  linked_child_indexes?: number[];
  identity_document?: AdmissionGuardianIdentityDocument | null;
}

/** Read shape from GET detail / family batch. */
export interface AdmissionGuardianRead {
  guardian_id?: number | null;
  person_id?: number | null;
  name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  relationship?: string | null;
  is_primary_contact?: boolean | null;
  is_accompanying_guardian?: boolean | null;
  applies_to_all_children?: boolean | null;
  all_children?: boolean | null;
  linked_child_ids?: number[] | null;
  linked_child_indexes?: number[] | null;
  identity_document?: AdmissionGuardianIdentityDocument | null;
}

export interface AdmissionWarningDetail {
  code: string;
  message?: string | null;
  guardian_index?: number | null;
  child_index?: number | null;
  guardian_id?: number | null;
}

export interface GuardianIdentityDraft {
  documentType: AdmissionGuardianDocumentType | '';
  documentNumber: string;
  documentNumberMasked: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  frontAttachmentId?: number;
  backAttachmentId?: number;
  verificationState?: AdmissionGuardianVerificationState | null;
}

export interface GuardianDraft {
  clientKey: string;
  guardianId?: number;
  personId?: number;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  relationship: string;
  isPrimaryContact: boolean;
  isAccompanyingGuardian: boolean;
  /** Family only — default true. Individual always treats as applying to the single child. */
  appliesToAllChildren: boolean;
  linkedChildClientKeys: string[];
  identityDocument: GuardianIdentityDraft;
  identityOpen: boolean;
  /**
   * When false (hydrated from API), omit identity_document on family PATCH so Backend
   * keeps the stored document. Set true when the user edits identity fields.
   */
  identityDirty: boolean;
}

export type AdmissionGuardianValidationCode =
  | 'primary_required'
  | 'duplicate_primary'
  | 'duplicate_guardian_id'
  | 'guardian_incomplete'
  | 'identity_number_required'
  | 'identity_dates_invalid'
  | 'family_children_required';

export interface AdmissionGuardianValidationError {
  code: AdmissionGuardianValidationCode;
  clientKey?: string;
  messageKey: string;
}
