import { describe, expect, it } from 'vitest';
import {
  buildFullRegistrationPayload,
  type FullRegistrationBuildInput,
  type FullRegistrationGuardianDraft,
} from './full-registration-contract';

function guardian(overrides: Partial<FullRegistrationGuardianDraft>): FullRegistrationGuardianDraft {
  return {
    key: 'mother',
    mode: 'existing',
    relationshipType: 'mother',
    linkedGuardianId: null,
    linkedPersonId: 6655,
    nameAr: 'فاطمة',
    nameFr: '',
    preferredLanguage: 'ar',
    phone: '',
    identity: '',
    legal: false,
    financial: false,
    pickup: true,
    ...overrides,
  };
}

function input(existingGuardian: FullRegistrationGuardianDraft): FullRegistrationBuildInput {
  return {
    academic: {
      schoolId: 3,
      academicYearId: '1',
      cycleId: '1',
      levelId: '4275',
      enrollmentDate: '2026-08-30',
    },
    student: {
      firstNameAr: 'بلال',
      lastNameAr: 'غساتةن',
      firstNameFr: '',
      lastNameFr: '',
      gender: 'male',
      dateOfBirth: '2020-08-12',
      previousSchool: '',
      address: '',
    },
    familyContext: 'parents_together',
    guardians: [existingGuardian],
    selectedServiceIds: [],
    pricingAdjustments: [],
  };
}

describe('full registration existing guardian contact behavior', () => {
  it('links an existing person without phone without requesting notifications or access provisioning', () => {
    const payload = buildFullRegistrationPayload(input(guardian({ phone: '' })));
    expect(payload.guardian_relationships).toEqual([
      {
        relationship_type: 'mother',
        provision_access: false,
        receives_notifications: false,
        person_id: 6655,
      },
    ]);
  });

  it('keeps access provisioning and notifications enabled when the existing guardian has a phone', () => {
    const payload = buildFullRegistrationPayload(
      input(guardian({ linkedPersonId: null, linkedGuardianId: 29998, phone: '0661445593' })),
    );
    expect(payload.guardian_relationships).toEqual([
      {
        relationship_type: 'mother',
        provision_access: true,
        receives_notifications: true,
        guardian_id: 29998,
      },
    ]);
  });
});
