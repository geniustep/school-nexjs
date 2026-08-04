import { describe, expect, it } from 'vitest';
import {
  assertSafeTeacherCreatePayload,
  buildSimplifiedTeacherCreatePayload,
  createEmptyTeacherCreateAssignmentDraft,
  findDuplicateTeacherCreateAssignmentKey,
  normalizeTeacherCreateResult,
  validateTeacherCreateForm,
} from './teacher-create';
import type { TeacherOptions } from '@/types/teacher';

const t = (key: string) => key;

const options: TeacherOptions = {
  teacherTypes: [{ value: 'unknown', label: 'Unknown' }],
  qualifications: [],
  contractTypes: [],
  statuses: [{ value: 'active', label: 'Active' }],
  genders: [],
  schools: [{ id: 3, name: 'School', code: 'S1' }],
  defaults: { teacherType: 'unknown', status: 'active', active: true },
  constraints: {},
};

describe('teacher-create simplified payload', () => {
  it('builds name-only payload without code, account, login, or password', () => {
    const payload = buildSimplifiedTeacherCreatePayload(
      { name: 'أستاذ تجريبي', phone: '', email: '', schoolId: '3' },
      [],
      options,
    );
    expect(payload).toEqual({
      name: 'أستاذ تجريبي',
      teacher_type: 'unknown',
      status: 'active',
      active: true,
    });
    expect(payload).not.toHaveProperty('code');
    expect(payload).not.toHaveProperty('create_account');
    expect(payload).not.toHaveProperty('account');
    expect(payload).not.toHaveProperty('login');
    expect(payload).not.toHaveProperty('password');
    expect(assertSafeTeacherCreatePayload(payload)).toBe(true);
  });

  it('sends contact email without create_account flag', () => {
    const payload = buildSimplifiedTeacherCreatePayload(
      {
        name: 'أستاذة نور',
        phone: '0612345678',
        email: 'nour@example.invalid',
        schoolId: '',
      },
      [],
      options,
    );
    expect(payload.email).toBe('nour@example.invalid');
    expect(payload.phone).toBe('0612345678');
    expect(payload).not.toHaveProperty('create_account');
  });

  it('embeds assignments atomically without weekly_hours', () => {
    const rows = [
      { ...createEmptyTeacherCreateAssignmentDraft(), classId: 10, subjectId: 20 },
      { ...createEmptyTeacherCreateAssignmentDraft(), classId: 11, subjectId: 21 },
    ];
    const payload = buildSimplifiedTeacherCreatePayload(
      { name: 'أستاذ خالد', phone: '', email: '', schoolId: '' },
      rows,
      options,
    );
    expect(payload.assignments).toEqual([
      { class_id: 10, subject_id: 20, role: 'main' },
      { class_id: 11, subject_id: 21, role: 'main' },
    ]);
    expect(JSON.stringify(payload)).not.toContain('weekly_hours');
  });

  it('blocks duplicate class+subject locally', () => {
    const rows = [
      { ...createEmptyTeacherCreateAssignmentDraft(), classId: 1, subjectId: 2 },
      { ...createEmptyTeacherCreateAssignmentDraft(), classId: 1, subjectId: 2 },
    ];
    expect(findDuplicateTeacherCreateAssignmentKey(rows)).toBe('1:2');
    const validation = validateTeacherCreateForm(
      { name: 'أستاذ', phone: '', email: '', schoolId: '' },
      rows,
      options,
      t,
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.assignments).toBeTruthy();
  });

  it('requires name only', () => {
    const validation = validateTeacherCreateForm(
      { name: '  ', phone: '', email: '', schoolId: '' },
      [],
      options,
      t,
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.name).toBeTruthy();
  });
});

describe('normalizeTeacherCreateResult', () => {
  it('preserves backend can_login and password_setup_required without local inference', () => {
    const result = normalizeTeacherCreateResult({
      id: 55,
      name: 'أستاذ جديد',
      account: {
        created: true,
        user_id: 90,
        status: 'password_setup_required',
        password_was_set: false,
        can_login: false,
      },
      assignments: { requested: 1, created: 1, items: [{ id: 1 }] },
      lifecycle: {
        teacher_registered: true,
        has_account: true,
        can_login: false,
        has_assignments: true,
        assignments_count: 1,
      },
    });
    expect(result).toMatchObject({
      teacher_id: 55,
      account: {
        created: true,
        status: 'password_setup_required',
        can_login: false,
        password_was_set: false,
      },
      lifecycle: {
        has_account: true,
        can_login: false,
        assignments_count: 1,
      },
    });
    // Must not flip can_login just because has_account is true.
    expect(result?.lifecycle.can_login).toBe(false);
    expect(result?.account.can_login).toBe(false);
  });

  it('reads teacher id from nested item', () => {
    const result = normalizeTeacherCreateResult({
      item: { id: 12, name: 'A' },
      account: { created: true, status: 'password_setup_required', can_login: false, password_was_set: false },
      assignments: { requested: 0, created: 0 },
      lifecycle: {
        teacher_registered: true,
        has_account: true,
        can_login: false,
        has_assignments: false,
        assignments_count: 0,
      },
    });
    expect(result?.teacher_id).toBe(12);
    expect(result?.lifecycle.assignments_count).toBe(0);
  });
});
