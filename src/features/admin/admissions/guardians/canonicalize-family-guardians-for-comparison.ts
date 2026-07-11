/**
 * Stable canonical form for family-batch guardians dirty detection.
 * Ignores React client keys, masked identity display, and linked_child_ids order.
 */

import { isMaskedIdentityNumber } from './serialize-family-batch-guardians-patch';
import type { GuardianDraft } from './types';

export type CanonicalFamilyGuardianForComparison = {
  guardian_id: number | null;
  person_id: number | null;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  relationship: string;
  is_primary_contact: boolean;
  is_accompanying_guardian: boolean;
  applies_to_all_children: boolean;
  linked_child_ids: number[];
  /** Present only when the user edited identity (identityDirty). */
  identity: {
    document_type: string;
    document_number: string;
    issuing_country: string;
    issue_date: string;
    expiry_date: string;
  } | null;
};

function normText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normId(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function linkedChildIdsForComparison(
  draft: GuardianDraft,
  childClientKeyToId: Map<string, number>,
): number[] {
  if (draft.appliesToAllChildren) return [];
  return draft.linkedChildClientKeys
    .map((key) => childClientKeyToId.get(key))
    .filter((id): id is number => typeof id === 'number' && id > 0)
    .sort((a, b) => a - b);
}

function identityForComparison(
  draft: GuardianDraft,
): CanonicalFamilyGuardianForComparison['identity'] {
  if (!draft.identityDirty) return null;
  const number = normText(draft.identityDocument.documentNumber);
  return {
    document_type: normText(draft.identityDocument.documentType),
    document_number: isMaskedIdentityNumber(number) ? '' : number,
    issuing_country: normText(draft.identityDocument.issuingCountry),
    issue_date: normText(draft.identityDocument.issueDate),
    expiry_date: normText(draft.identityDocument.expiryDate),
  };
}

function compareCanonical(
  a: CanonicalFamilyGuardianForComparison,
  b: CanonicalFamilyGuardianForComparison,
): number {
  if (a.is_primary_contact !== b.is_primary_contact) {
    return a.is_primary_contact ? -1 : 1;
  }
  const aG = a.guardian_id ?? 0;
  const bG = b.guardian_id ?? 0;
  if (aG !== bG) return aG - bG;
  const aP = a.person_id ?? 0;
  const bP = b.person_id ?? 0;
  if (aP !== bP) return aP - bP;
  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) return byName;
  return a.phone.localeCompare(b.phone);
}

/**
 * Build a deterministic, JSON-stable snapshot for dirty comparison.
 * Does not treat masked document_number_masked as an editable identity value.
 */
export function canonicalizeFamilyGuardiansForComparison(
  guardians: GuardianDraft[],
  childClientKeyToId: Map<string, number>,
): CanonicalFamilyGuardianForComparison[] {
  return guardians
    .map((g) => ({
      guardian_id: normId(g.guardianId),
      person_id: normId(g.personId),
      name: normText(g.name),
      phone: normText(g.phone),
      whatsapp: normText(g.whatsapp),
      email: normText(g.email),
      relationship: normText(g.relationship),
      is_primary_contact: Boolean(g.isPrimaryContact),
      is_accompanying_guardian: Boolean(g.isAccompanyingGuardian),
      applies_to_all_children: Boolean(g.appliesToAllChildren),
      linked_child_ids: linkedChildIdsForComparison(g, childClientKeyToId),
      identity: identityForComparison(g),
    }))
    .sort(compareCanonical);
}

export function familyBatchGuardiansHaveChanges(
  baseline: GuardianDraft[],
  current: GuardianDraft[],
  childClientKeyToId: Map<string, number>,
): boolean {
  return (
    JSON.stringify(canonicalizeFamilyGuardiansForComparison(baseline, childClientKeyToId)) !==
    JSON.stringify(canonicalizeFamilyGuardiansForComparison(current, childClientKeyToId))
  );
}
