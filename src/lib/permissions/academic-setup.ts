/**
 * Academic setup permissions — mapped to existing RBAC keys from /me.
 *
 * | Conceptual (task)              | Actual Permission(s)                          |
 * | ------------------------------ | --------------------------------------------- |
 * | school_setup.view              | view_classes OR view_teachers                 |
 * | school_setup.manage            | manage_classes OR manage_teachers             |
 * | levels.manage / classes.manage | manage_classes                                |
 * | subjects.manage                | manage_classes                                |
 * | teachers.manage                | manage_teachers                               |
 * | teaching_assignments.manage    | manage_classes AND manage_teachers            |
 * | staff.manage                   | (no backend API — view gated by setup access) |
 */

import { hasAnyPermission, hasPermission } from '@/lib/permissions/permissions';
import type { CurrentUser } from '@/types/user';

/** Odoo capability codes for staff center (not legacy Permission keys). */
export const STAFF_VIEW_CAPABILITY = 'staff.view';
export const STAFF_MANAGE_SCHOOL_ACCESS_CAPABILITY = 'school.manage_admin_school_access';

function hasStaffCapability(user: CurrentUser | null, code: string): boolean {
  if (!user) return false;
  if (user.effective_capabilities?.includes(code)) return true;
  return (user.permissions ?? []).some((perm) => perm === code);
}

export const ACADEMIC_SETUP_VIEW_PERMISSIONS = ['view_classes', 'view_teachers'] as const;
export const ACADEMIC_SETUP_MANAGE_STRUCTURE = 'manage_classes' as const;
export const ACADEMIC_SETUP_MANAGE_TEACHERS = 'manage_teachers' as const;

export function canViewAcademicSetup(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  return (
    hasAnyPermission(user, [...ACADEMIC_SETUP_VIEW_PERMISSIONS]) ||
    hasPermission(user, ACADEMIC_SETUP_MANAGE_STRUCTURE) ||
    hasPermission(user, ACADEMIC_SETUP_MANAGE_TEACHERS)
  );
}

export function canViewAcademicSetupSection(
  user: CurrentUser | null,
  section: 'classes' | 'subjects' | 'teachers' | 'staff' | 'assignments' | 'overview',
): boolean {
  if (!canViewAcademicSetup(user)) return false;
  switch (section) {
    case 'classes':
    case 'subjects':
      return hasPermission(user, 'view_classes');
    case 'teachers':
      return hasPermission(user, 'view_teachers');
    case 'assignments':
      return hasPermission(user, 'view_classes') && hasPermission(user, 'view_teachers');
    case 'staff':
    case 'overview':
      return true;
    default:
      return false;
  }
}

export function canManageClasses(user: CurrentUser | null): boolean {
  return !!user && hasPermission(user, ACADEMIC_SETUP_MANAGE_STRUCTURE);
}

export function canManageSubjects(user: CurrentUser | null): boolean {
  return canManageClasses(user);
}

export function canManageTeachers(user: CurrentUser | null): boolean {
  return !!user && hasPermission(user, ACADEMIC_SETUP_MANAGE_TEACHERS);
}

export function canManageTeachingAssignments(user: CurrentUser | null): boolean {
  return canManageClasses(user) && canManageTeachers(user);
}

/** Staff mutations — requires school admin access capability or legacy full-school admin kinds. */
export function canManageStaff(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (hasStaffCapability(user, STAFF_MANAGE_SCHOOL_ACCESS_CAPABILITY)) return true;
  const kind = user.admin_kind;
  return (
    kind === 'project_manager' ||
    kind === 'school_manager' ||
    kind === 'legacy_admin' ||
    kind === 'super_admin'
  );
}

export function canViewStaff(user: CurrentUser | null): boolean {
  return canAccessStaffCenter(user);
}

/** Staff center — read-only list/detail when staff.view is granted (legacy: view_classes/view_teachers). */
export function canAccessStaffCenter(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (hasStaffCapability(user, STAFF_VIEW_CAPABILITY)) return true;
  return hasAnyPermission(user, [...ACADEMIC_SETUP_VIEW_PERMISSIONS]);
}

export function canViewSettings(user: CurrentUser | null): boolean {
  return canViewAcademicSetup(user);
}

export function isAcademicSetupPath(pathname: string): boolean {
  return pathname.split('?')[0].startsWith('/admin/settings/academic-setup');
}

export function isSettingsPath(pathname: string): boolean {
  const base = pathname.split('?')[0];
  return base === '/admin/settings' || base.startsWith('/admin/settings/');
}
