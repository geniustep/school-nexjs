import { isIdentityDocumentType } from '@/types/identity-document';
import {
  createGuardianClientKey,
  emptyGuardianIdentityDraft,
  createPrimaryGuardianDraft,
} from './guardian-draft';
import type {
  AdmissionGuardianDocumentType,
  AdmissionGuardianIdentityDocument,
  AdmissionGuardianRead,
  AdmissionGuardianVerificationState,
  GuardianDraft,
  GuardianIdentityDraft,
} from './types';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function normalizeVerificationState(
  value: unknown,
): AdmissionGuardianVerificationState | null {
  if (value === 'unverified' || value === 'reviewed' || value === 'needs_update') return value;
  return null;
}

export function normalizeGuardianIdentityDocument(
  raw: AdmissionGuardianIdentityDocument | null | undefined,
): GuardianIdentityDraft {
  if (!raw) return emptyGuardianIdentityDraft();
  const typeRaw = raw.document_type;
  const documentType: AdmissionGuardianDocumentType | '' =
    typeRaw && isIdentityDocumentType(typeRaw) ? typeRaw : '';
  // Prefer real document_number only when it is not a masked display value.
  // Never put masked into the editable number field (would be resent on dirty PATCH).
  const rawNumber = asString(raw.document_number).trim();
  const masked = asString(raw.document_number_masked).trim();
  const looksMasked = rawNumber.includes('*') || (masked && rawNumber === masked);
  return {
    documentType,
    documentNumber: looksMasked ? '' : rawNumber,
    documentNumberMasked: masked,
    issuingCountry: asString(raw.issuing_country),
    issueDate: asString(raw.issue_date),
    expiryDate: asString(raw.expiry_date),
    frontAttachmentId: asOptionalNumber(raw.front_attachment_id),
    backAttachmentId: asOptionalNumber(raw.back_attachment_id),
    verificationState: normalizeVerificationState(raw.verification_state),
  };
}

function normalizeOneGuardian(
  raw: AdmissionGuardianRead,
  index: number,
  childClientKeysByIndex?: string[],
): GuardianDraft {
  const appliesToAll =
    raw.applies_to_all_children ?? raw.all_children ?? true;

  let linkedChildClientKeys: string[] = [];
  if (!appliesToAll && childClientKeysByIndex) {
    const ids = raw.linked_child_ids;
    const indexes = raw.linked_child_indexes;
    if (Array.isArray(indexes)) {
      linkedChildClientKeys = indexes
        .map((i) => (typeof i === 'number' ? childClientKeysByIndex[i] : undefined))
        .filter((k): k is string => Boolean(k));
    }
    // linked_child_ids resolved later by caller when child id→key map is known
    if (linkedChildClientKeys.length === 0 && Array.isArray(ids) && ids.length === 0) {
      linkedChildClientKeys = [];
    }
  }

  return {
    clientKey: createGuardianClientKey(),
    guardianId: asOptionalNumber(raw.guardian_id),
    personId: asOptionalNumber(raw.person_id),
    name: asString(raw.name),
    phone: asString(raw.phone),
    whatsapp: asString(raw.whatsapp),
    email: asString(raw.email),
    relationship: asString(raw.relationship),
    isPrimaryContact: asBool(raw.is_primary_contact, index === 0),
    isAccompanyingGuardian: asBool(raw.is_accompanying_guardian, false),
    appliesToAllChildren: Boolean(appliesToAll),
    linkedChildClientKeys,
    identityDocument: normalizeGuardianIdentityDocument(raw.identity_document),
    identityOpen: false,
    identityDirty: false,
  };
}

/**
 * Hydrate guardians from API list. Ensures exactly one primary.
 * When childIdToClientKey is provided, maps linked_child_ids → client keys.
 */
