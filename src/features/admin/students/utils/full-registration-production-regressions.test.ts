import { describe, expect, it } from 'vitest';
import type { AdmissionPrefill } from '@/types/admission';
import {
  buildFullRegistrationPayload,
  type FullRegistrationBuildInput,
} from './full-registration-contract';
import { mapAdmissionPrefillToFullRegistration } from './full-registration-admission-prefill';

function baseInput(): FullRegistrationBuildInput {
  return {
    academic: {
      schoolId: 7,
      academicYearId: '12',
      cycleId: '3',
      levelId: '44',
      enrollmentDate: '2026-09-01',
    },
    student: {
      firstNameAr: 'سليم',
      lastNameAr: 'العلوي',
      firstNameFr: 'Salim',
      lastNameFr: 'Alaoui',
      gender: 'male',
      dateOfBirth: '2014-05-12',
      previousSchool: '',
      address: '',
    },
    familyContext: 'parents_together',
    guardians: [
      {
        key: 'father',
        mode: 'new',
        relationshipType: 'father',
        nameAr: 'محمد العلوي',
        nameFr: 'Mohamed Alaoui',
        preferredLanguage: 'ar',
        phone: '0612345678',
        identity: '',
        legal: false,
        financial: false,
        pickup: true,
      },
    ],
    selectedServiceIds: [],
    pricingAdjustments: [],
  };
}

describe('production regression: bilingual student identity', () => {
  it('keeps Arabic as the canonical student name while preserving the Latin name', () => {
    const payload = buildFullRegistrationPayload(baseInput());

    expect(payload.first_name).toBe('سليم');
    expect(payload.last_name).toBe('العلوي');
    expect(payload.first_name_ar).toBe('سليم');
    expect(payload.last_name_ar).toBe('العلوي');
    expect(payload.first_name_fr).toBeUndefined();
    expect(payload.last_name_fr).toBeUndefined();
    expect(payload.name_ar).toBe('سليم العلوي');
    expect(payload.name_latin).toBe('Salim Alaoui');
  });

  it('uses the French pair contract when no Arabic pair exists', () => {
    const input = baseInput();
    input.student.firstNameAr = '';
    input.student.lastNameAr = '';

    const payload = buildFullRegistrationPayload(input);

    expect(payload.first_name).toBe('Salim');
    expect(payload.last_name).toBe('Alaoui');
    expect(payload.first_name_ar).toBeUndefined();
    expect(payload.last_name_ar).toBeUndefined();
    expect(payload.first_name_fr).toBe('Salim');
    expect(payload.last_name_fr).toBe('Alaoui');
    expect(payload.name_latin).toBe('Salim Alaoui');
  });
});

describe('production regression: admission gender prefill', () => {
  it('does not overwrite the Full Registration default gender when admission has no gender', () => {
    const prefill: AdmissionPrefill = {
      student: {
        child_first_name_ar: 'آدم',
        child_last_name_ar: 'العلمي',
        child_first_name_fr: 'Adam',
        child_last_name_fr: 'Alami',
        birth_date: '2018-03-04',
      },
      academic: {},
      admission: {},
      guardian: {},
    };

    const patch = mapAdmissionPrefillToFullRegistration(prefill);

    expect(patch.student).not.toHaveProperty('gender');
  });

  it('preserves an explicit admission gender', () => {
    const prefill: AdmissionPrefill = {
      student: {
        child_first_name_ar: 'سلمى',
        child_last_name_ar: 'العلمي',
        child_first_name_fr: 'Salma',
        child_last_name_fr: 'Alami',
        gender: 'female',
        birth_date: '2018-03-04',
      },
      academic: {},
      admission: {},
      guardian: {},
    };

    const patch = mapAdmissionPrefillToFullRegistration(prefill);

    expect(patch.student.gender).toBe('female');
  });
});
