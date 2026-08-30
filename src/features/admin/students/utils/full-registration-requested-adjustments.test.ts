import { describe, expect, it } from 'vitest';
import {
  buildFullRegistrationPayload,
  validateFullRegistrationDraft,
  type FullRegistrationBuildInput,
} from './full-registration-contract';
import { readFullRegistrationOptionalLines } from './full-registration-optional-lines';
import {
  buildFullRegistrationCollectNowHref,
  buildFullRegistrationGuardianSuggestionQuery,
  fullRegistrationGuardianDisplayNames,
  fullRegistrationNameFieldOrder,
  fullRegistrationPricingPeriodDefaults,
} from './full-registration-requested-adjustments';

function input(): FullRegistrationBuildInput {
  return {
    academic: {
      schoolId: 3,
      academicYearId: '1',
      cycleId: '10',
      levelId: '4276',
      enrollmentDate: '2026-08-30',
    },
    student: {
      firstNameAr: 'ياسمين',
      lastNameAr: 'التوبي',
      firstNameFr: '',
      lastNameFr: '',
      gender: 'female',
      dateOfBirth: '2020-05-24',
      previousSchool: '',
      address: '',
    },
    familyContext: 'parents_together',
    guardians: [
      {
        key: 'father',
        mode: 'new',
        relationshipType: 'father',
        nameAr: 'أمين الياسين',
        nameFr: '',
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

describe('requested full registration adjustments', () => {
  it('accepts one complete student name pair and maps it to canonical fields', () => {
    const value = input();
    expect(validateFullRegistrationDraft(value).valid).toBe(true);
    const payload = buildFullRegistrationPayload(value);
    expect(payload.first_name).toBe('ياسمين');
    expect(payload.last_name).toBe('التوبي');
  });

  it('prefers the complete French/Latin pair for canonical fields while preserving Arabic', () => {
    const value = input();
    value.student.firstNameFr = 'Yasmine';
    value.student.lastNameFr = 'Toubi';
    const payload = buildFullRegistrationPayload(value);
    expect(payload.first_name).toBe('Yasmine');
    expect(payload.last_name).toBe('Toubi');
    expect(payload.name_ar).toBe('ياسمين التوبي');
    expect(payload.name_latin).toBe('Yasmine Toubi');
  });

  it('orders Arabic fields first only for the Arabic UI locale', () => {
    expect(fullRegistrationNameFieldOrder('ar')).toEqual({ arabic: -2, latin: -1 });
    expect(fullRegistrationNameFieldOrder('fr')).toEqual({ arabic: -1, latin: -2 });
    expect(fullRegistrationNameFieldOrder('en')).toEqual({ arabic: -1, latin: -2 });
  });

  it('uses CIN before phone and names for new-guardian duplicate suggestions', () => {
    expect(
      buildFullRegistrationGuardianSuggestionQuery({
        identity: 'AB123456',
        phone: '0612345678',
        nameAr: 'أمين',
        nameFr: 'Amine',
      }),
    ).toBe('AB123456');
    expect(
      buildFullRegistrationGuardianSuggestionQuery({
        identity: '',
        phone: '0612345678',
        nameAr: 'أمين',
        nameFr: 'Amine',
      }),
    ).toBe('0612345678');
  });

  it('defaults pricing periods to September-June outside the school year', () => {
    expect(fullRegistrationPricingPeriodDefaults('2026-08-30')).toEqual({
      from: '2026-09',
      to: '2027-06',
    });
  });

  it('starts pricing periods from the current month inside the school year', () => {
    expect(fullRegistrationPricingPeriodDefaults('2026-10-15')).toEqual({
      from: '2026-10',
      to: '2027-06',
    });
    expect(fullRegistrationPricingPeriodDefaults('2027-03-02')).toEqual({
      from: '2027-03',
      to: '2027-06',
    });
  });

  it('shows Arabic and Latin guardian names only when the search contract returns them', () => {
    expect(
      fullRegistrationGuardianDisplayNames({
        name: 'أمين الياسين',
        name_ar: 'أمين الياسين',
        name_latin: 'Amine Elyassine',
      }),
    ).toEqual(['أمين الياسين', 'Amine Elyassine']);
    expect(fullRegistrationGuardianDisplayNames({ name: 'أمين الياسين' })).toEqual([
      'أمين الياسين',
    ]);
  });

  it('builds a direct collection URL with the registration identifiers', () => {
    const href = buildFullRegistrationCollectNowHref({
      studentId: 14487,
      academicYearId: 1,
      billingPartnerId: 25910,
      returnTo: '/admin/students/14487',
    });
    expect(href).toContain('/admin/finance/collections/new?');
    expect(href).toContain('student_id=14487');
    expect(href).toContain('academic_year_id=1');
    expect(href).toContain('billing_partner_id=25910');
  });

  it('reads optional services from resolved plan details and ignores mandatory lines', () => {
    expect(
      readFullRegistrationOptionalLines({
        id: 7271,
        lines: [
          {
            line_id: 8774,
            fee_type_id: 1308,
            fee_type_name: 'التسجيل',
            amount: 2000,
            frequency: 'one_time',
            is_optional: false,
            is_mandatory: true,
          },
          {
            line_id: 9956,
            fee_type_id: 1310,
            fee_type_name: 'النقل',
            amount: 500,
            frequency: 'monthly',
            is_optional: true,
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        line_id: 9956,
        fee_type_id: 1310,
        fee_type_name: 'النقل',
        amount: 500,
        is_optional: true,
      }),
    ]);
  });
});