export function hydrateGuardiansFromApi(
  guardians: AdmissionGuardianRead[] | null | undefined,
  options?: {
    childClientKeysByIndex?: string[];
    childIdToClientKey?: Map<number, string>;
  },
): GuardianDraft[] {
  if (!Array.isArray(guardians) || guardians.length === 0) return [];

  const drafts = guardians.map((g, index) => {
    const draft = normalizeOneGuardian(g, index, options?.childClientKeysByIndex);
    if (
      !draft.appliesToAllChildren &&
      options?.childIdToClientKey &&
      Array.isArray(g.linked_child_ids)
    ) {
      draft.linkedChildClientKeys = g.linked_child_ids
        .map((id) => options.childIdToClientKey!.get(id))
        .filter((k): k is string => Boolean(k));
    }
    return draft;
  });

  const primaryCount = drafts.filter((d) => d.isPrimaryContact).length;
  if (primaryCount === 0 && drafts.length > 0) {
    drafts[0] = { ...drafts[0], isPrimaryContact: true };
  } else if (primaryCount > 1) {
    let seen = false;
    for (let i = 0; i < drafts.length; i += 1) {
      if (drafts[i].isPrimaryContact) {
        if (seen) drafts[i] = { ...drafts[i], isPrimaryContact: false };
        else seen = true;
      }
    }
  }

  return drafts;
}

/** Legacy individual: guardian_* flat fields → single draft. */
export function hydrateGuardiansFromLegacyFlat(fields: {
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_whatsapp?: string | null;
  guardian_email?: string | null;
  guardian_relationship?: string | null;
  relationship?: string | null;
  guardian_id?: number | null;
}): GuardianDraft[] {
  const name = asString(fields.guardian_name);
  const phone = asString(fields.guardian_phone);
  if (!name && !phone && fields.guardian_id == null) {
    return [createPrimaryGuardianDraft()];
  }
  const draft = createPrimaryGuardianDraft();
  return [
    {
      ...draft,
      guardianId: asOptionalNumber(fields.guardian_id),
      name,
      phone,
      whatsapp: asString(fields.guardian_whatsapp),
      email: asString(fields.guardian_email),
      relationship: asString(fields.guardian_relationship ?? fields.relationship),
    },
  ];
}

/** Legacy family: shared_contact → single draft. */
export function hydrateGuardiansFromSharedContact(shared: {
  guardian_id?: number | false | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_whatsapp?: string | null;
  guardian_email?: string | null;
  relationship?: string | null;
} | null | undefined): GuardianDraft[] {
  if (!shared) return [createPrimaryGuardianDraft()];
  return hydrateGuardiansFromLegacyFlat({
    guardian_id: typeof shared.guardian_id === 'number' ? shared.guardian_id : undefined,
    guardian_name: shared.guardian_name,
    guardian_phone: shared.guardian_phone,
    guardian_whatsapp: shared.guardian_whatsapp,
    guardian_email: shared.guardian_email,
    relationship: shared.relationship,
  });
}

/**
 * Prefer guardians[]; fall back to legacy flat / shared_contact.
 */
export function hydrateAdmissionGuardians(input: {
  guardians?: AdmissionGuardianRead[] | null;
  legacyFlat?: Parameters<typeof hydrateGuardiansFromLegacyFlat>[0];
  sharedContact?: Parameters<typeof hydrateGuardiansFromSharedContact>[0];
  childClientKeysByIndex?: string[];
  childIdToClientKey?: Map<number, string>;
}): GuardianDraft[] {
  const fromApi = hydrateGuardiansFromApi(input.guardians, {
    childClientKeysByIndex: input.childClientKeysByIndex,
    childIdToClientKey: input.childIdToClientKey,
  });
  if (fromApi.length > 0) return fromApi;
  if (input.sharedContact) return hydrateGuardiansFromSharedContact(input.sharedContact);
  if (input.legacyFlat) return hydrateGuardiansFromLegacyFlat(input.legacyFlat);
  return [createPrimaryGuardianDraft()];
}
