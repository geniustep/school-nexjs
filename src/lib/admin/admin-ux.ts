// Admin UX helpers — landing, navigation, and multi-school context by admin_kind.
// Does not change backend contracts; complements permissions[] from /me.

import { resolveSchoolIds } from '@/lib/auth/normalize-user';
import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';
import { ADMIN_NAV_BY_PERMISSION } from '@/components/navigation/nav-config';
import { hasAnyPermission, hasPermission } from '@/lib/permissions/permissions';
import { isConfiguredAdmin, isScopedAdmin } from '@/lib/permissions/scope';
import type { Permission } from '@/types/permissions';
import type { AdminKind, CurrentUser } from '@/types/user';

/** Permissions that justify a scoped (non–view_dashboard) admin home. */
const SCOPED_DASHBOARD_PERMISSIONS: Permission[] = [
  'view_students',
  'view_classes',
  'view_attendance',
  'view_homeworks',
  'view_resources',
  'view_exams',
  'view_exam_results',
  'view_timetable',
  'view_channels',
];

export function adminSchoolCount(user: CurrentUser | null): number {
  if (!user) return 0;
  return resolveSchoolIds(user).length;
}

export function isMultiSchoolAdmin(user: CurrentUser | null): boolean {
  return adminSchoolCount(user) > 1;
}

export function shouldShowSchoolSwitcher(user: CurrentUser | null): boolean {
  return !!user && user.role === 'admin' && isMultiSchoolAdmin(user);
}

export function isAdminKind(user: CurrentUser | null, kind: AdminKind): boolean {
  return !!user && user.admin_kind === kind;
}

export function hasScopedDashboardPermissions(user: CurrentUser | null): boolean {
  return hasAnyPermission(user, SCOPED_DASHBOARD_PERMISSIONS);
}

/** Limited dashboard for general_supervisor / scoped admins without view_dashboard. */
export function canAccessScopedAdminDashboard(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (user.admin_kind === 'admin_staff') return false;
  if (!isConfiguredAdmin(user) || !hasScopedDashboardPermissions(user)) return false;

  if (user.admin_kind === 'general_supervisor') {
    return !!(user.scope || (user.scopes?.length ?? 0) > 0);
  }

  if (user.admin_kind === 'pedagogical_director') {
    return hasScopedDashboardPermissions(user);
  }

  return isScopedAdmin(user);
}

export function canAccessAdminDashboard(user: CurrentUser | null): boolean {
  return hasPermission(user, 'view_dashboard') || canAccessScopedAdminDashboard(user);
}

/** Whether a nav item should appear for this admin (permission + admin_kind UX). */
export function canShowAdminNavPermission(
  user: CurrentUser | null,
  permission: Permission,
): boolean {
  if (!user || user.role !== 'admin') return false;
  if (permission === 'view_dashboard') return canAccessAdminDashboard(user);
  return hasPermission(user, permission);
}

/** First admin module href the user may open (sidebar order). Skips Staff Center as a landing target. */
export function firstAllowedAdminPath(user: CurrentUser): string {
  const first = ADMIN_NAV_BY_PERMISSION.find(
    (item) =>
      item.href !== '/admin/staff' && canShowAdminNavPermission(user, item.permission),
  );
  return first?.href ?? '/admin/dashboard';
}

/** Post-login /admin index redirect target. */
export function adminLandingPath(user: CurrentUser): string {
  if (shouldUseTeacherWorkspace(user)) return '/teacher/dashboard';

  if (user.role !== 'admin') return '/admin';

  if (user.admin_kind === 'admin_staff') {
    return canAccessAdminDashboard(user) ? '/admin/dashboard' : firstAllowedAdminPath(user);
  }

  if (canAccessAdminDashboard(user)) {
    return '/admin/dashboard';
  }

  return firstAllowedAdminPath(user);
}

/** Scoped admins use softer nav section labels. */
export function useScopedNavLabels(user: CurrentUser | null): boolean {
  return (
    isScopedAdmin(user) ||
    user?.admin_kind === 'general_supervisor' ||
    user?.admin_kind === 'pedagogical_director'
  );
}

/** Hide school-wide structure KPIs on the command dashboard. */
export function shouldHideSchoolWideDashboardKpis(user: CurrentUser | null): boolean {
  return (
    isScopedAdmin(user) ||
    user?.admin_kind === 'general_supervisor' ||
    user?.admin_kind === 'pedagogical_director'
  );
}

/** Multi-school portfolio notice for project managers. */
export function shouldShowMultiSchoolPortfolioNotice(user: CurrentUser | null): boolean {
  return (
    !!user &&
    user.role === 'admin' &&
    isMultiSchoolAdmin(user) &&
    (user.admin_kind === 'project_manager' || user.admin_kind === 'super_admin')
  );
}
