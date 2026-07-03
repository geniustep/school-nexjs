import { describe, expect, it } from 'vitest';
import { navForUser } from '@/components/navigation/nav-config';
import {
  adminLandingPath,
  canAccessAdminDashboard,
  canAccessScopedAdminDashboard,
  firstAllowedAdminPath,
  resolveAcademicAdminLandingPath,
} from '@/lib/admin/admin-ux';
import { resolveDashboardVariant } from '@/lib/admin/dashboard-registry';
import type { CurrentUser } from '@/types/user';

function admin(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    role: 'admin',
    permissions: [],
    school: { id: 10, name: 'School A' },
    ...overrides,
  };
}

describe('adminLandingPath — pedagogical_director', () => {
  it('lands on academic setup when view_dashboard is absent but academic permissions exist', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_teachers', 'view_classes', 'view_attendance', 'view_timetable'],
      scope: {
        type: 'school',
        allowed_level_ids: [],
        allowed_class_ids: [],
        allowed_channel_ids: [],
      },
    });

    expect(adminLandingPath(user)).toBe('/admin/settings/academic-setup');
    expect(adminLandingPath(user)).not.toBe('/admin/dashboard');
  });

  it('prefers attendance when teachers and academic setup are unavailable', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_attendance'],
    });

    expect(adminLandingPath(user)).toBe('/admin/attendance');
  });

  it('uses academic hub when only timetable permission is granted', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_timetable'],
    });

    expect(adminLandingPath(user)).toBe('/admin/academic');
  });

  it('still uses dashboard when view_dashboard is explicitly granted', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_dashboard', 'view_teachers', 'view_classes'],
    });

    expect(adminLandingPath(user)).toBe('/admin/dashboard');
  });
});

describe('firstAllowedAdminPath fallback', () => {
  it('does not fall back to dashboard when dashboard access is denied', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: [],
    });

    expect(canAccessAdminDashboard(user)).toBe(false);
    expect(firstAllowedAdminPath(user)).not.toBe('/admin/dashboard');
    expect(firstAllowedAdminPath(user)).toBe('/admin');
  });

  it('returns /admin when no module permissions match and dashboard is denied', () => {
    const user = admin({
      admin_kind: 'admin_staff',
      permissions: [],
    });

    expect(firstAllowedAdminPath(user)).toBe('/admin');
  });
});

describe('scoped dashboard access for academic admins', () => {
  it('allows readonly dashboard for pedagogical_director with academic permissions', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_teachers', 'view_classes'],
      scope: {
        type: 'school',
        allowed_level_ids: [],
        allowed_class_ids: [],
        allowed_channel_ids: [],
      },
    });

    expect(canAccessScopedAdminDashboard(user)).toBe(true);

    const variant = resolveDashboardVariant(user);
    expect(variant.canAccess).toBe(true);
    expect(variant.shell).toBe('readonly');
    expect(variant.id).toBe('pedagogical_director');
    expect(variant.showScopedAccessBanner).toBe(false);
  });

  it('denies dashboard page for pedagogical_director without any workspace permissions', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: [],
    });

    expect(canAccessScopedAdminDashboard(user)).toBe(false);
    expect(resolveDashboardVariant(user).canAccess).toBe(false);
  });
});

describe('finance nav visibility', () => {
  it('hides finance section for pedagogical_director without finance permissions', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_teachers', 'view_classes', 'view_attendance'],
    });

    const sections = navForUser(user);
    const financeSection = sections.find((section) => section.groupId === 'finance');

    expect(financeSection).toBeUndefined();
  });
});

describe('resolveAcademicAdminLandingPath', () => {
  it('works from effective_permissions when permissions array is empty', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: [],
      effective_permissions: ['view_teachers', 'view_classes'],
    });

    expect(resolveAcademicAdminLandingPath(user)).toBe('/admin/settings/academic-setup');
  });
});
