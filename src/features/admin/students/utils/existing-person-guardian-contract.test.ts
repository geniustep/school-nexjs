import { describe, expect, it } from 'vitest';
import { normalizePersonSearchResult } from './normalize-person-search';
import {
  applyStudentCreateGuardianAtomicContractToPayload,
  resolvePersonPartnerId,
  resolvePersonSchoolParentId,
} from './student-create-guardian-payload';
import { resolveGuardianAccountPresentation } from './resolve-guardian-account-presentation';
import { defaultStudentCreateBillingFormState } from './student-create-billing-responsibility';
import { buildStudentCreatePayload, defaultStudentProfileFormState } from './student-profile';

function profile() {
  return {
    ...defaultStudentProfileFormState(null),
    emergencyContactName: 'Existing Person',
    emergencyPhone: '0612345678',
    emergencyRelationship: 'father',
  };
}

describe('existing person guardian contract', () => {
  it('keeps generic id in the person space when guardian profile is absent', () => {
    const result = normalizePersonSearchResult({
      id: 166,
      partner_id: 166,
      person_id: 166,
      guardian_id: null,
      name: 'Mohamed',
      active: true,
      can_link_as_guardian: true,
      has_user_account: true,
      user_id: 30,
    });

    expect(result).not.toBeNull();
    expect(result?.person_id).toBe(166);
    expect(result?.guardian_id).toBeNull();
    expect(result?.id).toBe(166);
    expect(result?.has_user_account).toBe(true);
    expect(resolvePersonSchoolParentId(result!)).toBeNull();
    expect(resolvePersonPartnerId(result!)).toBe(166);
  });

  it('sends person_id and lets backend resolve billing guardian for an existing person', () => {
    const state = profile();
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(state),
      state,
      {
        ...defaultStudentCreateBillingFormState(),
        guardianSourceMode: 'existing',
        responsibilitySelection: 'guardian',
        linkedGuardianId: null,
        linkedGuardianPersonId: 166,
        billingGuardianEntryKey: 'person-166',
      },
    );

    expect(payload.guardian_relationships).toEqual([
      expect.objectContaining({
        person_id: 166,
        is_financial_responsible: true,
      }),
    ]);
    expect(payload.guardian_relationships?.[0]).not.toHaveProperty('guardian_id');
    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });
    expect(payload.billing_responsibility).not.toHaveProperty('billing_guardian_id');
  });

  it('keeps a real guardian_id separate from person_id even when numbers differ', () => {
    const result = normalizePersonSearchResult({
      id: 29961,
      partner_id: 166,
      person_id: 166,
      guardian_id: 29961,
      name: 'Mohamed',
      active: true,
      can_link_as_guardian: true,
      has_user_account: true,
      user_id: 30,
    });

    expect(result?.person_id).toBe(166);
    expect(result?.guardian_id).toBe(29961);
    expect(resolvePersonSchoolParentId(result!)).toBe(29961);
    expect(resolvePersonPartnerId(result!)).toBe(166);
  });

  it('does not show no-account when person-level evidence proves an existing user', () => {
    const presentation = resolveGuardianAccountPresentation({
      code: null,
      user_id: 30,
      has_user_account: true,
      account: {
        has_user_account: false,
        status: 'no_account',
      },
    });

    expect(presentation.status).toBe('active');
    expect(presentation.statusLabelKey).toBe('admin.guardianAccount.status.active');
  });
});
