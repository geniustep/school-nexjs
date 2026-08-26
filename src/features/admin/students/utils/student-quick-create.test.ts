import { describe, expect, it } from 'vitest';
import { buildStudentQuickCreatePayload, validateStudentQuickCreateInput } from './student-quick-create';

const base = {
  language: 'ar' as const,
  firstName: 'سلمى',
  lastName: 'العلوي',
  cycleId: '2',
  levelId: '77',
  schoolId: 3,
  academicYearId: 12,
  guardianIsFinancialResponsible: true,
  createGuardian: false,
  guardians: [{ name: '', phone: '', relationshipType: 'father' as const }],
};

describe('student quick create payload', () => {
  it('accepts an Arabic pair without French fields and sends only the Arabic pair', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, '2026-08-26');
    expect(payload.first_name_ar).toBe('سلمى');
    expect(payload.last_name_ar).toBe('العلوي');
    expect(payload).not.toHaveProperty('first_name_fr');
    expect(payload).not.toHaveProperty('last_name_fr');
  });

  it('accepts a French pair without Arabic fields and sends only the French pair', () => {
    const validation = validateStudentQuickCreateInput({
      ...base,
      language: 'fr',
      firstName: 'Salma',
      lastName: 'Alaoui',
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, '2026-08-26');
    expect(payload.first_name_fr).toBe('Salma');
    expect(payload.last_name_fr).toBe('Alaoui');
    expect(payload).not.toHaveProperty('first_name_ar');
    expect(payload).not.toHaveProperty('last_name_ar');
  });

  it('requires the selected-language pair', () => {
    expect(validateStudentQuickCreateInput({ ...base, lastName: '' })).toEqual({ valid: false, error: 'name' });
    expect(validateStudentQuickCreateInput({ ...base, language: 'fr', firstName: '', lastName: 'Alaoui' })).toEqual({ valid: false, error: 'name' });
  });

  it('requires cycle, level and active academic context', () => {
    expect(validateStudentQuickCreateInput({ ...base, cycleId: '' })).toEqual({ valid: false, error: 'cycle' });
    expect(validateStudentQuickCreateInput({ ...base, levelId: '' })).toEqual({ valid: false, error: 'level' });
    expect(validateStudentQuickCreateInput({ ...base, schoolId: null })).toEqual({ valid: false, error: 'context' });
    expect(validateStudentQuickCreateInput({ ...base, academicYearId: null })).toEqual({ valid: false, error: 'context' });
  });

  it('enables durable Quick Registration and automatic finance without class or services', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation, '2026-08-26');
    expect(payload.quick_registration).toEqual({
      enabled: true,
      guardian_is_financial_responsible: true,
      create_guardians: [],
      auto_finance_setup: true,
    });
    expect(payload).not.toHaveProperty('class_id');
    expect(payload.quick_registration).not.toHaveProperty('service_ids');
    expect(payload.quick_registration).not.toHaveProperty('tariff_id');
    expect(payload).not.toHaveProperty('finance');
  });

  it('serializes one guardian with the canonical minimal intent', () => {
    const validation = validateStudentQuickCreateInput({
      ...base,
      createGuardian: true,
      guardians: [{ name: 'أحمد العلوي', phone: '0612345678', relationshipType: 'father' }],
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation).quick_registration.create_guardians).toEqual([
      { name: 'أحمد العلوي', phone: '0612345678', relationship_type: 'father' },
    ]);
  });

  it('preserves multiple guardians in UI order', () => {
    const validation = validateStudentQuickCreateInput({
      ...base,
      createGuardian: true,
      guardians: [
        { name: 'الأب', phone: '0611111111', relationshipType: 'father' },
        { name: 'الأم', phone: '0622222222', relationshipType: 'mother' },
      ],
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation).quick_registration.create_guardians.map((g) => g.relationship_type)).toEqual(['father', 'mother']);
  });

  it('requires all guardian fields only when guardian creation is enabled', () => {
    expect(validateStudentQuickCreateInput({
      ...base,
      createGuardian: true,
      guardians: [{ name: 'ولي', phone: '', relationshipType: 'father' }],
    })).toEqual({ valid: false, error: 'guardian' });
    expect(validateStudentQuickCreateInput({ ...base, createGuardian: false })).toMatchObject({ valid: true });
  });

  it('drops guardian intent when financial responsibility is disabled', () => {
    const validation = validateStudentQuickCreateInput({
      ...base,
      guardianIsFinancialResponsible: false,
      createGuardian: true,
      guardians: [{ name: 'ولي', phone: '0611111111', relationshipType: 'father' }],
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    const payload = buildStudentQuickCreatePayload(validation);
    expect(payload.quick_registration.guardian_is_financial_responsible).toBe(false);
    expect(payload.quick_registration.create_guardians).toEqual([]);
  });

  it('keeps the academic core minimal and class-free', () => {
    const validation = validateStudentQuickCreateInput(base);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(buildStudentQuickCreatePayload(validation, '2026-08-26').academic).toEqual({
      school_id: 3,
      academic_year_id: 12,
      level_id: 77,
      enrollment_date: '2026-08-26',
    });
  });
});
