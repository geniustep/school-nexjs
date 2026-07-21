// Role → home route mapping and post-login redirect logic.
// API_REPORT.md "AFTER LOGIN REDIRECT".

import { resolveEffectiveRole } from '@/lib/auth/active-role-workspace';
import type { CurrentUser, Role } from '@/types/user';

export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  student: '/student/dashboard',
};

export function homeForRole(role: Role): string {
  return ROLE_HOME[role] ?? '/login';
}

/** Post-login / post-switch home from Odoo-confirmed active role. */
export function homeForUser(user: CurrentUser): string {
  return homeForRole(resolveEffectiveRole(user));
}

/** The top-level path segment that a role is allowed to access. */
export const ROLE_BASE: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher',
  parent: '/parent',
  student: '/student',
};

export function isPathAllowedForRole(role: Role, pathname: string): boolean {
  return pathname.startsWith(ROLE_BASE[role]);
}
