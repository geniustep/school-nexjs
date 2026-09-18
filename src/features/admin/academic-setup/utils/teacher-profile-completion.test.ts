import { describe, expect, it } from 'vitest';
import type { Teacher, TeacherOptions } from '@/types/teacher';
import {
  buildTeacherUpdatePayload,
  mapTeacherApiFieldError,
  teacherProfileFormStateFromTeacher,
} from './teacher-profile';

const options: TeacherOptions = {
  teacherTypes: [{ value: 'subject_teacher', label: 'Subject teacher' }],
  qualifications: [{ value: 'bachelor', label: 'Bachelor' }],
  contractTypes: [
    { value: 'permanent', label: 'Permanent' },
    { value: 'temporary', label: 'Temporary' },
  ],
  statuses: [{ value: 'active', label: 'Active' }],
  genders: [{ value: 'male', label: 'Male' }],
  schools: [{ id: 1, name: 'School' }],
  defaults: { teacherType: 'subject_teacher', status: 'active', active: true },
  constraints: { weeklyHours: { min: 0 }, maxContinuousMinutes: { min: 1 } },
};

function teacherFixture(): Teacher {
  return {
    id: 42,
    name: 'Operational Name',
    code: 'T-42',
    phone: '0600000000',
    email: 'teacher@example.test',
    identity: {
      name_ar: 'الأستاذ محمد',
      name_fr: 'Mohamed Enseignant',
      partner_id: 500,
    },
    hire_date: '2024-09-01',
    contract_type: 'permanent',
    gender: 'male',
    date_of_birth: '1990-01-10',
    school: { id: 1, name: 'School' },
    school_id: 1,
    school_ids: [{ id: 1, name: 'School' }],
    classes: [],
    subjects: [],
    status: 'active',
    active: true,
    qualification: 'bachelor',
    specialization: 'Mathematics',
    teacher_type: 'subject_teacher',
    weekly_hours_target: 20,
    weekly_hours_max: 24,
    max_continuous_minutes: 120,
    prefer_compact_schedule: false,
  };
}

describe('teacher profile completion contract', () => {
  it('hydrates bilingual identity and employment fields from Teacher Detail', () => {
    const state = teacherProfileFormStateFromTeacher(teacherFixture(), options);

    expect(state.nameAr).toBe('الأستاذ محمد');
    expect(state.nameFr).toBe('Mohamed Enseignant');
    expect(state.hireDate).toBe('2024-09-01');
    expect(state.contractType).toBe('permanent');
  });

  it('sends exact additive keys when bilingual identity and employment fields change', () => {
    const original = teacherProfileFormStateFromTeacher(teacherFixture(), options);
    const current = {
      ...original,
      nameAr: 'الأستاذ محمد الجديد',
      nameFr: 'Mohamed Nouveau',
      hireDate: '2025-09-01',
      contractType: 'temporary',
    };

    expect(buildTeacherUpdatePayload(current, original, {}, options)).toEqual({
      name_ar: 'الأستاذ محمد الجديد',
      name_fr: 'Mohamed Nouveau',
      hire_date: '2025-09-01',
      contract_type: 'temporary',
    });
  });

  it('uses explicit null clear semantics and never includes guardian context in the payload', () => {
    const original = teacherProfileFormStateFromTeacher(teacherFixture(), options);
    const current = {
      ...original,
      nameAr: '',
      nameFr: '',
      hireDate: '',
      contractType: '',
    };

    const payload = buildTeacherUpdatePayload(current, original, {}, options);
    expect(payload).toEqual({
      name_ar: null,
      name_fr: null,
      hire_date: null,
      contract_type: null,
    });
    expect(payload).not.toHaveProperty('guardian_context');
    expect(payload).not.toHaveProperty('guardian_id');
    expect(payload).not.toHaveProperty('children');
  });

  it('maps missing canonical Person identity onto both bilingual fields', () => {
    const mapped = mapTeacherApiFieldError(
      'teacher_identity_partner_unavailable',
      (key) => key === 'admin.teacherProfile.identityPartnerUnavailable' ? 'identity unavailable' : key,
    );

    expect(mapped.nameAr).toBe('identity unavailable');
    expect(mapped.nameFr).toBe('identity unavailable');
    expect(mapped.global).toBe('identity unavailable');
  });
});
