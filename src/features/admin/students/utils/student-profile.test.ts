import { describe, expect, it } from 'vitest';
import {
  buildStudentCreatePayload,
  buildStudentPartialUpdatePayload,
  buildFullNamePreview,
  buildStudentCreatePageTitleParts,
  canAttachFinanceToStudentCreatePayload,
  defaultStudentProfileFormState,
  hasStudentCreateIdentifier,
  localizeStudentGenderOptions,
  resolveDefaultNationalityId,
  resolveStudentNameLatin,
  splitStudentFullName,
  studentProfileFormStateFromStudent,
  sortNationalityOptions,
  requiresDepartureReason,
  requiresPreviousSchool,
  getStudentCreateFinanceBlockReason,
  validateStudentCreateEnrollmentClass,
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

  it('omits massar_code when empty and normalizes when present', () => {
    const empty = buildStudentCreatePayload({
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      massarCode: '',
      code: 'STU-1',
    });
    expect(empty.massar_code).toBeUndefined();

    const normalized = buildStudentCreatePayload({
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      massarCode: 'g412252321@taalim.ma',
      code: 'STU-1',
    });
    expect(normalized.massar_code).toBe('G412252321');
    expect(normalized.code).toBe('STU-1');
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

  it('includes automatic Base Plan finance when suggest result is provided', () => {
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
      academicYearId: '1',
      levelId: '77',
      actualJoinDate: '2026-09-01',
      classId: '2053',
    };
    const payload = buildStudentCreatePayload(state, {
      suggest,
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.finance).toEqual({ customize_plan: false, activation_mode: 'activate' });
    expect(payload.academic).toEqual({
      school_id: 3,
      academic_year_id: 1,
      level_id: 77,
      class_id: 2053,
      enrollment_date: '2026-09-01',
    });
  });

  it('omits finance block when academic year is missing', () => {
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
      academicYearId: '',
      levelId: '77',
      actualJoinDate: '2026-09-01',
    };
    expect(canAttachFinanceToStudentCreatePayload(state, 3)).toBe(false);
    const payload = buildStudentCreatePayload(state, {
      suggest,
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.finance).toBeUndefined();
    expect(payload.academic).toBeUndefined();
  });

  it('omits finance block when academic year id is not a valid positive number', () => {
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
      academicYearId: 'invalid-year',
      levelId: '77',
      actualJoinDate: '2026-09-01',
    };
    expect(canAttachFinanceToStudentCreatePayload(state, 3)).toBe(false);
    const payload = buildStudentCreatePayload(state, {
      suggest,
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.finance).toBeUndefined();
    expect(payload.academic).toBeUndefined();
  });

  it('attaches Base Plan finance when class is missing', () => {
    const suggest: FeePlanSuggestResult = {
      ok: true,
      fee_plan_id: 123,
      fee_plan_name: 'Plan A',
      suggested_periods: [{ period_key: '2026-09', label: 'Sep', due_date: '2026-09-01', selected: true }],
      excluded_periods: [],
    };
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
      actualJoinDate: '2026-09-01',
      classId: '',
    };
    expect(getStudentCreateFinanceBlockReason(state, 3)).toBe('ok');
    expect(canAttachFinanceToStudentCreatePayload(state, 3)).toBe(true);
    const payload = buildStudentCreatePayload(state, {
      suggest,
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.finance).toEqual({ customize_plan: false, activation_mode: 'activate' });
    expect(payload.academic).toEqual({
      school_id: 3,
      academic_year_id: 1,
      level_id: 77,
      enrollment_date: '2026-09-01',
    });
  });

  it('includes academic.class_id when finance is attached', () => {
    const suggest: FeePlanSuggestResult = {
      ok: true,
      fee_plan_id: 2967,
      fee_plan_name: 'Plan B',
      suggested_periods: [{ period_key: '2026-09', label: 'Sep', due_date: '2026-09-01', selected: true }],
      excluded_periods: [],
    };
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '2446',
      actualJoinDate: '2026-06-19',
      classId: '2058',
    };
    const payload = buildStudentCreatePayload(state, {
      suggest,
      financeState: {
        ...defaultStudentCreateFinanceFormState(suggest),
        customizePlan: true,
        customizationReason: 'special_discount',
      },
      schoolId: 3,
    });
    expect(payload.academic?.class_id).toBe(2058);
    expect(payload.finance?.periods?.length).toBe(1);
  });

  it('drops class_id from payload when class is outside active school scope', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
      classId: '9999',
    };
    const classes = [
      { id: 2053, name: 'P1A', level: { id: 77, name: 'P1' }, school_id: 3, academic_year_id: 1 },
      { id: 9999, name: 'Other', level: { id: 77, name: 'P1' }, school_id: 88, academic_year_id: 1 },
    ];
    const payload = buildStudentCreatePayload(state, null, { schoolId: 3, classes });
    expect(payload.class_id).toBeUndefined();
  });

  it('keeps class_id when class matches school, year, and level scope', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
      classId: '2053',
    };
    const classes = [
      { id: 2053, name: 'P1A', level: { id: 77, name: 'P1' }, school_id: 3, academic_year_id: 1 },
    ];
    const payload = buildStudentCreatePayload(state, null, { schoolId: 3, classes });
    expect(payload.class_id).toBe(2053);
  });
});

