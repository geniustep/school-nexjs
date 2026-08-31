import { describe, expect, it } from 'vitest';
import { emptyFamilyRegistrationFormState } from './family-registration-state';
import { validateFamilyRegistrationGuardiansStep } from './family-registration-payload';

const t = (key: string) => key;

describe('family registration guardian slots', () => {
  it('starts with father as primary and an optional mother card', () => {
    const state = emptyFamilyRegistrationFormState('2026-08-31');
    const mother = state.billing.guardianEntries[0];

    expect(state.guardianHost.emergencyRelationship).toBe('father');
    expect(state.billing.guardianSourceMode).toBe('new');
    expect(mother?.relationship_type).toBe('mother');
    expect(mother?.kind).toBe('new');
    expect(state.billing.additionalGuardianSourceModeByEntryKey[mother.entryKey]).toBe('new');
  });

  it('does not make the untouched mother card block a completed father', () => {
    const state = emptyFamilyRegistrationFormState('2026-08-31');
    state.guardianHost.emergencyContactName = 'Father Example';
    state.guardianHost.emergencyPhone = '0612345678';

    const result = validateFamilyRegistrationGuardiansStep(state, t);

    expect(result.valid).toBe(true);
  });

  it('validates the mother card once the user switches it to existing mode', () => {
    const state = emptyFamilyRegistrationFormState('2026-08-31');
    state.guardianHost.emergencyContactName = 'Father Example';
    state.guardianHost.emergencyPhone = '0612345678';
    const mother = state.billing.guardianEntries[0];
    state.billing.additionalGuardianSourceModeByEntryKey[mother.entryKey] = 'existing';

    const result = validateFamilyRegistrationGuardiansStep(state, t);

    expect(result.valid).toBe(false);
    expect(result.errors.billingErrors?.additionalGuardianErrorsByEntryKey?.[mother.entryKey]).toBeTruthy();
  });
});
