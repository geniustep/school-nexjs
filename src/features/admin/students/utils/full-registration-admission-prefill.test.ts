import { describe, expect, it } from 'vitest';
import type { AdmissionPrefill } from '@/types/admission';
import {
  mapAdmissionPrefillToFullRegistration,
  parseFullRegistrationAdmissionId,
} from './full-registration-admission-prefill';

describe('parseFullRegistrationAdmissionId', () => {
  it('accepts only positive integer admission ids', () => {
    expect(parseFullRegistrationAdmissionId('42')).toBe(42);
    expect(parseFullRegistrationAdmissionId(' 42 ')).toBe(42);
    expect(parseFullRegistrationAdmissionId('0')).toBeNull();
    expect(parseFullRegistrationAdmissionId('-1')).toBeNull();
    expect(parseFullRegistrationAdmissionId('abc')).toBeNull();
    expect(parseFullRegistrationAdmissionId(null)).toBeNull();
  });
});

describe('mapAdmissionPrefillToFullRegistration', () => {
  it('maps student, academic and new mother data into the current full-registration fields', () => {
    const prefill: AdmissionPrefill = {
      student: {
        child_first_name_ar: 'سلمى',
        child_last_name_ar: 'العلمي',
        child_first_name_fr: 'Salma',
        child_last_name_fr: 'Alami',
        gender: 'female',
        birth_date: '2018-03-04',
        previous_school: 'مدرسة سابقة',
        residence_address: 'الرباط',
      },
      academic: {
        academic_year_id: 17,
        requested_level_id: 8,
      },
      admission: {
        actual_join_date: '2026-09-01',
      },
      guardian: {
        name_ar: 'نادية العلمي',
        name_fr: 'Nadia Alami',
        phone: '0612345678',
        relationship: 'mother',
        preferred_language: 'fr',
        cin: 'AB1234',
      },
      selection_required: true,
      has_guardian_id: false,
      is_existing_guardian_selected: false,
    };

    const patch = mapAdmissionPrefillToFullRegistration(prefill);

    expect(patch.student).toEqual({
      firstNameAr: 'سلمى',
      lastNameAr: 'العلمي',
      firstNameFr: 'Salma',
      lastNameFr: 'Alami',
      gender: 'female',
      dateOfBirth: '2018-03-04',
      previousSchool: 'مدرسة سابقة',
      address: 'الرباط',
    });
    expect(patch.academicYearId).toBe('17');
    expect(patch.levelId).toBe('8');
    expect(patch.enrollmentDate).toBe('2026-09-01');
    expect(patch.familyContext).toBeNull();
    expect(patch.guardianKey).toBe('mother');
    expect(patch.guardian).toMatchObject({
      key: 'mother',
      mode: 'new',
      relationshipType: 'mother',
      linkedGuardianId: null,
      nameAr: 'نادية العلمي',
      nameFr: 'Nadia Alami',
      phone: '0612345678',
      identity: 'AB1234',
      preferredLanguage: 'fr',
    });
  });

  it('uses a backend-bound guardian as an existing guardian instead of creating a duplicate', () => {
    const prefill: AdmissionPrefill = {
      student: { first_name_ar: 'ياسين', last_name_ar: 'أمين' },
      academic: {},
      admission: {},
      guardian: {
        name: 'محمد أمين',
        phone: '0600000000',
        relationship: 'father',
      },
      guardian_id: 701,
      has_guardian_id: true,
      is_existing_guardian_selected: true,
      guardian_selection: {
        guardian_id: 701,
        has_bound_guardian: true,
        is_existing_guardian_selected: true,
        selection_required: false,
      },
    };

    const patch = mapAdmissionPrefillToFullRegistration(prefill);

    expect(patch.guardianKey).toBe('father');
    expect(patch.guardian).toMatchObject({
      mode: 'existing',
      linkedGuardianId: 701,
      linkedPersonId: null,
      relationshipType: 'father',
      phone: '0600000000',
    });
  });

  it('keeps an untyped guardian visible as a single guardian without inventing a parent role', () => {
    const prefill: AdmissionPrefill = {
      student: {},
      academic: {},
      admission: {},
      guardian: { name: 'Guardian Example', phone: '0611111111' },
    };

    const patch = mapAdmissionPrefillToFullRegistration(prefill);

    expect(patch.familyContext).toBe('single_guardian');
    expect(patch.guardianKey).toBe('single');
    expect(patch.guardian).toMatchObject({
      relationshipType: 'legal_guardian',
      nameAr: '',
      nameFr: 'Guardian Example',
    });
  });
});
