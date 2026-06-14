import { describe, expect, it } from 'vitest';
import {
  buildStudentCreatePayload,
  buildStudentPartialUpdatePayload,
  defaultStudentProfileFormState,
  requiresDepartureReason,
  requiresPreviousSchool,
  validateStudentProfileForm,
} from './student-profile';
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
