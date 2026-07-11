import { getPrimaryGuardian } from './guardian-draft';
import type {
  AdmissionGuardianIdentityDocument,
  AdmissionGuardianWritePayload,
  GuardianDraft,
  GuardianIdentityDraft,
} from './types';

function cleanString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function serializeGuardianIdentity(
  identity: GuardianIdentityDraft,
): AdmissionGuardianIdentityDocument | undefined {
  if (!identity.documentType && !identity.documentNumber.trim()) {
    // Still allow dates/attachments alone only if type+number present per contract optional rules
    if (
      !identity.issueDate &&
      !identity.expiryDate &&
      identity.frontAttachmentId == null &&
      identity.backAttachmentId == null
    ) {
      return undefined;
    }
  }

  if (!identity.documentType) return undefined;

  const doc: AdmissionGuardianIdentityDocument = {
    document_type: identity.documentType,
  };
  const number = cleanString(identity.documentNumber);
  if (number) doc.document_number = number;
  const country = cleanString(identity.issuingCountry);
  if (country) doc.issuing_country = country.toUpperCase();
  if (identity.issueDate) doc.issue_date = identity.issueDate;
  if (identity.expiryDate) doc.expiry_date = identity.expiryDate;
  if (identity.frontAttachmentId != null) doc.front_attachment_id = identity.frontAttachmentId;
  if (identity.backAttachmentId != null) doc.back_attachment_id = identity.backAttachmentId;
  if (identity.verificationState) doc.verification_state = identity.verificationState;
  return doc;
}

export function serializeGuardianDraft(
  draft: GuardianDraft,
  options?: {
    mode: 'individual' | 'family';
    /** Ordered child client keys at submit — used for linked_child_indexes. */
    childClientKeysInOrder?: string[];
    /** When editing saved applications — map client key → admission/child id. */
    childClientKeyToId?: Map<string, number>;
  },
): AdmissionGuardianWritePayload {
  const payload: AdmissionGuardianWritePayload = {
    name: cleanString(draft.name),
    phone: cleanString(draft.phone),
    whatsapp: cleanString(draft.whatsapp),
    email: cleanString(draft.email),
    relationship: cleanString(draft.relationship),
    is_primary_contact: draft.isPrimaryContact,
    is_accompanying_guardian: draft.isAccompanyingGuardian,
  };

  if (draft.guardianId != null && draft.guardianId > 0) {
    payload.guardian_id = draft.guardianId;
  }
  if (draft.personId != null && draft.personId > 0) {
    payload.person_id = draft.personId;
  }

  if (options?.mode === 'family') {
    const appliesAll = draft.appliesToAllChildren;
    payload.applies_to_all_children = appliesAll;
    payload.all_children = appliesAll;
    if (!appliesAll) {
      const keyToId = options.childClientKeyToId;
      if (keyToId && draft.linkedChildClientKeys.some((k) => keyToId.has(k))) {
        payload.linked_child_ids = draft.linkedChildClientKeys
          .map((k) => keyToId.get(k))
          .filter((id): id is number => typeof id === 'number');
      } else if (options.childClientKeysInOrder) {
        const order = options.childClientKeysInOrder;
        payload.linked_child_indexes = draft.linkedChildClientKeys
          .map((k) => order.indexOf(k))
          .filter((i) => i >= 0);
      }
    }
  } else {
    payload.applies_to_all_children = true;
    payload.all_children = true;
  }

  const identity = serializeGuardianIdentity(draft.identityDocument);
  if (identity) payload.identity_document = identity;

  for (const key of Object.keys(payload) as (keyof AdmissionGuardianWritePayload)[]) {
    if (payload[key] === undefined || payload[key] === '') delete payload[key];
  }

  return payload;
}

export function serializeGuardiansPayload(
  guardians: GuardianDraft[],
  options?: Parameters<typeof serializeGuardianDraft>[1],
): AdmissionGuardianWritePayload[] {
  return guardians.map((g) => serializeGuardianDraft(g, options));
}

/** Derive legacy guardian_* from primary only — must match guardians[primary]. */
export function deriveLegacyGuardianFields(guardians: GuardianDraft[]): {
  guardian_name?: string;
  guardian_phone?: string;
  guardian_whatsapp?: string;
  guardian_email?: string;
  guardian_relationship?: string;
  relationship?: string;
  guardian_id?: number;
} {
  const primary = getPrimaryGuardian(guardians);
  if (!primary) return {};
  const fields: ReturnType<typeof deriveLegacyGuardianFields> = {};
  const name = cleanString(primary.name);
  const phone = cleanString(primary.phone);
  const whatsapp = cleanString(primary.whatsapp);
  const email = cleanString(primary.email);
  const relationship = cleanString(primary.relationship);
  if (name) fields.guardian_name = name;
  if (phone) fields.guardian_phone = phone;
  if (whatsapp) fields.guardian_whatsapp = whatsapp;
  if (email) fields.guardian_email = email;
  if (relationship) {
    fields.guardian_relationship = relationship;
    fields.relationship = relationship;
  }
  if (primary.guardianId != null && primary.guardianId > 0) {
    fields.guardian_id = primary.guardianId;
  }
  return fields;
}

/** Family shared_contact = primary projection only. */
export function deriveSharedContactFromPrimary(guardians: GuardianDraft[]): {
  guardian_id?: number;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_whatsapp?: string;
  guardian_email?: string;
  relationship?: string;
} {
  const legacy = deriveLegacyGuardianFields(guardians);
  const shared: ReturnType<typeof deriveSharedContactFromPrimary> = {};
  if (legacy.guardian_id != null) shared.guardian_id = legacy.guardian_id;
  if (legacy.guardian_name) shared.guardian_name = legacy.guardian_name;
  if (legacy.guardian_phone) shared.guardian_phone = legacy.guardian_phone;
  if (legacy.guardian_whatsapp) shared.guardian_whatsapp = legacy.guardian_whatsapp;
  if (legacy.guardian_email) shared.guardian_email = legacy.guardian_email;
  if (legacy.relationship) shared.relationship = legacy.relationship;
  return shared;
}