describe('validateStudentCreateEnrollmentClass', () => {
  const classes = [
    { id: 2053, name: 'P1A', level: { id: 77, name: 'P1' }, school_id: 3, academic_year_id: 1 },
    { id: 9999, name: 'Other', level: { id: 77, name: 'P1' }, school_id: 88, academic_year_id: 1 },
  ];

  it('accepts empty class id', () => {
    const state = { ...defaultStudentProfileFormState(options), classId: '' };
    expect(validateStudentCreateEnrollmentClass(state, classes, 3, t).valid).toBe(true);
  });

  it('rejects class outside school scope', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      academicYearId: '1',
      levelId: '77',
      classId: '9999',
    };
    const result = validateStudentCreateEnrollmentClass(state, classes, 3, t);
    expect(result.valid).toBe(false);
    expect(result.errors.classId).toBe('admin.studentClassForbidden');
  });
});

describe('splitStudentFullName', () => {
  it('splits a full latin name into first and last parts', () => {
    expect(splitStudentFullName('Mohammed Alaoui')).toEqual({
      firstName: 'Mohammed',
      lastName: 'Alaoui',
    });
  });
});

describe('studentProfileFormStateFromStudent', () => {
  it('hydrates latin name parts from name_latin', () => {
    const state = studentProfileFormStateFromStudent(
      {
        id: 1,
        first_name: 'محمد',
        last_name: 'العلوي',
        name_latin: 'Mohammed Alaoui',
        status: 'active',
      },
      null,
      options,
    );
    expect(state.firstNameLatin).toBe('Mohammed');
    expect(state.lastNameLatin).toBe('Alaoui');
    expect(resolveStudentNameLatin(state)).toBe('Mohammed Alaoui');
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

  it('clears massar_code when field is emptied on edit', () => {
    const original = { ...defaultStudentProfileFormState(options), massarCode: 'G412252321' };
    const current = { ...original, massarCode: '' };
    const payload = buildStudentPartialUpdatePayload(current, original);
    expect(payload.massar_code).toBe('');
  });

  it('sends name_latin when latin first or last name changes', () => {
    const original = defaultStudentProfileFormState(options);
    const current = {
      ...original,
      firstNameLatin: 'Mohammed',
      lastNameLatin: 'Alaoui',
    };
    const payload = buildStudentPartialUpdatePayload(current, original);
    expect(payload.name_latin).toBe('Mohammed Alaoui');
  });

  it('clears name_latin when latin parts are removed', () => {
    const original = {
      ...defaultStudentProfileFormState(options),
      firstNameLatin: 'Mohammed',
      lastNameLatin: 'Alaoui',
      nameLatin: 'Mohammed Alaoui',
    };
    const current = { ...original, firstNameLatin: '', lastNameLatin: '', nameLatin: '' };
    const payload = buildStudentPartialUpdatePayload(current, original);
    expect(payload.name_latin).toBe('');
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
      code: 'STU-001',
      academicYearId: '',
      levelId: '',
    };
    const result = validateStudentCreateIdentityStep(state, t);
    expect(result.valid).toBe(true);
    expect(result.errors.academicYearId).toBeUndefined();
    expect(result.errors.levelId).toBeUndefined();
  });

  it('allows identity step with empty massar when school number or code is present', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'zaki',
      lastName: 'ham',
      massarCode: '',
      schoolNumber: '2026001',
    };
    expect(validateStudentCreateIdentityStep(state, t).valid).toBe(true);
  });

  it('allows identity step without any student identifier', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'zaki',
      lastName: 'ham',
    };
    const result = validateStudentCreateIdentityStep(state, t);
    expect(result.valid).toBe(true);
    expect(result.errors.schoolNumber).toBeUndefined();
    expect(result.errors.code).toBeUndefined();
    expect(result.errors.massarCode).toBeUndefined();
  });

  it('accepts valid massar_code format without school number or code', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      massarCode: 'G412252321',
    };
    expect(validateStudentCreateIdentifier(state, t).valid).toBe(true);
    expect(validateStudentCreateIdentityStep(state, t).valid).toBe(true);
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
      code: 'STU-001',
      academicYearId: '',
      levelId: '',
    };
    const result = validateStudentCreateForm(state, t);
    expect(result.valid).toBe(false);
    expect(result.errors.academicYearId).toBeDefined();
    expect(result.errors.levelId).toBeDefined();
  });

  it('allows create form without any student identifier', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
      cycleId: '1',
    };
    const result = validateStudentCreateForm(state, t);
    expect(result.valid).toBe(true);
    expect(result.errors.schoolNumber).toBeUndefined();
    expect(result.errors.code).toBeUndefined();
  });

  it('allows create form without massar when other identifiers exist', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
      cycleId: '1',
      massarCode: '',
      schoolNumber: '2026001',
    };
    expect(validateStudentCreateForm(state, t).valid).toBe(true);
  });

  it('rejects invalid massar format', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
      cycleId: '1',
      massarCode: '412252321',
      schoolNumber: '2026001',
    };
    const result = validateStudentCreateForm(state, t);
    expect(result.valid).toBe(false);
    expect(result.errors.massarCode).toBe('admin.student360.create.errors.invalidMassarCode');
  });

  it('accepts normalized massar after spaces and email suffix', () => {
    const state = {
      ...defaultStudentProfileFormState(options),
      firstName: 'A',
      lastName: 'B',
      academicYearId: '1',
      levelId: '77',
      cycleId: '1',
      massarCode: 'g412252321@taalim.ma',
      schoolNumber: '2026001',
    };
    expect(validateStudentCreateForm(state, t).valid).toBe(true);
  });
});

describe('buildFullNamePreview', () => {
  it('joins trimmed parts', () => {
    expect(buildFullNamePreview(' محمد ', ' العلوي ')).toBe('محمد العلوي');
  });
});

describe('buildStudentCreatePageTitleParts', () => {
  it('shows latin only when different from arabic', () => {
    expect(
      buildStudentCreatePageTitleParts({
        firstName: 'محمد',
        lastName: 'كمال',
        firstNameLatin: 'mohamed',
        lastNameLatin: 'kamel',
      }),
    ).toEqual({
      hasName: true,
      ar: 'محمد كمال',
      latin: 'mohamed kamel',
      showLatin: true,
    });
  });

  it('hides duplicate latin spelling', () => {
    expect(
      buildStudentCreatePageTitleParts({
        firstName: 'QA',
        lastName: 'Test Child',
        firstNameLatin: 'QA',
        lastNameLatin: 'Test Child',
      }).showLatin,
    ).toBe(false);
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