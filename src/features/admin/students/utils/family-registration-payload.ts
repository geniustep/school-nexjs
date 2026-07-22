import type { StudentClassOption, StudentCreatePayload } from '@/types/student-360';
import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import {
  applyStudentCreateGuardianAtomicContractToPayload,
  collectStudentCreateGuardianEntries,
  validateStudentCreateGuardianContract,
} from './student-create-guardian-payload';
import {
  validateBillingResponsibilityForm,
  type BillingResponsibilityFieldErrors,
} from './student-create-billing-responsibility';
import {
  buildStudentCreatePayload,
  validateStudentCreateForm,
  validateStudentCreateIdentityStep,
  type StudentProfileFieldErrors,
  type StudentProfileFormState,
} from './student-profile';
import {
  childDisplayName,
  guardiansForChild,
  type FamilyRegistrationChildState,
  type FamilyRegistrationFormState,
} from './family-registration-state';
import { isCompleteStudentCreateGuardianEntry } from './student-create-additional-guardians';
import type { StudentCreateGuardianValidationErrors } from './student-create-guardian-payload';

function trim(value: string | undefined | null): string {
  return (value ?? '').trim();
}

/**
 * Build a profile that carries child identity/enrollment plus family guardian
 * contact fields so existing atomic payload helpers stay unchanged.
 */
export function buildFamilyChildProfileForPayload(
  childProfile: StudentProfileFormState,
  guardianHost: StudentProfileFormState,
): StudentProfileFormState {
  return {
    ...childProfile,
    emergencyContactName: trim(guardianHost.emergencyContactName),
    emergencyRelationship: trim(guardianHost.emergencyRelationship) || 'father',
    emergencyPhone: trim(guardianHost.emergencyPhone),
    guardianEmail: trim(guardianHost.guardianEmail),
    residenceAddress:
      trim(childProfile.residenceAddress) || trim(guardianHost.residenceAddress),
  };
}

export function buildFamilyChildCreatePayload(options: {
  child: FamilyRegistrationChildState;
  guardianHost: StudentProfileFormState;
  billing: StudentCreateBillingFormState;
  guardianEntries: StudentCreateGuardianEntry[];
  schoolId: number | null;
  classes?: StudentClassOption[];
}): StudentCreatePayload {
  const { child, guardianHost, billing, guardianEntries, schoolId } = options;
  const entriesForChild = guardiansForChild(
    guardianEntries,
    child.relationshipByEntryKey,
  );
  const profile = buildFamilyChildProfileForPayload(child.profile, guardianHost);

  // Primary guardian lives on profile + billing source mode; additional in guardianEntries.
  // Rebuild billing so guardianEntries match per-child relationship overrides.
  const primaryEntry = entriesForChild.find((e) => e.is_primary_contact) ?? entriesForChild[0];
  const additional = entriesForChild.filter((e) => e.entryKey !== primaryEntry?.entryKey);

  const billingForChild: StudentCreateBillingFormState = {
    ...billing,
    guardianEntries: additional,
  };

  if (primaryEntry?.kind === 'existing') {
    billingForChild.guardianSourceMode = 'existing';
    billingForChild.linkedGuardianId = primaryEntry.guardian_id;
    profile.emergencyContactName = primaryEntry.displayName;
    profile.emergencyRelationship = primaryEntry.relationship_type;
    profile.emergencyPhone = primaryEntry.phone ?? profile.emergencyPhone;
    profile.guardianEmail = primaryEntry.email ?? profile.guardianEmail;
  } else if (primaryEntry?.kind === 'new') {
    billingForChild.guardianSourceMode = 'new';
    billingForChild.linkedGuardianId = null;
    profile.emergencyContactName = primaryEntry.full_name;
    profile.emergencyRelationship = primaryEntry.relationship_type;
    profile.emergencyPhone = primaryEntry.phone ?? '';
    profile.guardianEmail = primaryEntry.email ?? '';
  }

  const base = buildStudentCreatePayload(profile, null, {
    schoolId,
    classes: options.classes ?? [],
    deferGuardianContact: true,
  });

  return applyStudentCreateGuardianAtomicContractToPayload(base, profile, billingForChild);
}

export type FamilyRegistrationValidationErrors = {
  message?: string;
  billingErrors?: BillingResponsibilityFieldErrors & StudentCreateGuardianValidationErrors;
  childErrorsByLocalId?: Record<string, StudentProfileFieldErrors>;
  focus?: 'guardians' | 'children';
};

