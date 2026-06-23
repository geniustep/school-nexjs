import { describe, expect, it } from 'vitest';
import {
  canViewStaffAdminPrivateFields,
  canViewTeacherAdminPrivateFields,
  hasLinkedTeacherProfile,
  resolveTeacherId,
  shouldUseTeacherWorkspace,
} from '@/lib/auth/teacher-workspace';
import { homeForUser } from '@/lib/routes/role-routes';
import type { CurrentUser } from '@/types/user';

function user(partial: Partial<CurrentUser> & Pick<CurrentUser, 'id' | 'role'>): CurrentUser {
  return {
    name: 'Teacher',
    email: null,
    permissions: [],
    school: null,
    ...partial,
  };
}

describe('shouldUseTeacherWorkspace', () => {
  it('returns true for native teacher role', () => {
    expect(shouldUseTeacherWorkspace(user({ id: 1, role: 'teacher' }))).toBe(true);
  });

  it('returns true for Smart Staff admin_staff with teacher_id', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({ id: 4706, role: 'admin', admin_kind: 'admin_staff', teacher_id: 1306, is_teacher: true }),
      ),
    ).toBe(true);
  });

  it('returns false for school manager even with teacher_id', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({ id: 2, role: 'admin', admin_kind: 'school_manager', teacher_id: 1306 }),
      ),
    ).toBe(false);
  });

  it('returns true for admin_staff with roles including teacher (no teacher_id)', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({
          id: 4905,
          role: 'admin',
          admin_kind: 'admin_staff',
          roles: ['admin', 'teacher'],
          active_role: 'admin',
        }),
      ),
    ).toBe(true);
  });

  it('returns false for admin_staff without teacher indicators', () => {
    expect(shouldUseTeacherWorkspace(user({ id: 3, role: 'admin', admin_kind: 'admin_staff' }))).toBe(
      false,
    );
  });
});

describe('homeForUser', () => {
  it('routes Smart Staff teacher to /teacher/dashboard', () => {
    expect(
      homeForUser(
        user({ id: 4706, role: 'admin', admin_kind: 'admin_staff', teacher_id: 1306, is_teacher: true }),
      ),
    ).toBe('/teacher/dashboard');
  });

  it('routes dual-role admin_staff with roles[] to /teacher/dashboard', () => {
    expect(
      homeForUser(
        user({ id: 4905, role: 'admin', admin_kind: 'admin_staff', roles: ['admin', 'teacher'] }),
      ),
    ).toBe('/teacher/dashboard');
  });
});

describe('resolveTeacherId', () => {
  it('reads teacher_id from /me payload', () => {
    expect(resolveTeacherId(user({ id: 1, role: 'admin', teacher_id: 1306 }))).toBe(1306);
  });
});

describe('hasLinkedTeacherProfile', () => {
  it('returns false when teacher_id is missing', () => {
    expect(
      hasLinkedTeacherProfile(
        user({ id: 4905, role: 'admin', admin_kind: 'admin_staff', roles: ['admin', 'teacher'] }),
      ),
    ).toBe(false);
  });

  it('returns true when teacher_id is present', () => {
    expect(
      hasLinkedTeacherProfile(
        user({ id: 4706, role: 'admin', admin_kind: 'admin_staff', teacher_id: 1306 }),
      ),
    ).toBe(true);
  });
});

describe('privacy helpers', () => {
  const teacherUser = user({
    id: 4706,
    role: 'admin',
    admin_kind: 'admin_staff',
    teacher_id: 1306,
    is_teacher: true,
  });

  const dualRoleTeacher = user({
    id: 4905,
    role: 'admin',
    admin_kind: 'admin_staff',
    roles: ['admin', 'teacher'],
  });

  it('hides staff admin fields for teacher viewing own staff record', () => {
    expect(canViewStaffAdminPrivateFields(teacherUser, 4706)).toBe(false);
    expect(canViewStaffAdminPrivateFields(dualRoleTeacher, 4905)).toBe(false);
    expect(canViewStaffAdminPrivateFields(teacherUser, 999)).toBe(true);
  });

  it('hides teacher admin fields for teacher viewing own teacher profile', () => {
    expect(canViewTeacherAdminPrivateFields(teacherUser, 1306)).toBe(false);
    expect(canViewTeacherAdminPrivateFields(teacherUser, 999)).toBe(true);
  });
});
