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

describe('student quick create payload', () => {
  it('creates the minimal quick-registration Student + Enrollment payload without a class', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation, '2026-08-24')).toEqual({
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
    });
  });

  it('accepts a complete Arabic name without requiring French', () => {
    const validation = validateStudentQuickCreateInput({
      ...base,
      firstNameLatin: '',
      lastNameLatin: '',
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation, '2026-08-24')).toEqual(
      expect.objectContaining({
        first_name: 'سلمى',
        last_name: 'العلوي',
        name_ar: 'سلمى العلوي',
        gender: 'female',
      }),
    );
    expect(buildStudentQuickCreatePayload(validation, '2026-08-24')).not.toHaveProperty('name_latin');
  });

  it('accepts a complete French name without requiring Arabic', () => {
    const validation = validateStudentQuickCreateInput({
      ...base,
      firstName: '',
      lastName: '',
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, '2026-08-24');
    expect(payload).toEqual(
      expect.objectContaining({
        first_name: 'Salma',
        last_name: 'Alaoui',
        name_latin: 'Salma Alaoui',
        gender: 'female',
      }),
    );
    expect(payload).not.toHaveProperty('name_ar');
  });

  it('always opts into the backend durable post-setup path', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation, '2026-08-24').quick_registration).toEqual({ enabled: true });
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
