import { describe, expect, it } from 'vitest';
import { todayIsoDate } from '@/features/admin/students/utils/student-profile';
import { resolveDefaultAcademicYearId } from '@/features/admin/students/utils/student-profile';
import {
  buildCreateAdmissionPayload,
  emptyAdmissionCreateForm,
} from './admission-create-payload';
import {
  buildCreateFamilyBatchPayload,
  validateFamilyAdmissionForm,
} from './family-admission-payload';
import { emptyFamilyAdmissionFormState } from './family-admission-form-state';

describe('admissions intake academic UX alignment', () => {
  it('defaults individual registration dates to local today', () => {
    const today = todayIsoDate();
    const form = emptyAdmissionCreateForm(today);
    expect(form.admission_date).toBe(today);
    expect(form.first_contact_date).toBe(today);
    expect(form.actual_join_date).toBe(today);
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Local calendar components — not UTC slice of toISOString
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(today).toBe(expected);
  });

  it('keeps a manually changed admission date when rebuilding unrelated fields', () => {
    const form = emptyAdmissionCreateForm(todayIsoDate());
    form.admission_date = '2026-01-15';
    form.child_first_name_ar = 'سلمى';
    form.child_last_name_ar = 'العلوي';
    form.gender = 'female';
    form.birth_date = '2018-05-15';
    form.guardian_name = 'أحمد';
    form.guardian_phone = '0612345678';
    form.academic_year_id = 3;
    form.requested_cycle_code = 'primary';
    form.requested_level_id = 77;
    const payload = buildCreateAdmissionPayload(form, 3, [
      { id: 77, name: 'CP', cycle: 'primary', requires_stream: false },
    ]);
    expect(payload.admission_date).toBe('2026-01-15');
  });

  it('selects the current academic year by default helper', () => {
    expect(
      resolveDefaultAcademicYearId([
        { id: 1, is_current: false },
        { id: 9, is_current: true },
        { id: 2, is_current: false },
      ]),
    ).toBe('9');
  });

  it('omits requested_class_id from individual create payload', () => {
    const form = emptyAdmissionCreateForm(todayIsoDate());
    form.child_first_name_ar = 'سلمى';
    form.child_last_name_ar = 'العلوي';
    form.gender = 'female';
    form.birth_date = '2018-05-15';
    form.guardian_name = 'أحمد';
    form.guardian_phone = '0612345678';
    form.academic_year_id = 3;
    form.requested_cycle_code = 'primary';
    form.requested_level_id = 77;
    form.requested_class_id = 999;
    const payload = buildCreateAdmissionPayload(form, 3, [
      { id: 77, name: 'CP', cycle: 'primary', requires_stream: false },
    ]);
    expect(payload.academic_year_id).toBe(3);
    expect(payload.requested_level_id).toBe(77);
    expect(payload.requested_cycle_code).toBe('primary');
    expect(payload).not.toHaveProperty('requested_class_id');
  });

  it('family batch payload keeps year id and omits class', () => {
    const form = emptyFamilyAdmissionFormState('2026-07-09');
    form.family = {
      guardian_name: 'أحمد العلوي',
      guardian_phone: '0612345678',
      guardian_whatsapp: '',
      guardian_email: '',
      guardian_relationship: 'father',
      shared_address: 'الدار البيضاء',
      source_id: 10,
      academic_year_id: 3,
      first_contact_date: '2026-07-09',
    };
    form.children[0] = {
      ...form.children[0],
      child_first_name_ar: 'سلمى',
      child_last_name_ar: 'العلوي',
      gender: 'female',
      birth_date: '2018-05-15',
      requested_cycle_code: 'primary',
      requested_level_id: 77,
    };
    form.children[1] = {
      ...form.children[1],
      child_first_name_ar: 'ياسين',
      child_last_name_ar: 'العلوي',
      gender: 'male',
      birth_date: '2016-03-20',
      requested_cycle_code: 'middle_school',
      requested_level_id: 2447,
    };
    expect(validateFamilyAdmissionForm(form)).toBeNull();
    const payload = buildCreateFamilyBatchPayload(
      form,
      3,
      'fam-adm-test',
      [
        { id: 77, name: 'CP', cycle: 'primary', requires_stream: false },
        { id: 2447, name: '2 APIC', cycle: 'middle_school', requires_stream: false },
      ],
    );
    expect(payload.academic_year_id).toBe(3);
    expect(payload.first_contact_date).toBe('2026-07-09');
    for (const child of payload.children) {
      expect(child).not.toHaveProperty('requested_class_id');
      expect(child).not.toHaveProperty('class_id');
      expect(child.requested_level_id).toBeTruthy();
      expect(child.requested_cycle_code).toBeTruthy();
    }
  });

  it('defaults family first_contact_date to provided local today', () => {
    const form = emptyFamilyAdmissionFormState('2026-07-09');
    expect(form.family.first_contact_date).toBe('2026-07-09');
  });
});
