import { describe, expect, it } from 'vitest';
import {
  buildTeacherCreatePayload,
  buildTeacherUpdatePayload,
  defaultTeacherProfileFormState,
  hasTeacherGenderOptions,
  isTeacherProfileFormDirty,
  resolveStatusActiveConsistency,
  resolveTeacherLegacyGender,
  teacherProfileFormStateFromTeacher,
  validateTeacherProfileForm,
} from './teacher-profile';
import type { Teacher, TeacherOptions } from '@/types/teacher';

const t = (key: string) => key;

const options: TeacherOptions = {
  teacherTypes: [
    { value: 'unknown', label: 'Unknown' },
    { value: 'vacataire', label: 'Vacataire' },
  ],
  qualifications: [{ value: 'master', label: 'Master' }, { value: 'phd', label: 'PhD' }],
  contractTypes: [],
  statuses: [{ value: 'active', label: 'Active' }, { value: 'resigned', label: 'Resigned' }],
  genders: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ],
  schools: [{ id: 3, name: 'School', code: 'S1' }],
  defaults: { teacherType: 'unknown', status: 'active', active: true, preferCompactSchedule: false },
  constraints: { weeklyHours: { min: 0 }, maxContinuousMinutes: { min: 1 } },
};

describe('teacher profile payloads', () => {
  it('builds create payload with personal and professional fields', () => {
    const state = {
      ...defaultTeacherProfileFormState(options),
      name: 'Teacher A',
      gender: 'male',
      dateOfBirth: '1990-05-10',
      specialization: 'Math',
      teacherType: 'vacataire',
      qualification: 'master',
      weeklyHoursTarget: '18',
      weeklyHoursMax: '24',
      maxContinuousMinutes: '120',
      preferCompactSchedule: true,
    };

    const payload = buildTeacherCreatePayload(state, {}, options);
    expect(payload).toMatchObject({
      name: 'Teacher A',
      gender: 'male',
      date_of_birth: '1990-05-10',
      specialization: 'Math',
      teacher_type: 'vacataire',
      qualification: 'master',
      weekly_hours_target: 18,
      weekly_hours_max: 24,
      max_continuous_minutes: 120,
      prefer_compact_schedule: true,
      status: 'active',
      active: true,
    });
    expect(typeof payload.prefer_compact_schedule).toBe('boolean');
  });

  it('sends only changed fields on partial update', () => {
    const original = {
      ...defaultTeacherProfileFormState(options),
      name: 'Teacher A',
      qualification: 'master',
      weeklyHoursTarget: '18',
      teacherType: 'vacataire',
      status: 'active',
      active: true,
    };
    const current = { ...original, qualification: 'phd', weeklyHoursTarget: '20' };

    const payload = buildTeacherUpdatePayload(current, original, {}, options);
    expect(payload).toEqual({
      qualification: 'phd',
      weekly_hours_target: 20,
    });
  });

  it('does not send gender when official options are missing', () => {
    const optionsWithoutGender: TeacherOptions = { ...options, genders: [] };
    const state = {
      ...defaultTeacherProfileFormState(optionsWithoutGender),
      name: 'Teacher A',
      gender: 'male',
    };
    expect(hasTeacherGenderOptions(optionsWithoutGender)).toBe(false);
    const payload = buildTeacherCreatePayload(state, {}, optionsWithoutGender);
    expect(payload.gender).toBeUndefined();
  });

  it('rejects unofficial gender values when options exist', () => {
    const state = {
      ...defaultTeacherProfileFormState(options),
      name: 'Teacher',
      gender: 'custom_value',
    };
    const result = validateTeacherProfileForm(state, options, t);
    expect(result.valid).toBe(false);
    expect(result.errors.gender).toBe('admin.academicSetup.teacherForm.errors.invalidGender');
  });

  it('rejects gender in form state when options are unavailable', () => {
    const optionsWithoutGender: TeacherOptions = { ...options, genders: [] };
    const state = {
      ...defaultTeacherProfileFormState(optionsWithoutGender),
      name: 'Teacher',
      gender: 'male',
    };
    const result = validateTeacherProfileForm(state, optionsWithoutGender, t);
    expect(result.valid).toBe(false);
    expect(result.errors.gender).toBe('admin.academicSetup.teacherForm.errors.genderOptionsUnavailable');
  });

  it('preserves legacy gender for read-only display without putting it in form state', () => {
    const optionsWithoutGender: TeacherOptions = { ...options, genders: [] };
    const teacher = {
      id: 1,
      name: 'Legacy',
      code: null,
      phone: null,
      email: null,
      gender: 'male',
      classes: [],
      subjects: [],
      status: 'active',
      qualification: null,
      specialization: null,
    } as Teacher;
    const form = teacherProfileFormStateFromTeacher(teacher, optionsWithoutGender);
    expect(form.gender).toBe('');
    expect(resolveTeacherLegacyGender(teacher, optionsWithoutGender)).toBe('male');
  });

  it('does not send gender on update when options are unavailable', () => {
    const optionsWithoutGender: TeacherOptions = { ...options, genders: [] };
    const original = { ...defaultTeacherProfileFormState(optionsWithoutGender), name: 'Teacher A' };
    const current = { ...original, name: 'Teacher B', gender: 'male' };
    const payload = buildTeacherUpdatePayload(current, original, {}, optionsWithoutGender);
    expect(payload.name).toBe('Teacher B');
    expect(payload.gender).toBeUndefined();
  });

  it('clears personal fields explicitly on update', () => {
    const original = {
      ...defaultTeacherProfileFormState(options),
      gender: 'male',
      dateOfBirth: '1990-01-01',
      specialization: 'Math',
    };
    const current = { ...original, gender: '', dateOfBirth: '', specialization: '' };
    const payload = buildTeacherUpdatePayload(current, original, {}, options);
    expect(payload.gender).toBe('');
    expect(payload.date_of_birth).toBeNull();
    expect(payload.specialization).toBe('');
  });

  it('does not reset untouched professional fields when only name changes', () => {
    const teacher = {
      id: 1,
      name: 'Old',
      code: 'T1',
      phone: null,
      email: null,
      classes: [],
      subjects: [],
      status: 'active',
      qualification: 'master',
      specialization: null,
      teacher_type: 'vacataire',
      weekly_hours_target: 18,
      prefer_compact_schedule: true,
      active: true,
    } as Teacher;

    const original = teacherProfileFormStateFromTeacher(teacher, options);
    const current = { ...original, name: 'New' };
    const payload = buildTeacherUpdatePayload(current, original, {}, options);
    expect(payload).toEqual({ name: 'New' });
    expect(payload.teacher_type).toBeUndefined();
    expect(payload.prefer_compact_schedule).toBeUndefined();
  });
});

