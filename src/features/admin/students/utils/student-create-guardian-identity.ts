import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import {
  buildIdentityDocumentCreatePayload,
  emptyIdentityDocumentFormValues,
  validateIdentityDocumentForm,
  type IdentityDocumentFieldErrors,
  type IdentityDocumentFormValues,
} from '@/features/admin/parents/utils/identity-document';
import type { IdentityDocumentWriteFields } from '@/types/identity-document';

export type StudentCreateGuardianEntryWithIdentity = StudentCreateGuardianEntry & {
  identityDocument?: IdentityDocumentFormValues;
};

export type StudentCreateBillingStateWithGuardianIdentity = StudentCreateBillingFormState & {
  primaryGuardianIdentity?: IdentityDocumentFormValues;
};

export interface StudentCreateGuardianIdentityValidationErrors {
  primaryGuardianIdentityErrors?: IdentityDocumentFieldErrors;
  additionalGuardianIdentityErrorsByEntryKey?: Record<string, IdentityDocumentFieldErrors>;
}

export function guardianEntryWithIdentity(
  entry: StudentCreateGuardianEntry,
): StudentCreateGuardianEntryWithIdentity {
  return entry as StudentCreateGuardianEntryWithIdentity;
}

export function billingStateWithGuardianIdentity(
  billingState: StudentCreateBillingFormState,
): StudentCreateBillingStateWithGuardianIdentity {
  return billingState as StudentCreateBillingStateWithGuardianIdentity;
}

export function resolvePrimaryGuardianIdentity(
  billingState: StudentCreateBillingFormState,
): IdentityDocumentFormValues {
  return (
    billingStateWithGuardianIdentity(billingState).primaryGuardianIdentity ??
    emptyIdentityDocumentFormValues()
  );
}

export function resolveGuardianEntryIdentity(
  entry: StudentCreateGuardianEntry,
): IdentityDocumentFormValues {
  return guardianEntryWithIdentity(entry).identityDocument ?? emptyIdentityDocumentFormValues();
}

export function guardianIdentityWriteFields(
  entry: StudentCreateGuardianEntry,
): IdentityDocumentWriteFields {
  if (entry.kind !== 'new') return {};
  return buildIdentityDocumentCreatePayload(resolveGuardianEntryIdentity(entry)) ?? {};
}

function firstIdentityError(errors: IdentityDocumentFieldErrors): string | undefined {
  return errors.type ?? errors.number ?? errors.country;
}

export function validateStudentCreateGuardianIdentities(
  billingState: StudentCreateBillingFormState,
  t: (key: string) => string,
): {
  valid: boolean;
  errors: StudentCreateGuardianIdentityValidationErrors;
  message?: string;
} {
  const errors: StudentCreateGuardianIdentityValidationErrors = {};
  let message: string | undefined;

  if (billingState.guardianSourceMode === 'new') {
    const primaryErrors = validateIdentityDocumentForm(resolvePrimaryGuardianIdentity(billingState), t);
    if (Object.keys(primaryErrors).length > 0) {
      errors.primaryGuardianIdentityErrors = primaryErrors;
      message = firstIdentityError(primaryErrors);
    }
  }

  const additionalErrors: Record<string, IdentityDocumentFieldErrors> = {};
  for (const entry of billingState.guardianEntries) {
    const sourceMode =
      billingState.additionalGuardianSourceModeByEntryKey[entry.entryKey] ??
      (entry.kind === 'existing' ? 'existing' : 'new');
    if (sourceMode !== 'new' || entry.kind !== 'new') continue;
    const entryErrors = validateIdentityDocumentForm(resolveGuardianEntryIdentity(entry), t);
    if (Object.keys(entryErrors).length === 0) continue;
    additionalErrors[entry.entryKey] = entryErrors;
    message ??= firstIdentityError(entryErrors);
  }

  if (Object.keys(additionalErrors).length > 0) {
    errors.additionalGuardianIdentityErrorsByEntryKey = additionalErrors;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    message,
  };
}
