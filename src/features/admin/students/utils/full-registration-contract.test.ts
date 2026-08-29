import { describe, expect, it } from 'vitest';
import {
  buildFullRegistrationPayload,
  validateFullRegistrationDraft,
  type FullRegistrationBuildInput,
} from './full-registration-contract';

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
      previousSchool: 'École A',
      address: 'Casablanca',
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
    selectedServiceIds: [501],
    pricingAdjustments: [],
  };
}

describe('full registration V1 contract', () => {
  it('builds one full-registration intent without client financial authority', () => {
    const payload = buildFullRegistrationPayload(baseInput());

    expect(payload.family_context).toBe('parents_together');
    expect(payload.selected_service_ids).toEqual([501]);
    expect(payload.academic).toEqual({
      school_id: 7,
      academic_year_id: 12,
      cycle_id: 3,
      level_id: 44,
      enrollment_date: '2026-09-01',
    });
    expect(payload.guardian_relationships).toHaveLength(1);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('class_id');
    expect(serialized).not.toContain('fee_plan_id');
    expect(serialized).not.toContain('agreement_id');
    expect(serialized).not.toContain('activation_mode');
    expect(serialized).not.toContain('selected_optional_line_ids');
  });

  it('keeps parents-together rights server-owned', () => {
    const payload = buildFullRegistrationPayload(baseInput());
    const relationships = payload.guardian_relationships as Array<Record<string, unknown>>;
    expect(relationships[0]).not.toHaveProperty('is_financial_responsible');
    expect(relationships[0]).not.toHaveProperty('legal_status');
    expect(relationships[0]).toMatchObject({
      relationship_type: 'father',
      provision_access: true,
    });
  });

  it('requires explicit legal and billing decisions for special family contexts', () => {
    const input = baseInput();
    input.familyContext = 'separated_or_divorced';

    const invalid = validateFullRegistrationDraft(input);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain('special_family_legal_responsible_required');
    expect(invalid.errors).toContain('special_family_billing_responsible_required');

    input.guardians[0].legal = true;
    input.guardians[0].financial = true;
    const valid = validateFullRegistrationDraft(input);
    expect(valid.valid).toBe(true);

    const payload = buildFullRegistrationPayload(input);
    const relationships = payload.guardian_relationships as Array<Record<string, unknown>>;
    expect(relationships[0]).toMatchObject({
      legal_status: 'yes',
      is_financial_responsible: true,
      is_authorized_pickup: true,
    });
  });

  it('uses guardian_id for a selected existing guardian and never duplicates identity data', () => {
    const input = baseInput();
    input.guardians[0] = {
      ...input.guardians[0],
      mode: 'existing',
      linkedGuardianId: 901,
      linkedPersonId: null,
      nameAr: '',
      nameFr: '',
      phone: '',
    };

    const payload = buildFullRegistrationPayload(input);
    const relationships = payload.guardian_relationships as Array<Record<string, unknown>>;
    expect(relationships[0]).toEqual({
      guardian_id: 901,
      relationship_type: 'father',
      provision_access: true,
    });
  });

  it('maps pricing adjustments only when the user actually changes price or period', () => {
    const input = baseInput();
    input.pricingAdjustments = [
      {
        itemKey: '77',
        adjustedUnitPrice: 1900,
        periodFrom: '2026-09',
        periodTo: '2027-06',
        reason: 'family agreement',
      },
    ];

    const validation = validateFullRegistrationDraft(input);
    expect(validation.valid).toBe(true);

    const payload = buildFullRegistrationPayload(input);
    expect(payload.pricing_adjustments).toEqual([
      {
        item_key: '77',
        adjusted_unit_price: 1900,
        period_from: '2026-09',
        period_to: '2027-06',
        reason: 'family agreement',
      },
    ]);
  });
});