describe('validateTeacherProfileForm', () => {
  it('rejects future date of birth', () => {
    const state = {
      ...defaultTeacherProfileFormState(options),
      name: 'Teacher',
      dateOfBirth: '2099-01-01',
    };
    const result = validateTeacherProfileForm(state, options, t);
    expect(result.valid).toBe(false);
    expect(result.errors.dateOfBirth).toBe('admin.academicSetup.teacherForm.errors.futureDateOfBirth');
  });

  it('rejects max weekly hours below target', () => {
    const state = {
      ...defaultTeacherProfileFormState(options),
      name: 'Teacher',
      weeklyHoursTarget: '20',
      weeklyHoursMax: '10',
    };
    const result = validateTeacherProfileForm(state, options, t);
    expect(result.valid).toBe(false);
    expect(result.errors.weeklyHoursMax).toBe('admin.academicSetup.teacherForm.errors.maxBelowTarget');
  });

  it('keeps distinct subjects logic untouched by allowing empty optional hours', () => {
    const state = { ...defaultTeacherProfileFormState(options), name: 'Teacher' };
    const result = validateTeacherProfileForm(state, options, t);
    expect(result.valid).toBe(true);
  });
});

describe('resolveStatusActiveConsistency', () => {
  it('deactivates teacher when status is resigned', () => {
    const next = resolveStatusActiveConsistency({
      ...defaultTeacherProfileFormState(options),
      status: 'resigned',
      active: true,
    });
    expect(next.active).toBe(false);
  });
});

describe('isTeacherProfileFormDirty', () => {
  it('detects boolean preference changes', () => {
    const base = defaultTeacherProfileFormState(options);
    const changed = { ...base, preferCompactSchedule: true };
    expect(isTeacherProfileFormDirty(changed, base)).toBe(true);
  });
});
