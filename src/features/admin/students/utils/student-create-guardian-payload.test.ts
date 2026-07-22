import { describe, expect, it } from 'vitest';
import {
  applyStudentCreateGuardianAtomicContractToPayload,
  buildStudentCreateGuardianRelationships,
  buildStudentCreateBillingResponsibilityRequest,
  collectStudentCreateGuardianEntries,
  resolveBillingGuardianEntryKey,
  resolvePersonSchoolParentId,
  validateStudentCreateGuardianContract,
} from './student-create-guardian-payload';
import { buildStudentCreatePayload, defaultStudentProfileFormState } from './student-profile';
import { defaultStudentCreateBillingFormState } from './student-create-billing-responsibility';
import type { PersonSearchResult } from '@/types/student-360';

const t = (key: string) => key;

function profileWithGuardian(overrides: Partial<ReturnType<typeof defaultStudentProfileFormState>> = {}) {
  return {
    ...defaultStudentProfileFormState(null),
    emergencyContactName: 'Fatima Alami',
    emergencyPhone: '0612345678',
    emergencyRelationship: 'mother',
    guardianEmail: 'fatima@example.com',
    ...overrides,
  };
}

function billingWithNewGuardian(
  overrides: Partial<ReturnType<typeof defaultStudentCreateBillingFormState>> = {},
) {
  return {
    ...defaultStudentCreateBillingFormState(),
    guardianSourceMode: 'new' as const,
    responsibilitySelection: 'guardian' as const,
    ...overrides,
  };
}

