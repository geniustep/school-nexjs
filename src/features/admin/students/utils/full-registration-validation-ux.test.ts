import { describe, expect, it, vi } from 'vitest';
import {
  validateFullRegistrationDraft,
  type FullRegistrationBuildInput,
} from './full-registration-contract';
import { focusFirstFullRegistrationError } from './full-registration-validation-ux';

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
        nameFr: '',
        preferredLanguage: 'ar',
        phone: '0612345678',
        identity: '',
        legal: false,
        financial: false,
        pickup: true,
      },
      {
        key: 'mother',
        mode: 'new',
        relationshipType: 'mother',
        nameAr: '',
        nameFr: '',
        preferredLanguage: 'ar',
        phone: '',
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

describe('full registration validation UX contract', () => {
  it('returns every missing field in visual order without changing aggregate rules', () => {
    const input = baseInput();
    input.academic.levelId = '';
    input.student.firstNameAr = '';
    input.student.dateOfBirth = '';

    const result = validateFullRegistrationDraft(input);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors).toMatchObject({
      'academic.levelId': 'academic_context_required',
      'student.firstNameAr': 'arabic_name_required',
      'student.dateOfBirth': 'date_of_birth_required',
    });
    expect(result.fieldOrder.slice(0, 3)).toEqual([
      'academic.levelId',
      'student.firstNameAr',
      'student.dateOfBirth',
    ]);
  });

  it('marks the guardian card when no guardian was entered', () => {
    const input = baseInput();
    for (const guardian of input.guardians) {
      guardian.nameAr = '';
      guardian.nameFr = '';
      guardian.phone = '';
    }

    const result = validateFullRegistrationDraft(input);

    expect(result.errors).toContain('guardian_required');
    expect(result.fieldErrors['guardian.father.card']).toBe('guardian_required');
  });

  it('marks a partially entered new guardian at the missing name or phone', () => {
    const input = baseInput();
    input.guardians[0].nameAr = '';
    input.guardians[0].nameFr = '';

    let result = validateFullRegistrationDraft(input);
    expect(result.fieldErrors['guardian.father.name']).toBe('guardian_name_required');

    input.guardians[0].nameAr = 'محمد';
    input.guardians[0].phone = '';
    result = validateFullRegistrationDraft(input);
    expect(result.fieldErrors['guardian.father.name']).toBeUndefined();
    expect(result.fieldErrors['guardian.father.phone']).toBe('guardian_phone_required');
  });

  it('treats existing mode without a selected person as a local selection error', () => {
    const input = baseInput();
    input.guardians[0] = {
      ...input.guardians[0],
      mode: 'existing',
      linkedGuardianId: null,
      linkedPersonId: null,
      nameAr: '',
      nameFr: '',
      phone: '',
    };

    const result = validateFullRegistrationDraft(input);

    expect(result.errors).toContain('guardian_selection_required');
    expect(result.fieldErrors['guardian.father.selection']).toBe('guardian_selection_required');
  });

  it('keeps legal and financial responsibility requirements limited to special family contexts', () => {
    const separated = baseInput();
    separated.familyContext = 'separated_or_divorced';
    const separatedResult = validateFullRegistrationDraft(separated);

    expect(separatedResult.fieldErrors['guardian.father.legal']).toBe(
      'special_family_legal_responsible_required',
    );
    expect(separatedResult.fieldErrors['guardian.father.financial']).toBe(
      'special_family_billing_responsible_required',
    );

    const single = baseInput();
    single.familyContext = 'single_guardian';
    single.guardians = [single.guardians[0]];
    const singleResult = validateFullRegistrationDraft(single);

    expect(singleResult.errors).not.toContain('special_family_legal_responsible_required');
    expect(singleResult.errors).not.toContain('special_family_billing_responsible_required');
  });

  it('scrolls and focuses the first invalid control only', () => {
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const querySelector = vi.fn(() => ({ scrollIntoView, focus }));

    expect(
      focusFirstFullRegistrationError(
        ['student.firstNameAr', 'student.lastNameAr'],
        { querySelector },
      ),
    ).toBe(true);
    expect(querySelector).toHaveBeenCalledWith(
      '[data-validation-key="student.firstNameAr"]',
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