export function validateFamilyRegistrationGuardiansStep(
  state: FamilyRegistrationFormState,
  t: (key: string) => string,
): { valid: boolean; errors: FamilyRegistrationValidationErrors } {
  const billingCheck = validateBillingResponsibilityForm(state.billing, t);
  if (!billingCheck.valid) {
    return {
      valid: false,
      errors: {
        message: billingCheck.message,
        billingErrors: billingCheck.errors,
        focus: 'guardians',
      },
    };
  }

  const profile = buildFamilyChildProfileForPayload(
    state.children[0]?.profile ?? state.guardianHost,
    state.guardianHost,
  );
  const guardianCheck = validateStudentCreateGuardianContract(
    profile,
    state.billing,
    t,
  );
  if (!guardianCheck.valid) {
    return {
      valid: false,
      errors: {
        message: guardianCheck.message,
        billingErrors: guardianCheck.errors,
        focus: 'guardians',
      },
    };
  }

  const entries = collectStudentCreateGuardianEntries(profile, state.billing, {
    completeOnly: true,
  });
  if (
    state.billing.responsibilitySelection === 'guardian' &&
    entries.length === 0
  ) {
    const message = t('admin.student360.create.billingResponsibility.errors.guardianRequired');
    return {
      valid: false,
      errors: {
        message,
        billingErrors: { guardianRequired: message },
        focus: 'guardians',
      },
    };
  }

  if (
    state.billing.responsibilitySelection === 'guardian' &&
    entries.length > 1 &&
    !state.billing.billingGuardianEntryKey
  ) {
    const message = t(
      'admin.student360.create.billingResponsibility.errors.billingGuardianSelectionRequired',
    );
    return {
      valid: false,
      errors: {
        message,
        billingErrors: { billingGuardianSelection: message },
        focus: 'guardians',
      },
    };
  }

  return { valid: true, errors: {} };
}

export function validateFamilyRegistrationChildrenStep(
  state: FamilyRegistrationFormState,
  t: (key: string, params?: Record<string, string | number>) => string,
): { valid: boolean; errors: FamilyRegistrationValidationErrors } {
  if (state.children.length < 1) {
    return {
      valid: false,
      errors: {
        message: t('admin.student360.familyRegistration.errors.childrenRequired'),
        focus: 'children',
      },
    };
  }

  const childErrorsByLocalId: Record<string, StudentProfileFieldErrors> = {};
  for (const child of state.children) {
    const identity = validateStudentCreateIdentityStep(child.profile, t);
    const enrollment = validateStudentCreateForm(child.profile, t);
    const merged: StudentProfileFieldErrors = {
      ...identity.errors,
      ...enrollment.errors,
    };
    if (Object.keys(merged).length > 0) {
      childErrorsByLocalId[child.localId] = merged;
    }
  }

  if (Object.keys(childErrorsByLocalId).length > 0) {
    const firstId = Object.keys(childErrorsByLocalId)[0];
    const firstChild = state.children.find((c) => c.localId === firstId);
    return {
      valid: false,
      errors: {
        message: t('admin.student360.familyRegistration.errors.childIncomplete', {
          name: firstChild ? childDisplayName(firstChild.profile) : '—',
        }),
        childErrorsByLocalId,
        focus: 'children',
      },
    };
  }

  return { valid: true, errors: {} };
}

export function collectFamilyGuardianEntries(
  state: FamilyRegistrationFormState,
): StudentCreateGuardianEntry[] {
  const profile = buildFamilyChildProfileForPayload(
    state.children[0]?.profile ?? state.guardianHost,
    state.guardianHost,
  );
  return collectStudentCreateGuardianEntries(profile, state.billing, {
    completeOnly: true,
  }).filter(isCompleteStudentCreateGuardianEntry);
}

export function summarizeFamilyRegistration(state: FamilyRegistrationFormState) {
  const guardians = collectFamilyGuardianEntries(state);
  const billingEntry =
    state.billing.responsibilitySelection === 'student'
      ? null
      : guardians.find((g) => g.entryKey === state.billing.billingGuardianEntryKey) ??
        (guardians.length === 1 ? guardians[0] : null);

  return {
    guardians,
    children: state.children.map((child) => ({
      localId: child.localId,
      displayName: childDisplayName(child.profile),
      cycleId: child.profile.cycleId,
      levelId: child.profile.levelId,
      classId: child.profile.classId,
      relationships: guardiansForChild(guardians, child.relationshipByEntryKey).map(
        (entry) => ({
          entryKey: entry.entryKey,
          name:
            entry.kind === 'existing' ? entry.displayName : entry.full_name,
          relationship_type: entry.relationship_type,
          kind: entry.kind,
        }),
      ),
    })),
    billingMode: state.billing.responsibilitySelection,
    billingGuardianName: billingEntry
      ? billingEntry.kind === 'existing'
        ? billingEntry.displayName
        : billingEntry.full_name
      : state.billing.responsibilitySelection === 'student'
        ? 'student'
        : null,
    missingBillingGuardian:
      state.billing.responsibilitySelection === 'guardian' &&
      guardians.length > 1 &&
      !state.billing.billingGuardianEntryKey,
  };
}
