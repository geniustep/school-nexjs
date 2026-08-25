import { describe, expect, it } from 'vitest';
import { buildStudentQuickCreatePayload, validateStudentQuickCreateInput } from './student-quick-create';

describe('student quick create payload', () => {
  it('creates the minimal student and academic placement without a class', () => {
    const validation = validateStudentQuickCreateInput({
      firstName: 'سلمى', lastName: 'العلوي', firstNameLatin: 'Salma', lastNameLatin: 'Alaoui', cycleId: '2', levelId: '77', schoolId: 3, academicYearId: 12,
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation, '2026-08-24')).toEqual({
      first_name: 'سلمى', last_name: 'العلوي', name_ar: 'سلمى العلوي', name_latin: 'Salma Alaoui', status: 'active', active: true,
      admission_date: '2026-08-24', enrollment: { actual_join_date: '2026-08-24' },
      academic: { school_id: 3, academic_year_id: 12, level_id: 77, enrollment_date: '2026-08-24' },
    });
  });

  it('requires a complete name, level, and active academic context', () => {
    const base = { firstName: 'سلمى', lastName: 'العلوي', firstNameLatin: 'Salma', lastNameLatin: 'Alaoui', cycleId: '2', levelId: '77', schoolId: 3, academicYearId: 12 };
    expect(validateStudentQuickCreateInput({ ...base, lastName: '' })).toEqual({ valid: false, error: 'name_ar' });
    expect(validateStudentQuickCreateInput({ ...base, lastNameLatin: '' })).toEqual({ valid: false, error: 'name_latin' });
    expect(validateStudentQuickCreateInput({ ...base, cycleId: '' })).toEqual({ valid: false, error: 'cycle' });
    expect(validateStudentQuickCreateInput({ ...base, levelId: '' })).toEqual({ valid: false, error: 'level' });
    expect(validateStudentQuickCreateInput({ ...base, schoolId: null })).toEqual({ valid: false, error: 'context' });
  });
});
