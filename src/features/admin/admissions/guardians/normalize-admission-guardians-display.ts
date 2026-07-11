/**
 * Read-only display normalizer for admission / family-batch guardians.
 * Prefer guardians[]; never merge with legacy in a way that duplicates the primary.
 * Never exposes full document_number on the display model.
 */

import { isIdentityDocumentType } from '@/types/identity-document';
import type {
  AdmissionGuardianDocumentType,
  AdmissionGuardianIdentityDocument,
  AdmissionGuardianRead,
  AdmissionGuardianVerificationState,
  AdmissionWarningDetail,
} from './types';
import { isAdmissionGuardianWarningCode } from './admission-guardian-warnings';

export interface AdmissionGuardianDisplayChild {
  id: number;
  name: string;
}

export interface AdmissionGuardianDisplayIdentity {
  hasDocument: boolean;
  documentType: AdmissionGuardianDocumentType | null;
  documentNumberMasked: string | null;
  issuingCountry: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  verificationState: AdmissionGuardianVerificationState | null;
  isExpired: boolean;
  frontAttachmentId: number | null;
  backAttachmentId: number | null;
}

export interface AdmissionGuardianDisplay {
  /** Stable key for React lists (index-based; display-only). */
  key: string;
  guardianId: number | null;
  personId: number | null;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  relationship: string;
  isPrimaryContact: boolean;
  isAccompanyingGuardian: boolean;
  appliesToAllChildren: boolean;
  /** Resolved child labels for family mode; empty when applies to all. */
  linkedChildLabels: string[];
  /** True when at least one linked_child_id could not be resolved to a name. */
  hasUnresolvedLinkedChild: boolean;
  identity: AdmissionGuardianDisplayIdentity;
  /** Warnings scoped to this guardian (by index or guardian_id). */
  warnings: AdmissionWarningDetail[];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function asOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
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

function isDateExpired(expiryDate: string | null, todayIso?: string): boolean {
  if (!expiryDate || !/^\d{4}-\d{2}-\d{2}/.test(expiryDate)) return false;
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  return expiryDate.slice(0, 10) < today;
}

export function normalizeGuardianIdentityForDisplay(
  raw: AdmissionGuardianIdentityDocument | null | undefined,
  options?: { treatAsExpired?: boolean; todayIso?: string },
): AdmissionGuardianDisplayIdentity {
  if (!raw) {
    return {
      hasDocument: false,
      documentType: null,
      documentNumberMasked: null,
      issuingCountry: null,
      issueDate: null,
      expiryDate: null,
      verificationState: null,
      isExpired: Boolean(options?.treatAsExpired),
      frontAttachmentId: null,
      backAttachmentId: null,
    };
  }

  const typeRaw = raw.document_type;
  const documentType: AdmissionGuardianDocumentType | null =
    typeRaw && isIdentityDocumentType(typeRaw) ? typeRaw : null;

  const masked = asString(raw.document_number_masked).trim() || null;
  // Prefer masked; never put full document_number on the display model.
  const issuingCountry = asString(raw.issuing_country).trim() || null;
  const issueDate = asString(raw.issue_date).trim() || null;
  const expiryDate = asString(raw.expiry_date).trim() || null;
  const frontAttachmentId = asOptionalNumber(raw.front_attachment_id);
  const backAttachmentId = asOptionalNumber(raw.back_attachment_id);
  const verificationState = normalizeVerificationState(raw.verification_state);

  const hasDocument = Boolean(
    documentType ||
      masked ||
      issuingCountry ||
      issueDate ||
      expiryDate ||
      frontAttachmentId ||
      backAttachmentId ||
      verificationState,
  );

  const expiredByDate = isDateExpired(expiryDate, options?.todayIso);

  return {
    hasDocument,
    documentType,
    documentNumberMasked: masked,
    issuingCountry,
    issueDate,
    expiryDate,
    verificationState,
    isExpired: Boolean(options?.treatAsExpired) || expiredByDate,
    frontAttachmentId,
    backAttachmentId,
  };
}

function resolveLinkedChildren(
  linkedIds: number[] | null | undefined,
  children: AdmissionGuardianDisplayChild[] | undefined,
): { labels: string[]; hasUnresolved: boolean } {
  if (!Array.isArray(linkedIds) || linkedIds.length === 0) {
    return { labels: [], hasUnresolved: false };
  }
  const byId = new Map((children ?? []).map((c) => [c.id, c.name]));
  const labels: string[] = [];
  let hasUnresolved = false;
  for (const id of linkedIds) {
    const name = byId.get(id)?.trim();
    if (name) labels.push(name);
    else {
      hasUnresolved = true;
      labels.push(''); // placeholder resolved by UI via unknownChildLabel
    }
  }
  return { labels, hasUnresolved };
}

function warningsForGuardian(
  warnings: AdmissionWarningDetail[] | null | undefined,
  index: number,
  guardianId: number | null,
): AdmissionWarningDetail[] {
  if (!Array.isArray(warnings) || warnings.length === 0) return [];
  return warnings.filter((w) => {
    if (!isAdmissionGuardianWarningCode(w.code)) return false;
    if (w.guardian_index != null && w.guardian_index === index) return true;
    if (
      guardianId != null &&
      w.guardian_id != null &&
      Number(w.guardian_id) === guardianId
    ) {
      return true;
    }
    return false;
  });
}

/** Family / section-level warnings not tied to a single guardian card. */
export function normalizeAdmissionGuardianSectionWarnings(
  warnings: AdmissionWarningDetail[] | null | undefined,
  displayed: AdmissionGuardianDisplay[],
): AdmissionWarningDetail[] {
  if (!Array.isArray(warnings) || warnings.length === 0) return [];
  const shownOnCards = new Set(
    displayed.flatMap((g) => g.warnings.map((w) => `${w.code}:${w.guardian_index ?? ''}:${w.guardian_id ?? ''}`)),
  );
  return warnings.filter((w) => {
    if (!isAdmissionGuardianWarningCode(w.code)) return false;
    // Prefer card when scoped; otherwise show once at section.
    if (w.guardian_index != null || w.guardian_id != null) {
      const key = `${w.code}:${w.guardian_index ?? ''}:${w.guardian_id ?? ''}`;
      return !shownOnCards.has(key);
    }
    return (
      w.code === 'primary_guardian_missing' ||
      w.code === 'family_child_without_guardian'
    );
  });
}

function coerceIdentityDocument(
  rawGuardian: Record<string, unknown>,
): AdmissionGuardianIdentityDocument | null {
  const nested = rawGuardian.identity_document;
  if (nested != null && typeof nested === 'object') {
    return nested as AdmissionGuardianIdentityDocument;
  }
  // Tolerate flat / alternate keys without inventing values.
  const type = rawGuardian.document_type ?? rawGuardian.identity_document_type;
  const masked =
    rawGuardian.document_number_masked ?? rawGuardian.identity_document_number_masked;
  const number = rawGuardian.document_number ?? rawGuardian.identity_document_number;
  const country = rawGuardian.issuing_country ?? rawGuardian.identity_document_country;
  const issueDate = rawGuardian.issue_date ?? rawGuardian.identity_document_issue_date;
  const expiryDate = rawGuardian.expiry_date ?? rawGuardian.identity_document_expiry_date;
  const verification =
    rawGuardian.verification_state ?? rawGuardian.identity_verification_state;
  const front =
    rawGuardian.front_attachment_id ?? rawGuardian.identity_front_attachment_id;
  const back =
    rawGuardian.back_attachment_id ?? rawGuardian.identity_back_attachment_id;

  if (
    type == null &&
    masked == null &&
    number == null &&
    country == null &&
    issueDate == null &&
    expiryDate == null &&
    verification == null &&
    front == null &&
    back == null
  ) {
    return null;
  }

  return {
    document_type: (type as AdmissionGuardianIdentityDocument['document_type']) ?? null,
    document_number: typeof number === 'string' ? number : null,
    document_number_masked: typeof masked === 'string' ? masked : null,
    issuing_country: typeof country === 'string' ? country : null,
    issue_date: typeof issueDate === 'string' ? issueDate : null,
    expiry_date: typeof expiryDate === 'string' ? expiryDate : null,
    front_attachment_id: typeof front === 'number' ? front : null,
    back_attachment_id: typeof back === 'number' ? back : null,
    verification_state:
      (verification as AdmissionGuardianIdentityDocument['verification_state']) ?? null,
  };
}

function mapOneForDisplay(
  raw: AdmissionGuardianRead,
  index: number,
  options?: {
    children?: AdmissionGuardianDisplayChild[];
    warnings?: AdmissionWarningDetail[] | null;
    todayIso?: string;
  },
): AdmissionGuardianDisplay {
  const guardianId = asOptionalNumber(raw.guardian_id);
  const appliesToAll = asBool(
    raw.applies_to_all_children ?? raw.all_children,
    true,
  );
  const scopedWarnings = warningsForGuardian(options?.warnings, index, guardianId);
  const treatExpired = scopedWarnings.some((w) => w.code === 'guardian_identity_expired');
  const linked = appliesToAll
    ? { labels: [] as string[], hasUnresolved: false }
    : resolveLinkedChildren(raw.linked_child_ids ?? null, options?.children);

  const identityRaw = coerceIdentityDocument(raw as unknown as Record<string, unknown>);

  return {
    key: `g-${index}-${guardianId ?? raw.person_id ?? 'new'}`,
    guardianId,
    personId: asOptionalNumber(raw.person_id),
    name: asString(raw.name).trim(),
    phone: asString(raw.phone).trim(),
    whatsapp: asString(raw.whatsapp).trim(),
    email: asString(raw.email).trim(),
    relationship: asString(raw.relationship).trim(),
    isPrimaryContact: asBool(raw.is_primary_contact, index === 0),
    isAccompanyingGuardian: asBool(raw.is_accompanying_guardian, false),
    appliesToAllChildren: appliesToAll,
    linkedChildLabels: linked.labels,
    hasUnresolvedLinkedChild: linked.hasUnresolved,
    identity: normalizeGuardianIdentityForDisplay(identityRaw, {
      treatAsExpired: treatExpired,
      todayIso: options?.todayIso,
    }),
    warnings: scopedWarnings,
  };
}

/**
 * Drop only exact strong-id duplicates (guardian_id or person_id).
 * Never dedupe by phone or name alone.
 */
export function dedupeGuardiansByStrongId(
  list: AdmissionGuardianDisplay[],
): AdmissionGuardianDisplay[] {
  const seenGuardianIds = new Set<number>();
  const seenPersonIds = new Set<number>();
  const out: AdmissionGuardianDisplay[] = [];
  for (const g of list) {
    if (g.guardianId != null) {
      if (seenGuardianIds.has(g.guardianId)) continue;
      seenGuardianIds.add(g.guardianId);
    }
    if (g.personId != null) {
      if (seenPersonIds.has(g.personId)) continue;
      seenPersonIds.add(g.personId);
    }
    out.push(g);
  }
  return out;
}

function sortPrimaryFirst(list: AdmissionGuardianDisplay[]): AdmissionGuardianDisplay[] {
  const primaryCount = list.filter((g) => g.isPrimaryContact).length;
  let normalized = list;
  if (primaryCount === 0 && list.length > 0) {
    normalized = list.map((g, i) => ({ ...g, isPrimaryContact: i === 0 }));
  } else if (primaryCount > 1) {
    let seen = false;
    normalized = list.map((g) => {
      if (!g.isPrimaryContact) return g;
      if (seen) return { ...g, isPrimaryContact: false };
      seen = true;
      return g;
    });
  }
  const primary = normalized.filter((g) => g.isPrimaryContact);
  const rest = normalized.filter((g) => !g.isPrimaryContact);
  return [...primary, ...rest];
}

function fromLegacyFlat(fields: {
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_whatsapp?: string | null;
  guardian_email?: string | null;
  guardian_relationship?: string | null;
  relationship?: string | null;
  guardian_id?: number | null;
}): AdmissionGuardianRead | null {
  const name = asString(fields.guardian_name).trim();
  const phone = asString(fields.guardian_phone).trim();
  const guardianId = asOptionalNumber(fields.guardian_id);
  if (!name && !phone && guardianId == null) return null;
  return {
    guardian_id: guardianId,
    name,
    phone,
    whatsapp: asString(fields.guardian_whatsapp).trim() || null,
    email: asString(fields.guardian_email).trim() || null,
    relationship:
      asString(fields.guardian_relationship ?? fields.relationship).trim() || null,
    is_primary_contact: true,
    is_accompanying_guardian: false,
    applies_to_all_children: true,
    all_children: true,
    identity_document: null,
  };
}

/**
 * Normalize guardians for read-only detail UI.
 * When guardians[] is non-empty it is the sole source (legacy ignored — no duplicate primary).
 */
export function normalizeAdmissionGuardiansForDisplay(input: {
  guardians?: AdmissionGuardianRead[] | null;
  legacyFlat?: {
    guardian_name?: string | null;
    guardian_phone?: string | null;
    guardian_whatsapp?: string | null;
    guardian_email?: string | null;
    guardian_relationship?: string | null;
    relationship?: string | null;
    guardian_id?: number | null;
  };
  sharedContact?: {
    guardian_id?: number | false | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    guardian_whatsapp?: string | null;
    guardian_email?: string | null;
    relationship?: string | null;
  } | null;
  children?: AdmissionGuardianDisplayChild[];
  warnings?: AdmissionWarningDetail[] | null;
  todayIso?: string;
}): AdmissionGuardianDisplay[] {
  const opts = {
    children: input.children,
    warnings: input.warnings,
    todayIso: input.todayIso,
  };

  if (Array.isArray(input.guardians) && input.guardians.length > 0) {
    return dedupeGuardiansByStrongId(
      sortPrimaryFirst(
        input.guardians.map((g, index) => mapOneForDisplay(g, index, opts)),
      ),
    );
  }

  if (input.sharedContact) {
    const legacy = fromLegacyFlat({
      guardian_id:
        typeof input.sharedContact.guardian_id === 'number'
          ? input.sharedContact.guardian_id
          : undefined,
      guardian_name: input.sharedContact.guardian_name,
      guardian_phone: input.sharedContact.guardian_phone,
      guardian_whatsapp: input.sharedContact.guardian_whatsapp,
      guardian_email: input.sharedContact.guardian_email,
      relationship: input.sharedContact.relationship,
    });
    if (legacy) return sortPrimaryFirst([mapOneForDisplay(legacy, 0, opts)]);
  }

  if (input.legacyFlat) {
    const legacy = fromLegacyFlat(input.legacyFlat);
    if (legacy) return sortPrimaryFirst([mapOneForDisplay(legacy, 0, opts)]);
  }

  return [];
}

/** Safe attachment preview helper for identity document sides. */
export function resolveGuardianIdentityAttachmentPreviewUrl(
  attachmentId: number | null | undefined,
): string | null {
  if (attachmentId == null || !Number.isFinite(attachmentId) || attachmentId <= 0) {
    return null;
  }
  return `/api/attachments/${attachmentId}/preview`;
}
