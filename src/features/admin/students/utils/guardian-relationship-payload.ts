import type {
  GuardianContactPatch,
  GuardianRelationshipCreatePayload,
  GuardianRelationshipUpdatePayload,
  LinkPersonAsGuardianPayload,
  PersonSearchResult,
  RelationshipType,
} from '@/types/student-360';
import type {
  GuardianAccountAccessPolicy,
  GuardianLegalStatus,
} from '@/types/guardian-access';
import type { RelationshipFormValues } from '../components/guardian-relationship-form';
import {
  isGuardianAccountAccessPolicy,
  isGuardianLegalStatus,
} from './guardian-access-contract';
import { RELATIONSHIP_TYPE_CODES } from './relationship-types';

/** Narrow technical role codes accepted on guardian write payloads. */
export type GuardianRelationshipTypeCode = (typeof RELATIONSHIP_TYPE_CODES)[number];

type GuardianAccessWriteFields = {
  legal_status: GuardianLegalStatus;
  account_access_policy: GuardianAccountAccessPolicy;
};

export type CanonicalGuardianRelationshipCreatePayload = Omit<
  GuardianRelationshipCreatePayload,
  'is_legal_guardian'
> & GuardianAccessWriteFields;

export type CanonicalLinkPersonAsGuardianPayload = Omit<
  LinkPersonAsGuardianPayload,
  'is_legal_guardian'
> & GuardianAccessWriteFields;

export type CanonicalGuardianRelationshipUpdatePayload = GuardianRelationshipUpdatePayload &
  Partial<GuardianAccessWriteFields>;

const RELATIONSHIP_TYPE_CODE_SET = new Set<string>(RELATIONSHIP_TYPE_CODES);

/** Read-only / display fields that must never appear on relationship update writes. */
export const GUARDIAN_RELATIONSHIP_UPDATE_READ_ONLY_FIELDS = [
  'active_school_id',
  'student_id',
  'guardian_id',
  'partner_id',
  'relationship_id',
  'guardian',
  'person',
  'account',
  'allowed_actions',
  'available_actions',
  'removal_impact',
  'state',
  'active',
  'date_end',
  'needs_review',
  'role_labels',
  'existing_roles',
  'display_name',
  'name',
  'permissions',
  'created_at',
  'updated_at',
  'write_date',
  'create_date',
] as const;

const UPDATE_WRITE_KEYS = [
  'relationship_type',
  'legal_status',
  'account_access_policy',
  // Explicit legacy input remains accepted by the sanitizer only; canonical builders never emit it.
  'is_legal_guardian',
  'is_primary_contact',
  'is_financial_responsible',
  'receives_notifications',
  'is_emergency_contact',
  'is_authorized_pickup',
  'contact_priority',
  'date_start',
  'notes',
] as const;

export function isGuardianRelationshipTypeCode(
  value: unknown,
): value is GuardianRelationshipTypeCode {
  return typeof value === 'string' && RELATIONSHIP_TYPE_CODE_SET.has(value);
}

/**
 * Resolve the technical relationship role from the dialog selection only.
 * Labels and person metadata must never be used as the outbound role.
 */
export function resolveSelectedRelationshipType(
  selected: unknown,
): GuardianRelationshipTypeCode | null {
  return isGuardianRelationshipTypeCode(selected) ? selected : null;
}

function relationshipFields(
  values: RelationshipFormValues,
): Omit<CanonicalGuardianRelationshipCreatePayload, 'guardian_id'> {
  const relationshipType = resolveSelectedRelationshipType(values.relationship_type);
  if (!relationshipType) {
    throw new Error('guardian_relationship_type_required');
  }

  const payload: Omit<CanonicalGuardianRelationshipCreatePayload, 'guardian_id'> = {
    relationship_type: relationshipType,
    legal_status: values.legal_status,
    account_access_policy: values.account_access_policy,
    is_primary_contact: values.is_primary_contact,
    is_financial_responsible: values.is_financial_responsible,
    receives_notifications: values.receives_notifications,
    is_emergency_contact: values.is_emergency_contact,
    is_authorized_pickup: values.is_authorized_pickup,
  };
  const priority = Number(values.contact_priority);
  if (Number.isInteger(priority) && priority > 0) payload.contact_priority = priority;
  if (values.date_start.trim()) payload.date_start = values.date_start.trim();
  if (values.notes.trim()) payload.notes = values.notes.trim();
  return payload;
}

