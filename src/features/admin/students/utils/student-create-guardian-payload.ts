import type { BillingResponsibilityRequest } from '@/types/billing-responsibility';
import type {
  PersonSearchResult,
  RelationshipType,
  StudentCreateGuardianRelationshipItem,
  StudentCreatePayload,
} from '@/types/student-360';
import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import type { StudentProfileFormState } from './student-profile';
import { buildBillingResponsibilityRequest } from './student-create-billing-responsibility';
import { relationshipTypeLabel } from './relationship-types';
import {
  isCompleteStudentCreateGuardianEntry,
  validateAdditionalGuardianEntries,
  type AdditionalGuardianValidationErrors,
} from './student-create-additional-guardians';

function trim(value: string | undefined | null): string {
  return (value ?? '').trim();
}

export function resolvePersonSchoolParentId(person: Pick<PersonSearchResult, 'guardian_id' | 'id' | 'partner_id'>): number | null {
  if (typeof person.guardian_id === 'number' && person.guardian_id > 0) {
    return person.guardian_id;
  }
  if (
    typeof person.id === 'number' &&
    person.id > 0 &&
    person.id !== person.partner_id
  ) {
    return person.id;
  }
  return null;
}

export function derivePrimaryStudentCreateGuardianEntry(
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
): StudentCreateGuardianEntry | null {
  if (billingState.guardianSourceMode === 'existing') {
    if (billingState.linkedGuardianId == null) return null;
    const displayName = trim(profileState.emergencyContactName);
    return {
      kind: 'existing',
      entryKey: `existing-${billingState.linkedGuardianId}`,
      guardian_id: billingState.linkedGuardianId,
      displayName: displayName || '—',
      relationship_type: (trim(profileState.emergencyRelationship) || 'father') as RelationshipType,
      is_primary_contact: true,
      phone: trim(profileState.emergencyPhone) || undefined,
      email: trim(profileState.guardianEmail) || undefined,
    };
  }

  const fullName = trim(profileState.emergencyContactName);
  if (!fullName) return null;

  return {
    kind: 'new',
    entryKey: 'new-primary',
    full_name: fullName,
    phone: trim(profileState.emergencyPhone) || undefined,
    email: trim(profileState.guardianEmail) || undefined,
    relationship_type: (trim(profileState.emergencyRelationship) || 'father') as RelationshipType,
    is_primary_contact: true,
  };
}

export function collectStudentCreateGuardianEntries(
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
  options?: { completeOnly?: boolean },
): StudentCreateGuardianEntry[] {
  const primary = derivePrimaryStudentCreateGuardianEntry(profileState, billingState);
  const additional = billingState.guardianEntries.filter(
    (entry) => entry.entryKey !== primary?.entryKey,
  );
  const entries = primary ? [primary, ...additional] : additional;
  if (options?.completeOnly) {
    return entries.filter(isCompleteStudentCreateGuardianEntry);
  }
  return entries;
}

export function resolveBillingGuardianEntryKey(
  entries: StudentCreateGuardianEntry[],
  billingState: StudentCreateBillingFormState,
): string | null {
  if (billingState.responsibilitySelection !== 'guardian') return null;
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0].entryKey;
  return billingState.billingGuardianEntryKey;
}

export function buildStudentCreateGuardianRelationships(
  entries: StudentCreateGuardianEntry[],
  billingGuardianEntryKey: string | null,
  provisionAccessByEntryKey: Record<string, boolean> = {},
): StudentCreateGuardianRelationshipItem[] {
  return entries.map((entry) => {
    const isFinancialResponsible =
      billingGuardianEntryKey != null && entry.entryKey === billingGuardianEntryKey;
    const provisionAccess = provisionAccessByEntryKey[entry.entryKey] === true;

    const relationshipFlags = {
      relationship_type: entry.relationship_type,
      is_primary_contact: entry.is_primary_contact,
      is_financial_responsible: isFinancialResponsible,
      is_emergency_contact: entry.is_primary_contact,
      receives_notifications: true,
      ...(provisionAccess ? { provision_access: true as const } : {}),
    };

    if (entry.kind === 'existing') {
      return {
        guardian_id: entry.guardian_id,
        ...relationshipFlags,
      };
    }

    return {
      guardian: {
        full_name: entry.full_name,
        ...(entry.phone ? { phone: entry.phone } : {}),
        ...(entry.email ? { email: entry.email } : {}),
      },
      ...relationshipFlags,
    };
  });
}

