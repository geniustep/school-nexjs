/**
 * Family batch guardians PATCH — full replacement semantics.
 * Uses linked_child_ids only (never indexes).
 * Omits identity_document when not dirty so Backend keeps stored identity.
 * Never sends masked numbers as document_number.
 */

import type { PatchFamilyBatchGuardiansPayload } from '@/types/admission';
import { validateGuardianIdentity, validateGuardiansDraft } from './guardian-draft';
import { serializeGuardianIdentity } from './serialize-admission-guardians';
import type {
  AdmissionGuardianValidationError,
  AdmissionGuardianWritePayload,
  GuardianDraft,
} from './types';

export function familyBatchChildClientKey(applicationId: number): string {
  return `family-child-${applicationId}`;
}

export function buildFamilyBatchChildKeyMaps(
  applications: { id: number; student_name?: string }[],
): {
  childClientKeys: string[];
  childClientKeyToId: Map<string, number>;
  childIdToClientKey: Map<number, string>;
  childrenOptions: { clientKey: string; label: string }[];
} {
  const childClientKeyToId = new Map<string, number>();
  const childIdToClientKey = new Map<number, string>();
  const childClientKeys: string[] = [];
  const childrenOptions: { clientKey: string; label: string }[] = [];
  for (const app of applications) {
    const key = familyBatchChildClientKey(app.id);
    childClientKeys.push(key);
    childClientKeyToId.set(key, app.id);
    childIdToClientKey.set(app.id, key);
    childrenOptions.push({
      clientKey: key,
      label: app.student_name?.trim() || key,
    });
  }
  return { childClientKeys, childClientKeyToId, childIdToClientKey, childrenOptions };
}

/** True when a string looks like a masked identity number (must never be sent as document_number). */
export function isMaskedIdentityNumber(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.includes('*');
}

export function validateFamilyBatchGuardiansPatchDraft(
  guardians: GuardianDraft[],
  options: {
    childClientKeys: string[];
    childClientKeyToId: Map<string, number>;
    batchChildIds: number[];
  },
): AdmissionGuardianValidationError | null {
  const batchIdSet = new Set(options.batchChildIds);

  for (const g of guardians) {
    if (!g.appliesToAllChildren) {
      for (const key of g.linkedChildClientKeys) {
        const id = options.childClientKeyToId.get(key);
        if (id == null || !batchIdSet.has(id)) {
          return {
            code: 'family_children_required',
            clientKey: g.clientKey,
            messageKey: 'admin.admissions.family.guardiansEdit.errors.childNotInBatch',
          };
        }
      }
    }
  }

  const base = validateGuardiansDraft(guardians, {
    mode: 'family',
    childClientKeys: options.childClientKeys,
  });
  if (base) return base;

  for (const g of guardians) {
    if (g.identityDirty) {
      const idErr = validateGuardianIdentity(g.identityDocument);
      if (idErr) {
        return { ...idErr, clientKey: g.clientKey };
      }
      if (isMaskedIdentityNumber(g.identityDocument.documentNumber)) {
        return {
          code: 'identity_number_required',
          clientKey: g.clientKey,
          messageKey: 'admin.admissions.guardians.errors.identityNumberRequired',
        };
      }
    }
  }

  return null;
}

function serializeOneForFamilyPatch(
  draft: GuardianDraft,
  childClientKeyToId: Map<string, number>,
): AdmissionGuardianWritePayload {
  const payload: AdmissionGuardianWritePayload = {
    name: draft.name.trim() || undefined,
    phone: draft.phone.trim() || undefined,
    whatsapp: draft.whatsapp.trim() || undefined,
    email: draft.email.trim() || undefined,
    relationship: draft.relationship.trim() || undefined,
    is_primary_contact: draft.isPrimaryContact,
    is_accompanying_guardian: draft.isAccompanyingGuardian,
    applies_to_all_children: draft.appliesToAllChildren,
    all_children: draft.appliesToAllChildren,
  };

  if (draft.guardianId != null && draft.guardianId > 0) {
    payload.guardian_id = draft.guardianId;
  }
  if (draft.personId != null && draft.personId > 0) {
    payload.person_id = draft.personId;
  }

  if (!draft.appliesToAllChildren) {
    payload.linked_child_ids = draft.linkedChildClientKeys
      .map((k) => childClientKeyToId.get(k))
      .filter((id): id is number => typeof id === 'number' && id > 0);
  }

  // Only send identity when the user changed it — never send masked as document_number.
  if (draft.identityDirty) {
    const number = draft.identityDocument.documentNumber.trim();
    if (!isMaskedIdentityNumber(number)) {
      const identity = serializeGuardianIdentity(draft.identityDocument);
      if (identity) {
        if (identity.document_number && isMaskedIdentityNumber(identity.document_number)) {
          delete identity.document_number;
        }
        if (identity.document_type || identity.document_number) {
          payload.identity_document = identity;
        }
      }
    }
  }

  // Strip empties; never include linked_child_indexes.
  delete (payload as { linked_child_indexes?: unknown }).linked_child_indexes;
  for (const key of Object.keys(payload) as (keyof AdmissionGuardianWritePayload)[]) {
    if (payload[key] === undefined || payload[key] === '') delete payload[key];
  }
  return payload;
}

/**
 * Build full-replacement PATCH payload for family batch guardians.
 * Does not call person delete APIs — absence from the list drops the relationship only.
 */
export function buildPatchFamilyBatchGuardiansPayload(
  guardians: GuardianDraft[],
  childClientKeyToId: Map<string, number>,
): PatchFamilyBatchGuardiansPayload {
  return {
    guardians: guardians.map((g) => serializeOneForFamilyPatch(g, childClientKeyToId)),
  };
}

export function familyBatchGuardiansPatchEndpoint(batchId: number | string): string {
  return `/admin/admissions/family-batches/${batchId}/guardians`;
}
