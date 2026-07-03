import { describe, expect, it } from 'vitest';
import {
  canAccessStaffCenter,
  canManageStaff,
  STAFF_MANAGE_SCHOOL_ACCESS_CAPABILITY,
  STAFF_VIEW_CAPABILITY,
} from '@/lib/permissions/academic-setup';
import type { CurrentUser } from '@/types/user';

function admin(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    role: 'admin',
    permissions: [],
    school: null,
    ...overrides,
  };
}

describe('staff center capability gates', () => {
  it('staff.view allows staff center link/page without manage rights', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      effective_capabilities: [STAFF_VIEW_CAPABILITY],
    });
    expect(canAccessStaffCenter(user)).toBe(true);
    expect(canManageStaff(user)).toBe(false);
  });

  it('staff.view alone never shows staff management actions in UI gate', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      effective_capabilities: [STAFF_VIEW_CAPABILITY, 'view_teachers', 'view_classes'],
    });
    expect(canManageStaff(user)).toBe(false);
  });

  it('school.manage_admin_school_access opens staff management UI', () => {
    const user = admin({
      effective_capabilities: [STAFF_VIEW_CAPABILITY, STAFF_MANAGE_SCHOOL_ACCESS_CAPABILITY],
    });
    expect(canManageStaff(user)).toBe(true);
  });

  it('legacy school_manager admin_kind retains staff manage UI', () => {
    expect(canManageStaff(admin({ admin_kind: 'school_manager' }))).toBe(true);
  });

  it('legacy academic view permissions still open staff center before staff.view', () => {
    expect(canAccessStaffCenter(admin({ permissions: ['view_teachers'] }))).toBe(true);
    expect(canAccessStaffCenter(admin({ permissions: ['view_classes'] }))).toBe(true);
  });

  it('pedagogical_director without staff.view or academic view cannot open staff center', () => {
    expect(
      canAccessStaffCenter(
        admin({
          admin_kind: 'pedagogical_director',
          permissions: ['view_dashboard'],
        }),
      ),
    ).toBe(false);
  });
});