describe('student create guardian atomic payload', () => {
  it('existing guardian uses guardian_id, not partner_id', () => {
    expect(
      resolvePersonSchoolParentId({
        partner_id: 900,
        guardian_id: 701,
        id: 701,
      }),
    ).toBe(701);

    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profileWithGuardian()),
      profileWithGuardian(),
      {
        ...defaultStudentCreateBillingFormState(),
        guardianSourceMode: 'existing',
        responsibilitySelection: 'guardian',
        linkedGuardianId: 701,
      },
    );

    expect(payload.guardian_relationships).toEqual([
      expect.objectContaining({
        guardian_id: 701,
        is_financial_responsible: true,
      }),
    ]);
    expect(payload.billing_responsibility).toEqual({
      mode: 'guardian',
      billing_guardian_id: 701,
    });
    expect(JSON.stringify(payload)).not.toContain('partner_id');
  });

  it('new guardian sends nested guardian identity inside guardian_relationships', () => {
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profileWithGuardian(), null, { deferGuardianContact: true }),
      profileWithGuardian(),
      billingWithNewGuardian(),
    );

    expect(payload.guardian_relationships).toEqual([
      {
        guardian: {
          full_name: 'Fatima Alami',
          phone: '0612345678',
          email: 'fatima@example.com',
        },
        relationship_type: 'mother',
        is_primary_contact: true,
        is_financial_responsible: true,
        is_emergency_contact: true,
        receives_notifications: true,
      },
    ]);
    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });
    expect(payload.emergency_contact_name).toBeUndefined();
  });

  it('one guardian guardian billing auto-selects financial flag without billing_guardian_id for new guardian', () => {
    const billing = billingWithNewGuardian();
    const entries = collectStudentCreateGuardianEntries(profileWithGuardian(), billing);
    const billingKey = resolveBillingGuardianEntryKey(entries, billing);
    expect(billingKey).toBe('new-primary');
    expect(buildStudentCreateGuardianRelationships(entries, billingKey)[0]).toMatchObject({
      is_financial_responsible: true,
    });
    expect(buildStudentCreateBillingResponsibilityRequest(billing, entries, billingKey)).toEqual({
      mode: 'guardian',
    });
  });

  it('multiple guardians require explicit billing selection', () => {
    const billingState = {
      ...billingWithNewGuardian(),
      guardianEntries: [
        {
          kind: 'existing' as const,
          entryKey: 'existing-702',
          guardian_id: 702,
          displayName: 'Hassan',
          relationship_type: 'father' as const,
          is_primary_contact: false,
        },
      ],
    };
    const entries = collectStudentCreateGuardianEntries(profileWithGuardian(), billingState);
    expect(entries).toHaveLength(2);

    const unresolved = validateStudentCreateGuardianContract(profileWithGuardian(), billingState, t);
    expect(unresolved.valid).toBe(false);
    expect(unresolved.errors.billingGuardianSelection).toBe(
      'admin.student360.create.billingResponsibility.errors.billingGuardianSelectionRequired',
    );

    const resolved = validateStudentCreateGuardianContract(
      profileWithGuardian(),
      { ...billingState, billingGuardianEntryKey: 'existing-702' },
      t,
    );
    expect(resolved.valid).toBe(true);

    const relationships = buildStudentCreateGuardianRelationships(entries, 'existing-702');
    expect(relationships[0]).toMatchObject({
      guardian: { full_name: 'Fatima Alami' },
      is_financial_responsible: false,
    });
    expect(relationships[1]).toMatchObject({
      guardian_id: 702,
      is_financial_responsible: true,
    });
  });

  it('primary contact is not auto billing guardian when another entry is selected', () => {
    const billingState = {
      ...billingWithNewGuardian(),
      billingGuardianEntryKey: 'existing-702',
      guardianEntries: [
        {
          kind: 'existing' as const,
          entryKey: 'existing-702',
          guardian_id: 702,
          displayName: 'Hassan',
          relationship_type: 'father' as const,
          is_primary_contact: false,
        },
      ],
    };
    const entries = collectStudentCreateGuardianEntries(profileWithGuardian(), billingState);
    const relationships = buildStudentCreateGuardianRelationships(entries, 'existing-702');
    expect(relationships[0]).toMatchObject({
      is_primary_contact: true,
      is_financial_responsible: false,
    });
    expect(relationships[1]).toMatchObject({
      guardian_id: 702,
      is_primary_contact: false,
      is_financial_responsible: true,
    });
  });

  it('guardian billing without guardian blocks submit', () => {
    const result = validateStudentCreateGuardianContract(
      defaultStudentProfileFormState(null),
      billingWithNewGuardian(),
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.guardianRequired).toBeTruthy();
  });

  it('student billing mode does not require guardians', () => {
    const result = validateStudentCreateGuardianContract(
      defaultStudentProfileFormState(null),
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'student',
        studentBillingConfirmed: true,
        studentBillingReason: 'Adult learner',
      },
      t,
    );
    expect(result.valid).toBe(true);
  });

  it('omits provision_access unless explicitly requested', () => {
    const billing = billingWithNewGuardian();
    const entries = collectStudentCreateGuardianEntries(profileWithGuardian(), billing);
    const billingKey = resolveBillingGuardianEntryKey(entries, billing);
    const withoutProvision = buildStudentCreateGuardianRelationships(entries, billingKey);
    expect(withoutProvision[0]).not.toHaveProperty('provision_access');

    const withProvision = buildStudentCreateGuardianRelationships(entries, billingKey, {
      'new-primary': true,
    });
    expect(withProvision[0]).toMatchObject({ provision_access: true });
  });

  it('sends provision_access only for opted-in guardians in atomic payload', () => {
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profileWithGuardian(), null, { deferGuardianContact: true }),
      profileWithGuardian(),
      billingWithNewGuardian({
        provisionAccessByEntryKey: { 'new-primary': true },
      }),
    );
    expect(payload.guardian_relationships?.[0]).toMatchObject({ provision_access: true });
  });
});

describe('post-201 duplicate link guard', () => {
  it('atomic payload includes guardian_relationships so post-create link is skipped in wizard', () => {
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profileWithGuardian()),
      profileWithGuardian(),
      {
        ...defaultStudentCreateBillingFormState(),
        guardianSourceMode: 'existing',
        responsibilitySelection: 'guardian',
        linkedGuardianId: 701,
      },
    );
    expect(payload.guardian_relationships?.length).toBeGreaterThan(0);
  });
});
