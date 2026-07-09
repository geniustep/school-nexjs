import { describe, expect, it } from 'vitest';
import {
  collectCompleteStudentCreateGuardianEntries,
  collectUsedGuardianIds,
  createAdditionalGuardianEntryKey,
  createEmptyAdditionalGuardianEntry,
  entryFromLinkedExistingGuardian,
  findDuplicateGuardianId,
  isCompleteStudentCreateGuardianEntry,
  validateAdditionalGuardianEntries,
} from './student-create-additional-guardians';
import { defaultStudentCreateBillingFormState } from './student-create-billing-responsibility';
import { defaultStudentProfileFormState } from './student-profile';
import {
  applyStudentCreateGuardianAtomicContractToPayload,
  buildStudentCreateGuardianRelationships,
  collectStudentCreateGuardianEntries,
} from './student-create-guardian-payload';
import { buildStudentCreatePayload } from './student-profile';

const t = (key: string) => key;

function profileWithGuardian() {
  return {
    ...defaultStudentProfileFormState(null),
    emergencyContactName: 'Fatima Alami',
    emergencyPhone: '0612345678',
    emergencyRelationship: 'mother',
    guardianEmail: 'fatima@example.com',
  };
}

describe('student-create-additional-guardians', () => {
  it('generates stable unique entry keys', () => {
    const a = createAdditionalGuardianEntryKey();
    const b = createAdditionalGuardianEntryKey();
    expect(a).not.toBe(b);
    expect(a.startsWith('additional-')).toBe(true);
  });

  it('detects duplicate guardian ids in wizard state', () => {
    expect(findDuplicateGuardianId([701, 702, 701])).toBe(701);
    expect(findDuplicateGuardianId([701, 702])).toBeNull();
  });

  it('tracks used guardian ids across primary and additional entries', () => {
    const billingState = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'existing' as const,
      linkedGuardianId: 701,
      guardianEntries: [
        entryFromLinkedExistingGuardian('additional-1', 702, 'Hassan', 'father'),
      ],
    };
    const used = collectUsedGuardianIds(profileWithGuardian(), billingState);
    expect([...used].sort()).toEqual([701, 702]);
  });

  it('rejects incomplete additional guardians', () => {
    const billingState = {
      ...defaultStudentCreateBillingFormState(),
      guardianEntries: [createEmptyAdditionalGuardianEntry()],
    };
    const result = validateAdditionalGuardianEntries(profileWithGuardian(), billingState, t);
    expect(result.valid).toBe(false);
    expect(result.errors.additionalGuardianErrorsByEntryKey).toBeDefined();
  });

  it('rejects duplicate guardian selection in wizard', () => {
    const billingState = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'existing' as const,
      linkedGuardianId: 701,
      guardianEntries: [
        entryFromLinkedExistingGuardian('additional-1', 701, 'Fatima duplicate', 'father'),
      ],
    };
    const result = validateAdditionalGuardianEntries(profileWithGuardian(), billingState, t);
    expect(result.valid).toBe(false);
    expect(result.errors.duplicateGuardianId).toBeTruthy();
  });
});

describe('multi-guardian payload adapter', () => {
  it('sends two new guardians with billing guardian on second entry', () => {
    const additionalKey = 'additional-second';
    const billingState = {
      ...defaultStudentCreateBillingFormState(),
      billingGuardianEntryKey: additionalKey,
      guardianEntries: [
        {
          kind: 'new' as const,
          entryKey: additionalKey,
          full_name: 'Hassan Alami',
          phone: '0699999999',
          relationship_type: 'father' as const,
          is_primary_contact: false,
        },
      ],
    };
    const entries = collectCompleteStudentCreateGuardianEntries(profileWithGuardian(), billingState);
    expect(entries).toHaveLength(2);

    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profileWithGuardian(), null, { deferGuardianContact: true }),
      profileWithGuardian(),
      billingState,
    );

    expect(payload.guardian_relationships).toHaveLength(2);
    expect(payload.guardian_relationships?.[0]).toMatchObject({
      guardian: { full_name: 'Fatima Alami' },
      is_financial_responsible: false,
    });
    expect(payload.guardian_relationships?.[1]).toMatchObject({
      guardian: { full_name: 'Hassan Alami' },
      relationship_type: 'father',
      is_financial_responsible: true,
    });
    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });
  });

  it('sends existing + new guardians with billing_guardian_id for existing additional guardian', () => {
    const billingState = {
      ...defaultStudentCreateBillingFormState(),
      billingGuardianEntryKey: 'existing-702',
      guardianEntries: [
        entryFromLinkedExistingGuardian('existing-702', 702, 'Hassan', 'father'),
      ],
    };
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profileWithGuardian(), null, { deferGuardianContact: true }),
      profileWithGuardian(),
      billingState,
    );

    expect(payload.billing_responsibility).toEqual({
      mode: 'guardian',
      billing_guardian_id: 702,
    });
    expect(payload.guardian_relationships?.[1]).toMatchObject({
      guardian_id: 702,
      is_financial_responsible: true,
    });
  });

  it('omits incomplete additional guardians from atomic payload', () => {
    const billingState = {
      ...defaultStudentCreateBillingFormState(),
      guardianEntries: [createEmptyAdditionalGuardianEntry()],
    };
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profileWithGuardian(), null, { deferGuardianContact: true }),
      profileWithGuardian(),
      billingState,
    );
    expect(payload.guardian_relationships).toHaveLength(1);
  });

  it('sends provision_access only for opted-in guardian among two', () => {
    const additionalKey = 'additional-second';
    const billingState = {
      ...defaultStudentCreateBillingFormState(),
      guardianEntries: [
        {
          kind: 'new' as const,
          entryKey: additionalKey,
          full_name: 'Hassan Alami',
          relationship_type: 'father' as const,
          is_primary_contact: false,
        },
      ],
      provisionAccessByEntryKey: { [additionalKey]: true },
    };
    const entries = collectStudentCreateGuardianEntries(profileWithGuardian(), billingState, {
      completeOnly: true,
    });
    const relationships = buildStudentCreateGuardianRelationships(
      entries,
      'new-primary',
      billingState.provisionAccessByEntryKey,
    );
    expect(relationships[0]).not.toHaveProperty('provision_access');
    expect(relationships[1]).toMatchObject({ provision_access: true });
  });
});

describe('isCompleteStudentCreateGuardianEntry', () => {
  it('requires name for new guardians and guardian_id for existing', () => {
    expect(
      isCompleteStudentCreateGuardianEntry({
        kind: 'new',
        entryKey: 'x',
        full_name: '',
        relationship_type: 'mother',
        is_primary_contact: false,
      }),
    ).toBe(false);
    expect(
      isCompleteStudentCreateGuardianEntry(
        entryFromLinkedExistingGuardian('existing-1', 701, 'Parent', 'mother'),
      ),
    ).toBe(true);
  });
});
