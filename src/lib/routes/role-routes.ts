// Role → home route mapping and post-login redirect logic.
// API_REPORT.md "AFTER LOGIN REDIRECT".

import type { Role } from '@/types/user';

export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  student: '/student/dashboard',
};

export function homeForRole(role: Role): string {
  return ROLE_HOME[role] ?? '/login';
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
