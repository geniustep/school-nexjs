import { describe, expect, it } from 'vitest';
import { adminLandingPath } from '@/lib/admin/admin-ux';
import {
  resolveDashboardContextPresentation,
  resolveDashboardVariant,
  resolveDashboardWidgets,
  shouldShowActiveSchoolBannerOnDashboard,
} from '@/lib/admin/dashboard-registry';
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

describe('resolveDashboardVariant', () => {
  it('project_manager with view_dashboard gets wide command variant', () => {
    const user = admin({
      admin_kind: 'project_manager',
      school_ids: [10, 20],
      schools: [
        { id: 10, name: 'School A' },
        { id: 20, name: 'School B' },
      ],
      permissions: ['view_dashboard', 'view_students'],
    });

    const variant = resolveDashboardVariant(user);

    expect(variant.id).toBe('project_manager');
    expect(variant.shell).toBe('command');
    expect(variant.canAccess).toBe(true);
    expect(variant.hideSchoolWideKpis).toBe(false);
    expect(variant.showMultiSchoolPortfolioNotice).toBe(true);
    expect(variant.fetchFullDashboardApi).toBe(true);
  });

  it('school_manager with view_dashboard gets school command variant', () => {
    const user = admin({
      admin_kind: 'school_manager',
      permissions: ['view_dashboard', 'view_classes'],
    });

    const variant = resolveDashboardVariant(user);

    expect(variant.id).toBe('school_manager');
    expect(variant.shell).toBe('command');
    expect(variant.hideSchoolWideKpis).toBe(false);
    expect(variant.showMultiSchoolPortfolioNotice).toBe(false);
  });

  it('general_supervisor scoped without view_dashboard gets readonly variant', () => {
    const user = admin({
      admin_kind: 'general_supervisor',
      permissions: ['view_students', 'view_classes'],
      scope: {
        type: 'classes',
        allowed_level_ids: [],
        allowed_class_ids: [1],
        allowed_channel_ids: [],
      },
    });

    const variant = resolveDashboardVariant(user);

    expect(variant.id).toBe('general_supervisor_scoped');
    expect(variant.shell).toBe('readonly');
    expect(variant.canAccess).toBe(true);
    expect(variant.hideSchoolWideKpis).toBe(true);
    expect(variant.fetchFullDashboardApi).toBe(false);
    expect(variant.showScopedAccessBanner).toBe(true);
  });

  it('general_supervisor scoped with view_dashboard stays scoped command, not wide', () => {
    const user = admin({
      admin_kind: 'general_supervisor',
      permissions: ['view_dashboard', 'view_students'],
      scope: {
        type: 'classes',
        allowed_level_ids: [],
        allowed_class_ids: [1],
        allowed_channel_ids: [],
      },
    });

    const variant = resolveDashboardVariant(user);

    expect(variant.id).toBe('general_supervisor_scoped');
    expect(variant.shell).toBe('command');
    expect(variant.hideSchoolWideKpis).toBe(true);
    expect(variant.scopedMode).toBe(true);
  });

  it('admin_staff without view_dashboard is denied on dashboard page', () => {
    const user = admin({
      admin_kind: 'admin_staff',
      permissions: ['view_students'],
    });

    const variant = resolveDashboardVariant(user);

    expect(variant.id).toBe('denied');
    expect(variant.shell).toBe('denied');
    expect(variant.canAccess).toBe(false);
    expect(adminLandingPath(user)).toBe('/admin/students');
  });

  it('admin_staff with view_dashboard gets limited command variant', () => {
    const user = admin({
      admin_kind: 'admin_staff',
      permissions: ['view_dashboard', 'view_students'],
    });

    const variant = resolveDashboardVariant(user);

    expect(variant.id).toBe('admin_staff');
    expect(variant.shell).toBe('command');
    expect(variant.canAccess).toBe(true);
    expect(adminLandingPath(user)).toBe('/admin/dashboard');
  });

  it('legacy_admin with view_dashboard maps to legacy variant', () => {
    const user = admin({
      admin_kind: 'legacy_admin',
      permissions: ['view_dashboard'],
      is_super_admin: true,
    });

    const variant = resolveDashboardVariant(user);

    expect(variant.id).toBe('legacy_admin');
    expect(variant.shell).toBe('command');
  });

  it('pedagogical_director without view_dashboard gets scoped readonly dashboard when opened directly', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_teachers', 'view_classes', 'view_attendance'],
      scope: {
        type: 'school',
        allowed_level_ids: [],
        allowed_class_ids: [],
        allowed_channel_ids: [],
      },
    });

    const variant = resolveDashboardVariant(user);

    expect(variant.id).toBe('pedagogical_director');
    expect(variant.shell).toBe('readonly');
    expect(variant.canAccess).toBe(true);
    expect(variant.showScopedAccessBanner).toBe(false);
    expect(adminLandingPath(user)).toBe('/admin/settings/academic-setup');
  });
});

