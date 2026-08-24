import { describe, expect, it } from 'vitest';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';
import { defaultStudentCreateBillingFormState } from './student-create-billing-responsibility';
import {
  requiresExplicitBillingGuardianChoice,
  resolveBillingResponsibilityAutoPatch,
} from './student-create-billing-auto-select';

const primary: StudentCreateGuardianEntry = {
  kind: 'new',
  entryKey: 'new-primary',
  full_name: 'فاطمة',
  relationship_type: 'mother',
  is_primary_contact: true,
};

const secondary: StudentCreateGuardianEntry = {
  kind: 'existing',
  entryKey: 'existing-702',
  guardian_id: 702,
  displayName: 'حسن',
  relationship_type: 'father',
  is_primary_contact: false,
};

describe('resolveBillingResponsibilityAutoPatch', () => {
  it('auto-selects guardian mode for a single clear eligible guardian', () => {
    const billing = defaultStudentCreateBillingFormState();
    expect(billing.responsibilitySelection).toBe('guardian');
    const patch = resolveBillingResponsibilityAutoPatch([primary], billing);
    expect(patch).toEqual({
      billingGuardianEntryKey: 'new-primary',
    });
  });

  it('does not silently pick among multiple guardians', () => {
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'guardian' as const,
    };
    const patch = resolveBillingResponsibilityAutoPatch([primary, secondary], billing);
    expect(patch).toBeNull();
    expect(requiresExplicitBillingGuardianChoice([primary, secondary], billing)).toBe(true);
  });

  it('clears stale billing guardian key when it no longer matches', () => {
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'guardian' as const,
      billingGuardianEntryKey: 'missing-key',
    };
    const patch = resolveBillingResponsibilityAutoPatch([primary, secondary], billing);
    expect(patch).toEqual({ billingGuardianEntryKey: null });
  });
});

