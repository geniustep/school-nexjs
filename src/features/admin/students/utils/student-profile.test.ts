import { describe, expect, it } from 'vitest';
import {
  buildStudentCreatePayload,
  buildStudentPartialUpdatePayload,
  buildFullNamePreview,
  defaultStudentProfileFormState,
  hasStudentCreateIdentifier,
  localizeStudentGenderOptions,
  resolveDefaultNationalityId,
  sortNationalityOptions,
  requiresDepartureReason,
  requiresPreviousSchool,
  validateStudentCreateForm,
  validateStudentCreateIdentityStep,
  validateStudentCreateIdentifier,
  validateStudentProfileForm,
} from './student-profile';
import { defaultStudentCreateFinanceFormState } from './student-enrollment-finance';
import type { FeePlanSuggestResult } from '@/types/student-enrollment-finance';
import type { StudentOptions } from '@/types/student-360';

const t = (key: string) => key;

const options: StudentOptions = {
  genders: [{ value: 'male', label: 'Male' }],
  studentStatuses: [
    { value: 'active', label: 'Active' },
    { value: 'withdrawn', label: 'Withdrawn' },
  ],
  registrationTypes: [
    { value: 'new', label: 'New' },
    { value: 'transfer', label: 'Transfer' },
  ],
  emergencyRelationships: [{ value: 'other', label: 'Other' }],
  documentTypes: [{ id: 1, code: 'other', name: 'Other' }],
  documentStates: [{ value: 'uploaded', label: 'Uploaded' }],
  bloodTypes: [{ value: 'O+', label: 'O+' }],
  nationalities: [{ id: 136, name: 'Morocco', code: 'MA' }],
  schools: [{ id: 3, name: 'School A' }],
  academicYears: [{ id: 1, name: '2025-2026' }],
  levels: [{ id: 77, name: 'P1', code: 'P1' }],
  classes: [{ id: 2053, name: 'P1A', level: { id: 77, name: 'P1', code: 'P1' } }],
};

describe('buildStudentCreatePayload', () => {
  it('maps identity, contact, emergency, and enrollment block', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'Youssef',
      lastName: 'Alami',
      nameAr: 'يوسف',
      nationalityId: '136',
      classId: '2053',
      registrationType: 'new',
      actualJoinDate: '2026-09-01',
      phone: '0612345678',
      emergencyContactName: 'Uncle',
      emergencyRelationship: 'other',
      emergencyPhone: '0699999999',
    };
    const payload = buildStudentCreatePayload(state);
    expect(payload.first_name).toBe('Youssef');
    expect(payload.nationality_id).toBe(136);
    expect(payload.class_id).toBe(2053);
    expect(payload.enrollment?.registration_type).toBe('new');
    expect(payload.enrollment?.actual_join_date).toBe('2026-09-01');
    expect(payload.emergency_contact_name).toBe('Uncle');
    expect('parent_ids' in payload).toBe(false);
  });

  it('composes name_ar from first and last when nameAr is empty', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'محمد',
      lastName: 'العلوي',
    };
    const payload = buildStudentCreatePayload(state);
    expect(payload.name_ar).toBe('محمد العلوي');
  });

  it('composes name_latin from latin parts', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'محمد',
      lastName: 'العلوي',
      firstNameLatin: 'Mohammed',
      lastNameLatin: 'Alaoui',
    };
    const payload = buildStudentCreatePayload(state);
    expect(payload.name_latin).toBe('Mohammed Alaoui');
  });

  it('requires previous school for transfer registration', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      registrationType: 'transfer',
      previousSchool: 'Old School',
    };
    const payload = buildStudentCreatePayload(state);
    expect(payload.enrollment?.previous_school).toBe('Old School');
  });

  it('includes finance block when suggest result is provided', () => {
    const suggest: FeePlanSuggestResult = {
      ok: true,
      fee_plan_id: 123,
      fee_plan_name: 'Plan A',
      suggested_periods: [],
      excluded_periods: [],
    };
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
    };
    const payload = buildStudentCreatePayload(state, {
      suggest,
      financeState: defaultStudentCreateFinanceFormState(suggest),
    });
    expect(payload.finance).toEqual({ fee_plan_id: 123, customize_plan: false });
  });
});

describe('buildStudentPartialUpdatePayload', () => {
  it('sends only changed fields', () => {
    const original = defaultStudentProfileFormState(options);
    const current = { ...original, phone: '0700000000', district: 'Hay Riad' };
    const payload = buildStudentPartialUpdatePayload(current, original);
    expect(payload.phone).toBe('0700000000');
    expect(payload.district).toBe('Hay Riad');
    expect(payload.first_name).toBeUndefined();
    expect(payload.enrollment).toBeUndefined();
  });

  it('includes enrollment block only when enrollment fields change', () => {
    const original = { ...defaultStudentProfileFormState(options), classId: '2053' };
    const current = { ...original, registrationType: 'transfer', previousSchool: 'Other' };
    const payload = buildStudentPartialUpdatePayload(current, original);
    expect(payload.enrollment?.registration_type).toBe('transfer');
    expect(payload.enrollment?.previous_school).toBe('Other');
  });
});

