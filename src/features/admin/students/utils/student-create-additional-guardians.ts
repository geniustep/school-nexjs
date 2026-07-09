import type { RelationshipType } from '@/types/student-360';
import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
  StudentCreateGuardianSourceMode,
} from '@/types/student-enrollment-finance';
import type { StudentProfileFormState } from './student-profile';
import {
  collectStudentCreateGuardianEntries,
  derivePrimaryStudentCreateGuardianEntry,
} from './student-create-guardian-payload';

let additionalGuardianKeySeq = 0;

export function createAdditionalGuardianEntryKey(): string {
  additionalGuardianKeySeq += 1;
  return `additional-${Date.now()}-${additionalGuardianKeySeq}`;
}

export function createEmptyAdditionalGuardianEntry(
  relationshipType: RelationshipType = 'mother',
): StudentCreateGuardianEntry {
  return {
    kind: 'new',
    entryKey: createAdditionalGuardianEntryKey(),
    full_name: '',
    relationship_type: relationshipType,
    is_primary_contact: false,
  };
}

function trim(value: string | undefined | null): string {
  return (value ?? '').trim();
}

export function isCompleteStudentCreateGuardianEntry(entry: StudentCreateGuardianEntry): boolean {
  if (entry.kind === 'existing') {
    return entry.guardian_id > 0 && trim(entry.displayName).length > 0;
  }
  return trim(entry.full_name).length > 0;
}

export function collectCompleteStudentCreateGuardianEntries(
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
): StudentCreateGuardianEntry[] {
  return collectStudentCreateGuardianEntries(profileState, billingState).filter(
    isCompleteStudentCreateGuardianEntry,
  );
}

export function collectUsedGuardianIds(
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
): Set<number> {
  return new Set(collectExistingGuardianIdsFromWizard(profileState, billingState));
}

export function findDuplicateGuardianId(ids: number[]): number | null {
  const seen = new Set<number>();
  for (const id of ids) {
    if (id <= 0) continue;
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

export function collectExistingGuardianIdsFromWizard(
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
): number[] {
  const ids: number[] = [];
  const primary = derivePrimaryStudentCreateGuardianEntry(profileState, billingState);
  if (primary?.kind === 'existing') {
    ids.push(primary.guardian_id);
  }
  for (const entry of billingState.guardianEntries) {
    if (entry.kind === 'existing' && entry.guardian_id > 0) {
      ids.push(entry.guardian_id);
    }
  }
  return ids;
}

export function resolveAdditionalGuardianSourceMode(
  entry: StudentCreateGuardianEntry,
  billingState: StudentCreateBillingFormState,
): StudentCreateGuardianSourceMode {
  if (entry.kind === 'existing') return 'existing';
  return billingState.additionalGuardianSourceModeByEntryKey[entry.entryKey] ?? 'new';
}

export type AdditionalGuardianValidationErrors = {
  duplicateGuardianId?: string;
  additionalGuardianErrorsByEntryKey?: Record<string, string>;
};

export function validateAdditionalGuardianEntries(
  profileState: StudentProfileFormState,
  billingState: StudentCreateBillingFormState,
  t: (key: string) => string,
): { valid: boolean; errors: AdditionalGuardianValidationErrors } {
  const errors: AdditionalGuardianValidationErrors = {};
  const entryErrors: Record<string, string> = {};

  for (const entry of billingState.guardianEntries) {
    if (!isCompleteStudentCreateGuardianEntry(entry)) {
      entryErrors[entry.entryKey] = t(
        'admin.student360.create.billingResponsibility.errors.additionalGuardianIncomplete',
      );
    }
  }

  const duplicateId = findDuplicateGuardianId(
    collectExistingGuardianIdsFromWizard(profileState, billingState),
  );
  if (duplicateId != null) {
    errors.duplicateGuardianId = t(
      'admin.student360.create.billingResponsibility.errors.duplicateGuardianInWizard',
    );
  }

  if (Object.keys(entryErrors).length > 0) {
    errors.additionalGuardianErrorsByEntryKey = entryErrors;
  }

  const valid =
    duplicateId == null && Object.keys(entryErrors).length === 0;
  return { valid, errors };
}

export function entryFromLinkedExistingGuardian(
  entryKey: string,
  guardianId: number,
  displayName: string,
  relationshipType: RelationshipType,
  phone?: string,
  email?: string,
): StudentCreateGuardianEntry {
  return {
    kind: 'existing',
    entryKey,
    guardian_id: guardianId,
    displayName,
    relationship_type: relationshipType,
    is_primary_contact: false,
    phone,
    email,
  };
}
