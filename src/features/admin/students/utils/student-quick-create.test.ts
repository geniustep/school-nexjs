import { describe, expect, it } from 'vitest';
import {
  buildStudentQuickCreatePayload,
  buildStudentQuickCreateSuccessHref,
  validateStudentQuickCreateInput,
} from './student-quick-create';

const base = {
  firstName: 'سلمى',
  lastName: 'العلوي',
  firstNameLatin: 'Salma',
  lastNameLatin: 'Alaoui',
  gender: 'female',
  cycleId: '2',
  levelId: '77',
  schoolId: 3,
  academicYearId: 12,
};

const studentBilling = { mode: 'student' } as const;

describe('student quick create payload', () => {
  it('creates one atomic Student + Enrollment + student-billing payload without a class or finance selection', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation, studentBilling, '2026-08-24')).toEqual({
      first_name: 'سلمى',
      last_name: 'العلوي',
      name_ar: 'سلمى العلوي',
      name_latin: 'Salma Alaoui',
      gender: 'female',
      status: 'active',
      active: true,
      admission_date: '2026-08-24',
      enrollment: { actual_join_date: '2026-08-24' },
      academic: { school_id: 3, academic_year_id: 12, level_id: 77, enrollment_date: '2026-08-24' },
      quick_registration: { enabled: true },
      billing_responsibility: {
        mode: 'student',
        confirmed: true,
        reason: 'Student selected as payer during Quick Registration.',
      },
    });
    const payload = buildStudentQuickCreatePayload(validation, studentBilling, '2026-08-24');
    expect(payload).not.toHaveProperty('finance');
    expect(payload).not.toHaveProperty('fee_plan_id');
  });

  it('builds an atomic existing-guardian relationship using person_id', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, {
      mode: 'guardian',
      relationshipType: 'father',
      guardian: { kind: 'existing', personId: 41, hasContactPhone: true },
    }, '2026-08-24');
    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });
    expect(payload.guardian_relationships).toEqual([{
      person_id: 41,
      relationship_type: 'father',
      is_primary_contact: true,
      is_financial_responsible: true,
      receives_notifications: true,
      is_emergency_contact: true,
      is_authorized_pickup: false,
    }]);
    expect(payload).not.toHaveProperty('finance');
  });

  it('builds an atomic inline guardian without a pre-create guardian mutation', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, {
      mode: 'guardian',
      relationshipType: 'mother',
      guardian: { kind: 'new', fullName: '  Amina Alaoui  ', phone: ' 0612345678 ' },
    }, '2026-08-24');
    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });
    expect(payload.guardian_relationships).toEqual([{
      guardian: { full_name: 'Amina Alaoui', phone: '0612345678' },
      relationship_type: 'mother',
      is_primary_contact: true,
      is_financial_responsible: true,
      receives_notifications: true,
      is_emergency_contact: true,
      is_authorized_pickup: false,
    }]);
    expect(payload).not.toHaveProperty('finance');
  });

  it('preserves contact flags for an existing guardian without a phone', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, {
      mode: 'guardian',
      relationshipType: 'legal_guardian',
      guardian: { kind: 'existing', personId: 42, hasContactPhone: false },
    }, '2026-08-24');
    expect(payload.guardian_relationships?.[0]).toEqual(expect.objectContaining({
      receives_notifications: false,
      is_emergency_contact: false,
    }));
  });

  it('accepts a complete Arabic name without requiring French', () => {
    const validation = validateStudentQuickCreateInput({ ...base, firstNameLatin: '', lastNameLatin: '' });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation, studentBilling, '2026-08-24')).toEqual(
      expect.objectContaining({ first_name: 'سلمى', last_name: 'العلوي', name_ar: 'سلمى العلوي', gender: 'female' }),
    );
    expect(buildStudentQuickCreatePayload(validation, studentBilling, '2026-08-24')).not.toHaveProperty('name_latin');
  });

  it('accepts a complete French name without requiring Arabic', () => {
    const validation = validateStudentQuickCreateInput({ ...base, firstName: '', lastName: '' });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, studentBilling, '2026-08-24');
    expect(payload).toEqual(expect.objectContaining({ first_name: 'Salma', last_name: 'Alaoui', name_latin: 'Salma Alaoui', gender: 'female' }));
    expect(payload).not.toHaveProperty('name_ar');
  });

  it('always opts into the backend atomic quick-registration path', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, studentBilling, '2026-08-24');
    expect(payload.quick_registration).toEqual({ enabled: true });
    expect(payload.billing_responsibility).toEqual(expect.objectContaining({ mode: 'student' }));
  });

  it('requires gender, complete entered name pairs, level, and active academic context', () => {
    expect(validateStudentQuickCreateInput({ ...base, gender: '' })).toEqual({ valid: false, error: 'gender' });
    expect(validateStudentQuickCreateInput({ ...base, lastName: '' })).toEqual({ valid: false, error: 'name_ar' });
    expect(validateStudentQuickCreateInput({ ...base, lastNameLatin: '' })).toEqual({ valid: false, error: 'name_latin' });
    expect(validateStudentQuickCreateInput({ ...base, firstName: '', lastName: '', firstNameLatin: '', lastNameLatin: '' })).toEqual({ valid: false, error: 'name_ar' });
    expect(validateStudentQuickCreateInput({ ...base, cycleId: '' })).toEqual({ valid: false, error: 'cycle' });
    expect(validateStudentQuickCreateInput({ ...base, levelId: '' })).toEqual({ valid: false, error: 'level' });
    expect(validateStudentQuickCreateInput({ ...base, schoolId: null })).toEqual({ valid: false, error: 'context' });
  });

  it('opens the created student with post-setup progress enabled', () => {
    expect(buildStudentQuickCreateSuccessHref(84)).toBe('/admin/students/84?postSetup=1');
    expect(buildStudentQuickCreateSuccessHref(0)).toBe('/admin/students');
  });
});