describe('validateStudentProfileForm', () => {
  it('flags future birth date', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      dateOfBirth: '2999-01-01',
    };
    const result = validateStudentProfileForm(state, t);
    expect(result.valid).toBe(false);
    expect(result.errors.dateOfBirth).toBe('admin.student360.errors.invalidBirthDate');
  });

  it('requires departure reason for withdrawn status', () => {
    expect(requiresDepartureReason('withdrawn')).toBe(true);
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      status: 'withdrawn',
      departureReason: '',
    };
    expect(validateStudentProfileForm(state, t).valid).toBe(false);
  });

  it('requires previous school for transfer type', () => {
    expect(requiresPreviousSchool('transfer')).toBe(true);
  });
});

describe('validateStudentCreateIdentityStep', () => {
  it('allows advancing identity step without academic year or level when identifier is present', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'zaki',
      lastName: 'ham',
      massarCode: '1234567890',
      academicYearId: '',
      levelId: '',
    };
    const result = validateStudentCreateIdentityStep(state, t);
    expect(result.valid).toBe(true);
    expect(result.errors.academicYearId).toBeUndefined();
    expect(result.errors.levelId).toBeUndefined();
  });

  it('rejects identity step without student identifier', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'zaki',
      lastName: 'ham',
    };
    const result = validateStudentCreateIdentityStep(state, t);
    expect(result.valid).toBe(false);
    expect(result.errors.massarCode).toBe('admin.student360.create.errors.studentIdentifierRequired');
  });

  it('accepts massar_code as student identifier', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      massarCode: '1234567890',
    };
    expect(validateStudentCreateIdentifier(state, t).valid).toBe(true);
  });

  it('accepts school number as student identifier', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      schoolNumber: '2026001',
    };
    expect(validateStudentCreateIdentifier(state, t).valid).toBe(true);
  });

  it('accepts internal code as student identifier', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      code: 'STU-001',
    };
    expect(validateStudentCreateIdentifier(state, t).valid).toBe(true);
  });
});

describe('validateStudentCreateForm', () => {
  it('requires academic year and level', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      massarCode: '1234567890',
      academicYearId: '',
      levelId: '',
    };
    const result = validateStudentCreateForm(state, t);
    expect(result.valid).toBe(false);
    expect(result.errors.academicYearId).toBeDefined();
    expect(result.errors.levelId).toBeDefined();
  });

  it('rejects create form without student identifier', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
    };
    const result = validateStudentCreateForm(state, t);
    expect(result.valid).toBe(false);
    expect(result.errors.massarCode).toBe('admin.student360.create.errors.studentIdentifierRequired');
  });

  it('rejects massar with spaces', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
      massarCode: '123 456',
      schoolNumber: '2026001',
    };
    expect(validateStudentCreateForm(state, t).valid).toBe(false);
  });
});

describe('buildFullNamePreview', () => {
  it('joins trimmed parts', () => {
    expect(buildFullNamePreview(' محمد ', ' العلوي ')).toBe('محمد العلوي');
  });
});

describe('localizeStudentGenderOptions', () => {
  const t = (key: string) => (key === 'admin.male' ? 'ذكر' : key === 'admin.female' ? 'أنثى' : key);

  it('translates gender labels from i18n keys', () => {
    const localized = localizeStudentGenderOptions(
      [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
      ],
      t,
    );
    expect(localized).toEqual([
      { value: 'male', label: 'ذكر' },
      { value: 'female', label: 'أنثى' },
    ]);
  });
});

describe('resolveDefaultNationalityId', () => {
  it('defaults to Morocco by code MA', () => {
    expect(resolveDefaultNationalityId(options.nationalities)).toBe('136');
    expect(defaultStudentProfileFormState(options).nationalityId).toBe('136');
  });

  it('falls back to Maroc name when code is missing', () => {
    expect(resolveDefaultNationalityId([{ id: 42, name: 'Maroc' }])).toBe('42');
    expect(resolveDefaultNationalityId([{ id: 43, name: 'المغرب' }])).toBe('43');
  });
});

describe('sortNationalityOptions', () => {
  it('puts Morocco first regardless of source order', () => {
    const sorted = sortNationalityOptions([
      { id: 1, name: 'France', code: 'FR' },
      { id: 136, name: 'Morocco', code: 'MA' },
      { id: 2, name: 'Spain', code: 'ES' },
    ]);
    expect(sorted[0].id).toBe(136);
    expect(sorted.map((item) => item.id)).toEqual([136, 1, 2]);
  });
});
