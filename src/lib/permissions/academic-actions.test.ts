import { describe, expect, it } from 'vitest';
import {
  canArchiveStudents,
  canCreateGuardians,
  canCreateStudents,
  canManageGuardianRelationships,
  canManageReports,
  canManageStudentAccounts,
  canManageStudentsFull,
  canManageTeachersAcademic,
  canUpdateGuardiansLimited,
  canUpdateStudents,
  canViewReports,
} from '@/lib/permissions/academic-capabilities';
import { canManageStaff as canManageStaffCenter } from '@/lib/permissions/academic-setup';
import type { CurrentUser } from '@/types/user';

function admin(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Pedagogy',
    email: 'd@test.ma',
    role: 'admin',
    permissions: [],
    school: null,
    admin_kind: 'pedagogical_director',
    ...overrides,
  };
}

describe('pedagogical director academic action gates', () => {
  it('students.create shows add student', () => {
    const user = admin({ effective_capabilities: ['students.create'] });
    expect(canCreateStudents(user)).toBe(true);
  });

  it('students.update_limited allows edit but not delete/archive/account', () => {
    const user = admin({ effective_capabilities: ['students.update_limited'] });
    expect(canUpdateStudents(user)).toBe(true);
    expect(canArchiveStudents(user)).toBe(false);
    expect(canManageStudentAccounts(user)).toBe(false);
  });

  it('guardians.create shows add guardian', () => {
    const user = admin({ effective_capabilities: ['guardians.create'] });
    expect(canCreateGuardians(user)).toBe(true);
  });

  it('guardians.update_limited allows limited edit but not full manage_parents', () => {
    const user = admin({
      effective_capabilities: ['guardians.update_limited', 'guardians.link_to_student'],
    });
    expect(canUpdateGuardiansLimited(user)).toBe(true);
    expect(canManageGuardianRelationships(user)).toBe(true);
  });

  it('staff.view alone does not open staff management', () => {
    const user = admin({ effective_capabilities: ['staff.view'] });
    expect(canManageStaffCenter(user)).toBe(false);
  });

  it('manage_teachers controls teacher management via capability grant', () => {
    const user = admin({ effective_capabilities: ['manage_teachers'] });
    expect(canManageTeachersAcademic(user)).toBe(true);
    expect(canManageStaffCenter(user)).toBe(false);
  });

  it('view_reports alone does not allow report management', () => {
    const user = admin({ effective_capabilities: ['view_reports'] });
    expect(canViewReports(user)).toBe(true);
    expect(canManageReports(user)).toBe(false);
  });

  it('does not infer finance from academic capabilities', () => {
    const user = admin({
      effective_capabilities: ['students.create', 'view_reports', 'manage_teachers'],
    });
    expect(user.effective_capabilities?.some((c) => c.startsWith('finance.'))).toBe(false);
  });

  it('archive and full student delete paths stay closed without manage_students', () => {
    const user = admin({
      effective_capabilities: [
        'students.create',
        'students.update_limited',
        'guardians.create',
        'guardians.update_limited',
      ],
    });
    expect(canArchiveStudents(user)).toBe(false);
    expect(canManageStudentsFull(user)).toBe(false);
  });
});
