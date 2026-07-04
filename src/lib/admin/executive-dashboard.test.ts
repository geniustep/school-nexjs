import { describe, expect, it } from 'vitest';
import {
  isExecutiveDirectorUser,
  isExecutiveDirectorVariantId,
  shouldShowDashboardContextPanel,
} from '@/lib/admin/executive-dashboard';
import { resolveDashboardContextPresentation, resolveDashboardWidgets } from '@/lib/admin/dashboard-registry';
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

describe('executive dashboard helpers', () => {
  it('school_manager with view_dashboard uses executive layout', () => {
    const user = admin({
      admin_kind: 'school_manager',
      permissions: ['view_dashboard', 'view_students', 'finance.view', 'admission.view'],
    });

    expect(isExecutiveDirectorUser(user)).toBe(true);
    expect(shouldShowDashboardContextPanel(user)).toBe(false);

    const widgets = resolveDashboardWidgets(user);
    expect(widgets.executiveLayout).toBe(true);
    expect(widgets.financeSummary).toBe(true);
    expect(widgets.admissionsSummary).toBe(true);
    expect(widgets.academicActivity).toBe(false);
  });

  it('project_manager gets executive headline in context presentation', () => {
    const user = admin({
      admin_kind: 'project_manager',
      permissions: ['view_dashboard'],
    });

    const context = resolveDashboardContextPresentation(user);
    expect(context?.headlineKey).toBe('admin.executive.contextHeadline');
  });

  it('admin_staff keeps command dashboard shell without executive layout', () => {
    const user = admin({
      admin_kind: 'admin_staff',
      permissions: ['view_dashboard', 'view_students'],
    });

    expect(isExecutiveDirectorUser(user)).toBe(false);
    expect(shouldShowDashboardContextPanel(user)).toBe(true);
    expect(resolveDashboardWidgets(user).executiveLayout).toBe(false);
  });

  it('pedagogical director is not executive director', () => {
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

    expect(isExecutiveDirectorUser(user)).toBe(false);
    expect(isExecutiveDirectorVariantId('pedagogical_director')).toBe(false);
  });
});
