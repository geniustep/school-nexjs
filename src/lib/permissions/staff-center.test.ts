import { describe, expect, it } from 'vitest';
import {
  canAccessStaffCenter,
  canManageStaff,
  canViewStaffAttendance,
  isStaffAttendancePath,
  STAFF_ATTENDANCE_VIEW_CAPABILITY,
  STAFF_ATTENDANCE_EDGE_LEGACY_CAPABILITY,
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

describe('staff attendance distinct RBAC gate', () => {
  it('allows school-attendance viewing without staff center or management rights', () => {
    const user = admin({
      admin_kind: 'general_supervisor',
      effective_capabilities: [STAFF_ATTENDANCE_VIEW_CAPABILITY],
    });
    expect(canViewStaffAttendance(user)).toBe(true);
    expect(canAccessStaffCenter(user)).toBe(false);
    expect(canManageStaff(user)).toBe(false);
  });

  it('retains the existing Edge manager access to staff attendance', () => {
    expect(canViewStaffAttendance(admin({
      effective_capabilities: [STAFF_ATTENDANCE_EDGE_LEGACY_CAPABILITY],
    }))).toBe(true);
  });

  it('denies staff center, student attendance and generic grants', () => {
    for (const code of ['staff.view', 'view_attendance', 'attendance.view', 'manage_attendance']) {
      expect(canViewStaffAttendance(admin({ effective_capabilities: [code] }))).toBe(false);
    }
  });

  it('follows current effective capabilities rather than historical lists', () => {
    expect(canViewStaffAttendance(admin({
      permissions: [STAFF_ATTENDANCE_VIEW_CAPABILITY],
      effective_capabilities: [],
    }))).toBe(false);
  });

  it('falls back to effective_permissions when effective_capabilities is absent', () => {
    expect(canViewStaffAttendance(admin({
      effective_permissions: [STAFF_ATTENDANCE_VIEW_CAPABILITY],
    }))).toBe(true);
  });

  it('never allows a non-admin user by capability string alone', () => {
    expect(canViewStaffAttendance(admin({
      role: 'parent',
      effective_capabilities: [STAFF_ATTENDANCE_VIEW_CAPABILITY],
    }))).toBe(false);
  });

  it('matches attendance routes without matching other staff routes', () => {
    expect(isStaffAttendancePath('/admin/staff/attendance')).toBe(true);
    expect(isStaffAttendancePath('/admin/staff/attendance?date=today')).toBe(true);
    expect(isStaffAttendancePath('/admin/staff/attendance/history')).toBe(true);
    expect(isStaffAttendancePath('/admin/staff/3')).toBe(false);
    expect(isStaffAttendancePath('/admin/staff/attendance-extra')).toBe(false);
  });
});