export function buildStudentCreateBillingResponsibilityRequest(
  billingState: StudentCreateBillingFormState,
  entries: StudentCreateGuardianEntry[],
  billingGuardianEntryKey: string | null,
): BillingResponsibilityRequest | null {
  const base = buildBillingResponsibilityRequest(billingState);
  if (!base) return null;
  if (base.mode === 'student') return base;

  const billingEntry =
    billingGuardianEntryKey != null
      ? entries.find((entry) => entry.entryKey === billingGuardianEntryKey)
      : undefined;

  if (billingEntry?.kind === 'existing') {
    return {
      mode: 'guardian',
      billing_guardian_id: billingEntry.guardian_id,
    };
  }

  return { mode: 'guardian' };
}

export function shouldSendGuardianRelationshipsAtomically(
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
): boolean {
  if (billingState.responsibilitySelection === 'student') {
    return collectStudentCreateGuardianEntries(profileState, billingState).length > 0;
  }
  return collectStudentCreateGuardianEntries(profileState, billingState).length > 0;
}

export function applyStudentCreateGuardianAtomicContractToPayload(
  payload: StudentCreatePayload,
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
): StudentCreatePayload {
  const entries = collectStudentCreateGuardianEntries(profileState, billingState, {
    completeOnly: true,
  });
  const billingGuardianEntryKey = resolveBillingGuardianEntryKey(entries, billingState);
  const billingResponsibility = buildStudentCreateBillingResponsibilityRequest(
    billingState,
    entries,
    billingGuardianEntryKey,
  );

  const next: StudentCreatePayload = { ...payload };
  if (billingResponsibility) {
    next.billing_responsibility = billingResponsibility;
  }

  if (entries.length > 0) {
    next.guardian_relationships = buildStudentCreateGuardianRelationships(
      entries,
      billingGuardianEntryKey,
      billingState.provisionAccessByEntryKey,
    );
  }

  return next;
}

export function hasAtomicallySubmittedGuardians(payload: StudentCreatePayload): boolean {
  return Array.isArray(payload.guardian_relationships) && payload.guardian_relationships.length > 0;
}

export type StudentCreateGuardianValidationErrors = {
  billingGuardianSelection?: string;
  guardianRequired?: string;
} & AdditionalGuardianValidationErrors;

export function validateStudentCreateGuardianContract(
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
  t: (key: string) => string,
): { valid: boolean; errors: StudentCreateGuardianValidationErrors; message?: string } {
  const errors: StudentCreateGuardianValidationErrors = {};

  if (billingState.responsibilitySelection !== 'guardian') {
    const additionalValidation = validateAdditionalGuardianEntries(profileState, billingState, t);
    if (!additionalValidation.valid) {
      return {
        valid: false,
        errors: { ...errors, ...additionalValidation.errors },
        message:
          additionalValidation.errors.duplicateGuardianId ??
          Object.values(additionalValidation.errors.additionalGuardianErrorsByEntryKey ?? {})[0],
      };
    }
    return { valid: true, errors };
  }

  const entries = collectStudentCreateGuardianEntries(profileState, billingState, {
    completeOnly: true,
  });
  if (entries.length === 0) {
    const message = t('admin.student360.create.billingResponsibility.errors.guardianRequired');
    errors.guardianRequired = message;
    return { valid: false, errors, message };
  }

  const additionalValidation = validateAdditionalGuardianEntries(profileState, billingState, t);
  if (!additionalValidation.valid) {
    return {
      valid: false,
      errors: { ...errors, ...additionalValidation.errors },
      message:
        additionalValidation.errors.duplicateGuardianId ??
        Object.values(additionalValidation.errors.additionalGuardianErrorsByEntryKey ?? {})[0],
    };
  }

  if (entries.length > 1 && !billingState.billingGuardianEntryKey) {
    const message = t('admin.student360.create.billingResponsibility.errors.billingGuardianSelectionRequired');
    errors.billingGuardianSelection = message;
    return { valid: false, errors, message };
  }

  return { valid: true, errors };
}

export function guardianEntryLabel(entry: StudentCreateGuardianEntry): string {
  return entry.kind === 'existing' ? entry.displayName : entry.full_name;
}

export function guardianEntryBillingOptionLabel(
  entry: StudentCreateGuardianEntry,
  t: (key: string) => string,
): string {
  const name = guardianEntryLabel(entry);
  const relationship = relationshipTypeLabel(t, entry.relationship_type);
  return `${name} — ${relationship}`;
}
