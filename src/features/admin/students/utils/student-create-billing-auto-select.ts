import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import { isCompleteStudentCreateGuardianEntry } from './student-create-additional-guardians';

/**
 * Auto-select مسؤول الأداء only when there is a single clear eligible guardian.
 * Never silently pick among multiple candidates.
 */
export function resolveBillingResponsibilityAutoPatch(
  entries: StudentCreateGuardianEntry[],
  billingState: StudentCreateBillingFormState,
): Partial<StudentCreateBillingFormState> | null {
  const complete = entries.filter(isCompleteStudentCreateGuardianEntry);

  if (complete.length === 1) {
    const only = complete[0];
    const patch: Partial<StudentCreateBillingFormState> = {};
    if (billingState.responsibilitySelection === 'needs_selection') {
      patch.responsibilitySelection = 'guardian';
    }
    if (
      billingState.responsibilitySelection !== 'student' &&
      billingState.billingGuardianEntryKey !== only.entryKey
    ) {
      patch.billingGuardianEntryKey = only.entryKey;
    }
    return Object.keys(patch).length > 0 ? patch : null;
  }

  if (complete.length > 1) {
    const selectedStillValid =
      billingState.billingGuardianEntryKey != null &&
      complete.some((entry) => entry.entryKey === billingState.billingGuardianEntryKey);
    if (
      billingState.responsibilitySelection === 'guardian' &&
      !selectedStillValid &&
      billingState.billingGuardianEntryKey != null
    ) {
      return { billingGuardianEntryKey: null };
    }
  }

  return null;
}

export function requiresExplicitBillingGuardianChoice(
  entries: StudentCreateGuardianEntry[],
  billingState: StudentCreateBillingFormState,
): boolean {
  if (billingState.responsibilitySelection !== 'guardian') return false;
  const complete = entries.filter(isCompleteStudentCreateGuardianEntry);
  return complete.length > 1 && !billingState.billingGuardianEntryKey;
}