/**
 * Build link-person payload from the current dialog role selection.
 * `person` contributes partner_id only — never role / existing relationship metadata.
 */
export function relationshipFormToLinkPersonPayload(
  person: Pick<PersonSearchResult, 'partner_id'>,
  values: RelationshipFormValues,
  contactPatch?: GuardianContactPatch,
): CanonicalLinkPersonAsGuardianPayload {
  const payload: CanonicalLinkPersonAsGuardianPayload = {
    partner_id: person.partner_id,
    ...relationshipFields(values),
  };
  if (contactPatch && Object.keys(contactPatch).length > 0) {
    payload.contact_patch = contactPatch;
  }
  return payload;
}

export function relationshipFormToCreatePayload(
  guardianId: number,
  values: RelationshipFormValues,
): CanonicalGuardianRelationshipCreatePayload {
  return {
    guardian_id: guardianId,
    ...relationshipFields(values),
  };
}

/**
 * Explicit allowlist update payload. Never spreads a read model / guardian / person object.
 */
export function relationshipFormToUpdatePayload(
  values: RelationshipFormValues,
): CanonicalGuardianRelationshipUpdatePayload {
  const relationshipType = resolveSelectedRelationshipType(values.relationship_type);
  const payload: CanonicalGuardianRelationshipUpdatePayload = {
    legal_status: values.legal_status,
    account_access_policy: values.account_access_policy,
    is_primary_contact: values.is_primary_contact,
    is_financial_responsible: values.is_financial_responsible,
    receives_notifications: values.receives_notifications,
    is_emergency_contact: values.is_emergency_contact,
    is_authorized_pickup: values.is_authorized_pickup,
  };
  if (relationshipType) payload.relationship_type = relationshipType;
  const priority = Number(values.contact_priority);
  if (Number.isInteger(priority) && priority > 0) payload.contact_priority = priority;
  if (values.date_start.trim()) payload.date_start = values.date_start.trim();
  if (values.notes.trim()) payload.notes = values.notes.trim();
  return payload;
}

/**
 * Pick only writable keys from an arbitrary object (defense against read-model leakage).
 * Canonical legal/access keys are validated. Legacy boolean remains accepted only when
 * an older caller sends it explicitly.
 */
export function pickGuardianRelationshipUpdateWriteFields(
  input: Record<string, unknown>,
): CanonicalGuardianRelationshipUpdatePayload {
  const payload: CanonicalGuardianRelationshipUpdatePayload = {};

  for (const key of UPDATE_WRITE_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (key === 'relationship_type') {
      const role = resolveSelectedRelationshipType(value);
      if (role) payload.relationship_type = role as RelationshipType;
      continue;
    }
    if (key === 'legal_status') {
      if (isGuardianLegalStatus(value)) payload.legal_status = value;
      continue;
    }
    if (key === 'account_access_policy') {
      if (isGuardianAccountAccessPolicy(value)) payload.account_access_policy = value;
      continue;
    }
    if (
      key === 'is_primary_contact' ||
      key === 'is_legal_guardian' ||
      key === 'is_financial_responsible' ||
      key === 'receives_notifications' ||
      key === 'is_emergency_contact' ||
      key === 'is_authorized_pickup'
    ) {
      if (typeof value === 'boolean') payload[key] = value;
      continue;
    }
    if (key === 'contact_priority') {
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        payload.contact_priority = value;
      }
      continue;
    }
    if (key === 'date_start' || key === 'notes') {
      if (typeof value === 'string' && value.trim()) payload[key] = value.trim();
    }
  }

  return payload;
}

export function assertNoGuardianUpdateReadOnlyFields(
  payload: Record<string, unknown>,
): string[] {
  return GUARDIAN_RELATIONSHIP_UPDATE_READ_ONLY_FIELDS.filter((field) => field in payload);
}
