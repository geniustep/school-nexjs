import { describe, expect, it } from 'vitest';
import {
  admissionDetailToEditForm,
  buildPatchAdmissionPayload,
  mergeSelectedClassOption,
  resolveRefId,
} from './admission-edit-payload';
import type { AdmissionDetail } from '@/types/admission';

function makeDetail(overrides: Partial<AdmissionDetail> = {}): AdmissionDetail {
  return {
    id: 136,
    reference: 'ADM-136',
    state: 'new',
    student_name: 'محمد أمين',
    student_first_name: 'محمد',
    student_last_name: 'أمين',
    birth_date: '2015-03-12',
    gender: 'male',
    massar_code: 'M123456',
    guardian_name: 'ولي الأمر',
    guardian_phone: '0612345678',
    guardian_whatsapp: '0612345678',
    guardian_email: 'parent@example.com',
    relationship: 'father',
    academic_year: { id: 3, name: '2025-2026' },
    source: { id: 2, name: 'Walk-in' },
    requested_level: { id: 10, name: 'CP' },
    requested_class: { id: 55, name: 'CP-A' },
    external_reference: 'EXT-1',
    residence_address: 'الدار البيضاء',
    previous_school: 'مدرسة سابقة',
    internal_notes: 'ملاحظة',
    next_action: 'اتصال',
    next_action_date: '2026-07-10',
    first_contact_date: '2026-07-01',
    priority: 'normal',
    has_siblings: true,
    siblings_raw_text: 'أخ في CM2',
    allowed_actions: { edit: true },
    ...overrides,
  };
}

describe('admission edit payload', () => {
  it('maps admission detail into editable form state', () => {
    const form = admissionDetailToEditForm(makeDetail(), [
      { id: 10, name: 'CP', cycle: 'primary', requires_stream: false },
    ]);

    expect(form.child_first_name_ar).toBe('محمد');
    expect(form.child_last_name_ar).toBe('أمين');
    expect(form.birth_date).toBe('2015-03-12');
    expect(form.gender).toBe('male');
    expect(form.massar_code).toBe('M123456');
    expect(form.academic_year_id).toBe(3);
    expect(form.source_id).toBe(2);
    expect(form.requested_level_id).toBe(10);
    expect(form.requested_class_id).toBe(55);
    expect(form.requested_cycle_code).toBe('primary');
    expect(form.guardian_whatsapp).toBe('0612345678');
    expect(form.priority).toBe('normal');
    expect(form.has_siblings).toBe(true);
  });

  it('builds patch payload with student, guardian, and academic fields', () => {
    const form = admissionDetailToEditForm(makeDetail(), [
      { id: 10, name: 'CP', cycle: 'primary', requires_stream: false },
    ]);
    form.child_first_name_ar = 'سارة';
    form.guardian_phone = '0699999999';

    const payload = buildPatchAdmissionPayload(form, [
      { id: 10, name: 'CP', cycle: 'primary', requires_stream: false },
    ]);

    expect(payload.child_first_name_ar).toBe('سارة');
    expect(payload.student_name).toBe('سارة أمين');
    expect(payload.guardian_phone).toBe('0699999999');
    expect(payload.academic_year_id).toBe(3);
    expect(payload.requested_level_id).toBe(10);
    expect(payload.requested_class_id).toBeUndefined();
    expect(payload.gender).toBeUndefined();
    expect(payload.priority).toBeUndefined();
    expect(payload.next_action).toBe('اتصال');
  });

  it('sends only changed fields when baseline is provided', () => {
    const baseline = admissionDetailToEditForm(makeDetail(), [
      { id: 10, name: 'CP', cycle: 'primary', requires_stream: false },
    ]);
    const form = { ...baseline, guardian_phone: '0699999999' };

    const payload = buildPatchAdmissionPayload(form, [
      { id: 10, name: 'CP', cycle: 'primary', requires_stream: false },
    ], baseline);

    expect(payload).toEqual({ guardian_phone: '0699999999' });
  });

  it('maps gender option objects to select values', () => {
    const form = admissionDetailToEditForm(
      makeDetail({ gender: { value: 'female', label: 'أنثى' } as unknown as string }),
      [{ id: 10, name: 'CP', cycle: 'primary', requires_stream: false }],
    );

    expect(form.gender).toBe('female');
  });

  it('resolveRefId ignores false ids from Odoo refs', () => {
    expect(resolveRefId({ id: false, name: 'CP-A' })).toBeUndefined();
    expect(resolveRefId({ id: 55, name: 'CP-A' })).toBe(55);
  });

  it('mergeSelectedClassOption keeps current class visible in dropdown', () => {
    const merged = mergeSelectedClassOption([], 55, 'CP-A');
    expect(merged).toEqual([{ id: 55, name: 'CP-A', display_name: 'CP-A' }]);
  });

  it('splits full student name when first/last are missing', () => {
    const form = admissionDetailToEditForm(
      makeDetail({
        student_name: 'محمد أمين',
        student_first_name: null,
        student_last_name: null,
      }),
      [{ id: 10, name: 'CP', cycle: 'primary', requires_stream: false }],
    );

    expect(form.child_first_name_ar).toBe('محمد');
    expect(form.child_last_name_ar).toBe('أمين');
  });
});