describe('shouldShowActiveSchoolBannerOnDashboard', () => {
  it('hides active-school banner on executive dashboard while keeping it for command dashboard', () => {
    const executiveUser = admin({
      admin_kind: 'project_manager',
      school_ids: [10, 20],
      schools: [
        { id: 10, name: 'School A' },
        { id: 20, name: 'School B' },
      ],
      permissions: ['view_dashboard', 'view_students'],
    });
    expect(resolveDashboardVariant(executiveUser).showActiveSchoolBanner).toBe(true);
    expect(resolveDashboardWidgets(executiveUser).executiveLayout).toBe(true);
    expect(shouldShowActiveSchoolBannerOnDashboard(executiveUser)).toBe(false);

    const commandUser = admin({
      admin_kind: 'admin_staff',
      school_ids: [10, 20],
      schools: [
        { id: 10, name: 'School A' },
        { id: 20, name: 'School B' },
      ],
      permissions: ['view_dashboard', 'view_students'],
    });
    expect(resolveDashboardVariant(commandUser).showActiveSchoolBanner).toBe(true);
    expect(resolveDashboardWidgets(commandUser).executiveLayout).toBe(false);
    expect(shouldShowActiveSchoolBannerOnDashboard(commandUser)).toBe(true);
  });
});

describe('resolveDashboardWidgets', () => {
  it('permissions control widget visibility', () => {
    const user = admin({
      admin_kind: 'school_manager',
      permissions: ['view_dashboard', 'view_attendance', 'view_classes', 'view_channels'],
      scope: { type: 'school', allowed_level_ids: [], allowed_class_ids: [], allowed_channel_ids: [] },
    });

    const widgets = resolveDashboardWidgets(user);

    expect(widgets.executiveLayout).toBe(true);
    expect(widgets.heroAttendance).toBe(true);
    expect(widgets.attendanceOperations).toBe(true);
    expect(widgets.schoolStructure).toBe(true);
    expect(widgets.schoolStructureClasses).toBe(true);
    expect(widgets.academicActivity).toBe(false);
    expect(widgets.latestMessages).toBe(false);
    expect(widgets.quickActions).toContain('attendance');
    expect(widgets.quickActions).toContain('classes');
    expect(widgets.quickActions).toContain('channels');
    expect(widgets.quickActions).not.toContain('add-student');
  });

  it('effective_permissions override permissions for widgets', () => {
    const user = admin({
      admin_kind: 'school_manager',
      permissions: [],
      effective_permissions: ['view_attendance', 'view_students', 'manage_students'],
      scope: { type: 'school', allowed_level_ids: [], allowed_class_ids: [], allowed_channel_ids: [] },
    });

    const widgets = resolveDashboardWidgets(user);

    expect(widgets.heroAttendance).toBe(true);
    expect(widgets.dataQuality).toBe(true);
    expect(widgets.quickActions).toContain('add-student');
  });

  it('scoped general_supervisor hides school-wide KPI widgets', () => {
    const user = admin({
      admin_kind: 'general_supervisor',
      permissions: ['view_dashboard', 'view_students', 'view_classes'],
      scope: {
        type: 'classes',
        allowed_level_ids: [],
        allowed_class_ids: [1],
        allowed_channel_ids: [],
      },
    });

    const widgets = resolveDashboardWidgets(user);

    expect(widgets.schoolStructure).toBe(false);
    expect(widgets.academicActivity).toBe(false);
    expect(widgets.intervention).toBe(true);
    expect(widgets.dataQuality).toBe(true);
  });
});

describe('resolveDashboardContextPresentation', () => {
  it('wide project_manager gets full headline and mode', () => {
    const user = admin({
      admin_kind: 'project_manager',
      permissions: [
        'view_dashboard',
        'view_students',
        'view_attendance',
        'view_channels',
        'admission.view',
        'finance.view',
        'view_classes',
      ],
    });

    const context = resolveDashboardContextPresentation(user);

    expect(context).not.toBeNull();
    expect(context?.headlineKey).toBe('admin.executive.contextHeadline');
    expect(context?.mode).toBe('full');
    expect(context?.variantLabelKey).toBe('admin.dashboardContext.variantProjectManager');
    expect(context?.permissionAreas.find((a) => a.id === 'students')?.allowed).toBe(true);
    expect(context?.permissionAreas.find((a) => a.id === 'finance')?.allowed).toBe(true);
  });

  it('scoped general_supervisor gets limited scoped headline and hidden reason', () => {
    const user = admin({
      admin_kind: 'general_supervisor',
      permissions: ['view_dashboard', 'view_students'],
      scope: {
        type: 'classes',
        allowed_level_ids: [],
        allowed_class_ids: [1],
        allowed_channel_ids: [],
      },
    });

    const context = resolveDashboardContextPresentation(user);

    expect(context?.headlineKey).toBe('admin.dashboardContext.headlineScoped');
    expect(context?.mode).toBe('limited');
    expect(context?.variantLabelKey).toBe('admin.dashboardContext.variantGeneralSupervisor');
    expect(context?.hiddenReasonKey).toBe('admin.dashboardContext.hiddenReasonBoth');
  });

  it('admin_staff with view_dashboard gets staff headline and limited mode', () => {
    const user = admin({
      admin_kind: 'admin_staff',
      permissions: ['view_dashboard', 'view_students'],
    });

    const context = resolveDashboardContextPresentation(user);

    expect(context?.headlineKey).toBe('admin.dashboardContext.headlineAdminStaff');
    expect(context?.mode).toBe('limited');
    expect(context?.variantLabelKey).toBe('admin.dashboardContext.variantAdminStaff');
  });

  it('returns null when dashboard access is denied', () => {
    expect(resolveDashboardContextPresentation(admin({ role: 'teacher' }))).toBeNull();
    expect(
      resolveDashboardContextPresentation(
        admin({ admin_kind: 'admin_staff', permissions: ['view_students'] }),
      ),
    ).toBeNull();
  });
});
