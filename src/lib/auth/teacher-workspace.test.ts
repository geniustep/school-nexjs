import { describe, expect, it } from 'vitest';
import {
  canViewStaffAdminPrivateFields,
  canViewTeacherAdminPrivateFields,
  hasLinkedTeacherProfile,
  resolveTeacherId,
  shouldUseTeacherWorkspace,
} from '@/lib/auth/teacher-workspace';
import { homeForUser } from '@/lib/routes/role-routes';
import { navForUser } from '@/components/navigation/nav-config';
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

  it('returns true when active_role is teacher even for school_manager', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({
          id: 2,
          role: 'teacher',
          active_role: 'teacher',
          admin_kind: 'school_manager',
          available_roles: [
            { code: 'admin', label: 'مدير' },
            { code: 'teacher', label: 'أستاذة' },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('returns false for admin_staff with teacher_id when active_role is admin', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({
          id: 4706,
          role: 'admin',
          active_role: 'admin',
          admin_kind: 'admin_staff',
          teacher_id: 1306,
          is_teacher: true,
          available_roles: [
            { code: 'admin', label: 'مدير' },
            { code: 'teacher', label: 'أستاذة' },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('returns true for admin_staff when active_role is teacher', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({
          id: 4706,
          role: 'teacher',
          active_role: 'teacher',
          teacher_id: 1306,
          is_teacher: true,
          available_roles: [
            { code: 'admin', label: 'مدير' },
            { code: 'teacher', label: 'أستاذة' },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('returns false for school manager with active_role admin', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({
          id: 2,
          role: 'admin',
          active_role: 'admin',
          admin_kind: 'school_manager',
          teacher_id: 1306,
        }),
      ),
    ).toBe(false);
  });

  it('returns false for admin_staff with roles including teacher but active_role admin', () => {
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
    ).toBe(false);
  });

  it('returns false for RCO admin_staff without teacher active_role', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({
          id: 5065,
          role: 'admin',
          admin_kind: 'admin_staff',
          roles: ['admin', 'teacher'],
          active_role: 'admin',
          creation_template_code: 'registration_collections_officer',
          is_teacher: false,
        }),
      ),
    ).toBe(false);
  });

  it('returns false for admin_staff without teacher indicators', () => {
    expect(shouldUseTeacherWorkspace(user({ id: 3, role: 'admin', admin_kind: 'admin_staff' }))).toBe(
      false,
    );
  });

  it('returns false for legacy admin manager done', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({
          id: 1,
          role: 'admin',
          admin_kind: 'legacy_admin',
          permissions: ['view_dashboard'],
        }),
      ),
    ).toBe(false);
  });
});

describe('homeForUser', () => {
  it('routes confirmed teacher active_role to /teacher/dashboard', () => {
    expect(
      homeForUser(
        user({
          id: 4706,
          role: 'teacher',
          active_role: 'teacher',
          admin_kind: 'admin_staff',
          teacher_id: 1306,
          is_teacher: true,
        }),
      ),
    ).toBe('/teacher/dashboard');
  });

  it('routes admin_staff with active_role admin to /admin/dashboard', () => {
    expect(
      homeForUser(
        user({
          id: 4905,
          role: 'admin',
          active_role: 'admin',
          admin_kind: 'admin_staff',
          teacher_id: 1473,
          is_teacher: true,
          roles: ['admin', 'teacher'],
        }),
      ),
    ).toBe('/admin/dashboard');
  });

  it('routes dual-role admin_staff without teacher_id to /admin/dashboard', () => {
    expect(
      homeForUser(
        user({ id: 4905, role: 'admin', admin_kind: 'admin_staff', roles: ['admin', 'teacher'] }),
      ),
    ).toBe('/admin/dashboard');
  });

  it('routes RCO admin_staff to /admin/dashboard', () => {
    expect(
      homeForUser(
        user({
          id: 5065,
          role: 'admin',
          admin_kind: 'admin_staff',
          roles: ['admin', 'teacher'],
          creation_template_code: 'registration_collections_officer',
        }),
      ),
    ).toBe('/admin/dashboard');
  });
});

describe('navForUser', () => {
  it('does not show teacher nav for RCO admin_staff without teacher active_role', () => {
    const sections = navForUser(
      user({
        id: 5065,
        role: 'admin',
        admin_kind: 'admin_staff',
        roles: ['admin', 'teacher'],
        active_role: 'admin',
        creation_template_code: 'registration_collections_officer',
        permissions: ['view_students'],
      }),
    );
    const hrefs = sections.flatMap((section) => section.items.map((item) => item.href));
    expect(hrefs.some((href) => href.startsWith('/teacher'))).toBe(false);
  });

  it('shows teacher nav for confirmed teacher active_role', () => {
    const sections = navForUser(
      user({
        id: 4905,
        role: 'teacher',
        active_role: 'teacher',
        admin_kind: 'admin_staff',
        teacher_id: 1473,
        is_teacher: true,
        roles: ['admin', 'teacher'],
      }),
    );
    const hrefs = sections.flatMap((section) => section.items.map((item) => item.href));
    expect(hrefs.some((href) => href.startsWith('/teacher'))).toBe(true);
  });
});

describe('resolveTeacherId', () => {
  it('reads teacher_id from /me payload', () => {
    expect(resolveTeacherId(user({ id: 1, role: 'admin', teacher_id: 1306 }))).toBe(1306);
  });

  it('reads teacher_profile_id from bindings', () => {
    expect(
      resolveTeacherId(
        user({
          id: 1,
          role: 'admin',
          admin_kind: 'admin_staff',
          bindings: [{ school_id: 3, teacher_profile_id: 1473 }],
        }),
      ),
    ).toBe(1473);
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
    role: 'teacher',
    active_role: 'teacher',
    admin_kind: 'admin_staff',
    teacher_id: 1306,
    is_teacher: true,
  });

  const rcoStaff = user({
    id: 5065,
    role: 'admin',
    active_role: 'admin',
    admin_kind: 'admin_staff',
    roles: ['admin', 'teacher'],
    creation_template_code: 'registration_collections_officer',
  });

  it('hides staff admin fields for teacher viewing own staff record', () => {
    expect(canViewStaffAdminPrivateFields(teacherUser, 4706)).toBe(false);
    expect(canViewStaffAdminPrivateFields(teacherUser, 999)).toBe(false);
  });

  it('allows staff admin fields for RCO viewing own staff record', () => {
    expect(canViewStaffAdminPrivateFields(rcoStaff, 5065)).toBe(true);
  });

  it('hides teacher admin fields for teacher viewing own teacher profile', () => {
    expect(canViewTeacherAdminPrivateFields(teacherUser, 1306)).toBe(false);
    expect(canViewTeacherAdminPrivateFields(teacherUser, 999)).toBe(false);
  });
});
