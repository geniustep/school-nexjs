import { describe, expect, it } from 'vitest';
import {
  isMultiRoleUser,
  resolveEffectiveRole,
  shouldShowRoleSwitcher,
  userOwnsRole,
} from '@/lib/auth/active-role-workspace';
import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';
import { homeForUser } from '@/lib/routes/role-routes';
import type { CurrentUser } from '@/types/user';

function user(partial: Partial<CurrentUser> & Pick<CurrentUser, 'id' | 'role'>): CurrentUser {
  return {
    name: 'User',
    email: null,
    permissions: [],
    school: null,
    ...partial,
  };
}

describe('active-role workspace policy', () => {
  it('hides role switcher for single-role users', () => {
    expect(
      shouldShowRoleSwitcher(
        user({
          id: 1,
          role: 'admin',
          available_roles: [{ code: 'admin', label: 'مدير' }],
        }),
      ),
    ).toBe(false);
    expect(isMultiRoleUser(user({ id: 1, role: 'teacher' }))).toBe(false);
  });

  it('shows role switcher for multi-role users', () => {
    expect(
      shouldShowRoleSwitcher(
        user({
          id: 2,
          role: 'admin',
          available_roles: [
            { code: 'admin', label: 'مدير' },
            { code: 'teacher', label: 'أستاذة' },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('uses confirmed active_role over admin_kind / teacher_id', () => {
    const schoolManagerAsTeacher = user({
      id: 2,
      role: 'teacher',
      active_role: 'teacher',
      admin_kind: 'school_manager',
      teacher_id: null,
      available_roles: [
        { code: 'admin', label: 'مدير' },
        { code: 'teacher', label: 'أستاذة' },
      ],
    });
    expect(resolveEffectiveRole(schoolManagerAsTeacher)).toBe('teacher');
    expect(shouldUseTeacherWorkspace(schoolManagerAsTeacher)).toBe(true);
    expect(homeForUser(schoolManagerAsTeacher)).toBe('/teacher/dashboard');

    const staffAsAdmin = user({
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
    });
    expect(resolveEffectiveRole(staffAsAdmin)).toBe('admin');
    expect(shouldUseTeacherWorkspace(staffAsAdmin)).toBe(false);
    expect(homeForUser(staffAsAdmin)).toBe('/admin/dashboard');
  });

  it('does not treat teacher_id alone as teacher workspace', () => {
    expect(
      shouldUseTeacherWorkspace(
        user({
          id: 4706,
          role: 'admin',
          active_role: 'admin',
          admin_kind: 'admin_staff',
          teacher_id: 1306,
        }),
      ),
    ).toBe(false);
  });

  it('rejects ownership for roles not in available_roles', () => {
    const multi = user({
      id: 2,
      role: 'admin',
      available_roles: [
        { code: 'admin', label: 'مدير' },
        { code: 'teacher', label: 'أستاذة' },
      ],
    });
    expect(userOwnsRole(multi, 'teacher')).toBe(true);
    expect(userOwnsRole(multi, 'parent')).toBe(false);
  });
});
