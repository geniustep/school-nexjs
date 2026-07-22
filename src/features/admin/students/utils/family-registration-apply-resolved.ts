import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import type { StudentProfileFormState } from './student-profile';

/**
 * Persist resolved school.parent ids into the family form so failed-only retries
 * never re-nest new guardian identities after a sibling already succeeded.
 */
export function applyResolvedGuardiansToFamilyForm(options: {
  guardianHost: StudentProfileFormState;
  billing: StudentCreateBillingFormState;
  resolvedEntries: StudentCreateGuardianEntry[];
}): { guardianHost: StudentProfileFormState; billing: StudentCreateBillingFormState } {
  const { resolvedEntries } = options;
  if (resolvedEntries.length === 0) {
    return { guardianHost: options.guardianHost, billing: options.billing };
  }

  const primary =
    resolvedEntries.find((entry) => entry.is_primary_contact) ?? resolvedEntries[0];
  const additional = resolvedEntries.filter((entry) => entry.entryKey !== primary.entryKey);

  let guardianHost = { ...options.guardianHost };
  let billing: StudentCreateBillingFormState = {
    ...options.billing,
    guardianEntries: additional,
  };

  if (primary.kind === 'existing') {
    billing = {
      ...billing,
      guardianSourceMode: 'existing',
      linkedGuardianId: primary.guardian_id,
    };
    guardianHost = {
      ...guardianHost,
      emergencyContactName: primary.displayName,
      emergencyRelationship: primary.relationship_type,
      emergencyPhone: primary.phone ?? guardianHost.emergencyPhone,
      guardianEmail: primary.email ?? guardianHost.guardianEmail,
    };
  } else {
    billing = {
      ...billing,
      guardianSourceMode: 'new',
      linkedGuardianId: null,
    };
    guardianHost = {
      ...guardianHost,
      emergencyContactName: primary.full_name,
      emergencyRelationship: primary.relationship_type,
      emergencyPhone: primary.phone ?? '',
      guardianEmail: primary.email ?? '',
    };
  }

  if (
    billing.responsibilitySelection === 'guardian' &&
    resolvedEntries.length === 1
  ) {
    billing = { ...billing, billingGuardianEntryKey: primary.entryKey };
  }

  return { guardianHost, billing };
}
