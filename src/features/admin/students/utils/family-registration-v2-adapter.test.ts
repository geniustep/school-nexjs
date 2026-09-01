import { describe, expect, it } from 'vitest';
import type { FamilyRegistrationV2GuardianDraft } from './family-registration-v2-adapter';
import {
  buildFamilyRegistrationV2CanonicalForm,
  familyRegistrationV2SelectedGuardianKeys,
  familyRegistrationV2SubmissionBlockCode,
  type FamilyRegistrationV2ChildDraft,
} from './family-registration-v2-adapter';

function guardian(
  key: 'father' | 'mother',
  overrides: Partial<FamilyRegistrationV2GuardianDraft> = {},
): FamilyRegistrationV2GuardianDraft {
  return {
    key,
    mode: 'new',
    linkedGuardianId: null,
    name: key === 'father' ? 'الأب' : 'الأم',
    alternateName: '',
    phone: '',
    ...overrides,
  };
}

function child(localId = 'c1'): FamilyRegistrationV2ChildDraft {
  return {
    localId,
    firstNameAr: 'سليم',
    lastNameAr: 'العلوي',
    firstNameFr: 'Salim',
    lastNameFr: 'Alaoui',
    gender: 'male',
    dateOfBirth: '2018-03-04',
    previousSchool: '',
    address: 'الرباط',
    academicYearId: '20',
    cycleId: '3',
    levelId: '7',
    enrollmentDate: '2026-09-01',
  };
}

describe('family registration v2 canonical adapter', () => {
  it('keeps father and mother for together context and selects the requested billing guardian', () => {
    const form = buildFamilyRegistrationV2CanonicalForm({
      todayIso: '2026-09-01',
      familyContext: 'together',
      singleGuardianKey: 'father',
      billingGuardianKey: 'mother',
      guardians: {
        father: guardian('father'),
        mother: guardian('mother'),
      },
      children: [child()],
      defaultNationalityId: '1',
    });

    expect(form.guardianHost.emergencyRelationship).toBe('father');
    expect(form.billing.guardianEntries).toHaveLength(1);
    expect(form.billing.guardianEntries[0].relationship_type).toBe('mother');
    expect(form.billing.billingGuardianEntryKey).toBe('family-v2-mother');
    expect(form.children[0].profile.academicYearId).toBe('20');
    expect(form.children[0].profile.cycleId).toBe('3');
    expect(form.children[0].profile.levelId).toBe('7');
    expect(form.children[0].profile.admissionDate).toBe('2026-09-01');
    expect(form.children[0].profile.actualJoinDate).toBe('2026-09-01');
  });

  it('supports a single mother without silently treating the guardian as the father', () => {
    const form = buildFamilyRegistrationV2CanonicalForm({
      todayIso: '2026-09-01',
      familyContext: 'single',
      singleGuardianKey: 'mother',
      billingGuardianKey: 'mother',
      guardians: {
        father: guardian('father'),
        mother: guardian('mother', {
          mode: 'existing',
          linkedGuardianId: 42,
          name: 'فاطمة',
        }),
      },
      children: [child()],
    });

    expect(form.guardianHost.emergencyRelationship).toBe('mother');
    expect(form.billing.guardianSourceMode).toBe('existing');
    expect(form.billing.linkedGuardianId).toBe(42);
    expect(form.billing.guardianEntries).toHaveLength(0);
    expect(form.billing.billingGuardianEntryKey).toBe('existing-42');
  });

  it('preserves several children and their per-child enrollment dates', () => {
    const form = buildFamilyRegistrationV2CanonicalForm({
      todayIso: '2026-09-01',
      familyContext: 'together',
      singleGuardianKey: 'father',
      billingGuardianKey: 'father',
      guardians: {
        father: guardian('father'),
        mother: guardian('mother'),
      },
      children: [
        child('c1'),
        { ...child('c2'), levelId: '8', enrollmentDate: '2026-09-03' },
      ],
    });

    expect(form.children.map((item) => item.localId)).toEqual(['c1', 'c2']);
    expect(form.children[1].profile.levelId).toBe('8');
    expect(form.children[1].profile.admissionDate).toBe('2026-09-03');
  });

  it('blocks separated/divorced submission until guardian-rights contract exists', () => {
    expect(familyRegistrationV2SubmissionBlockCode('separated')).toBe(
      'SEPARATED_GUARDIAN_RIGHTS_CONTRACT_GAP',
    );
    expect(familyRegistrationV2SubmissionBlockCode('together')).toBeNull();
  });

  it('selects the actual single guardian key', () => {
    expect(familyRegistrationV2SelectedGuardianKeys('single', 'mother')).toEqual(['mother']);
    expect(familyRegistrationV2SelectedGuardianKeys('together', 'mother')).toEqual([
      'father',
      'mother',
    ]);
  });

  it('rejects person-only existing selections because family batch needs school.parent guardian_id', () => {
    expect(() =>
      buildFamilyRegistrationV2CanonicalForm({
        todayIso: '2026-09-01',
        familyContext: 'single',
        singleGuardianKey: 'father',
        billingGuardianKey: 'father',
        guardians: {
          father: guardian('father', {
            mode: 'existing',
            linkedGuardianId: null,
          }),
          mother: guardian('mother'),
        },
        children: [child()],
      }),
    ).toThrow('family_v2_existing_guardian_profile_required');
  });
});
