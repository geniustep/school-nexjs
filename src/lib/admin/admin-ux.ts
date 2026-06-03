// Admin UX helpers — landing, navigation, and multi-school context by admin_kind.
// Does not change backend contracts; complements permissions[] from /me.

import { resolveSchoolIds } from '@/lib/auth/normalize-user';
import { ADMIN_NAV_BY_PERMISSION } from '@/components/navigation/nav-config';
import { hasPermission } from '@/lib/permissions/permissions';
import { isScopedAdmin } from '@/lib/permissions/scope';
import type { Permission } from '@/types/permissions';
import type { AdminKind, CurrentUser } from '@/types/user';

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

export function canAccessAdminDashboard(user: CurrentUser | null): boolean {
  return hasPermission(user, 'view_dashboard');
}

/** Whether a nav item should appear for this admin (permission + admin_kind UX). */
export function canShowAdminNavPermission(
  user: CurrentUser | null,
  permission: Permission,
): boolean {
  if (!user || user.role !== 'admin') return false;
  if (!hasPermission(user, permission)) return false;
  return true;
}

/** First admin module href the user may open (sidebar order). */
export function firstAllowedAdminPath(user: CurrentUser): string {
  const first = ADMIN_NAV_BY_PERMISSION.find((item) =>
    canShowAdminNavPermission(user, item.permission),
  );
  return first?.href ?? '/admin/dashboard';
}

/** Post-login /admin index redirect target. */
export function adminLandingPath(user: CurrentUser): string {
  if (user.role !== 'admin') return '/admin';

  if (user.admin_kind === 'admin_staff' && !canAccessAdminDashboard(user)) {
    return firstAllowedAdminPath(user);
  }

  if (canAccessAdminDashboard(user)) {
    return '/admin/dashboard';
  }

  return firstAllowedAdminPath(user);
}

/** Scoped admins use softer nav section labels. */
export function useScopedNavLabels(user: CurrentUser | null): boolean {
  return isScopedAdmin(user) || user?.admin_kind === 'general_supervisor';
}

/** Hide school-wide structure KPIs on the command dashboard. */
export function shouldHideSchoolWideDashboardKpis(user: CurrentUser | null): boolean {
  return isScopedAdmin(user) || user?.admin_kind === 'general_supervisor';
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
