/**
 * Academic capability gates — maps Odoo effective_capabilities to UI actions.
 * Does not invent permissions; honors legacy Permission keys when present in /me.
 */

import { hasPermission } from '@/lib/permissions/permissions';
import type { Permission } from '@/types/permissions';
import type { CurrentUser } from '@/types/user';

export function resolveEffectiveCapabilities(user: CurrentUser | null | undefined): string[] {
  if (!user) return [];
  if (user.effective_capabilities?.length) return user.effective_capabilities;
  return [];
}

export function hasUserCapability(user: CurrentUser | null | undefined, code: string): boolean {
  if (!user) return false;
  if (user.effective_capabilities?.includes(code)) return true;
  if (user.effective_permissions?.includes(code as Permission)) return true;
  return (user.permissions ?? []).some((perm) => perm === code);
}

export function hasAnyUserCapability(
  user: CurrentUser | null | undefined,
  codes: readonly string[],
): boolean {
  return codes.some((code) => hasUserCapability(user, code));
}

const STUDENT_UPDATE_CAPABILITIES = [
  'students.update_limited',
  'students.manage_registration_data',
] as const;

const STUDENT_GUARDIAN_LINK_CAPABILITIES = [
  'students.link_guardians',
  'students.manage_guardian_links',
  'guardians.link_to_student',
  'guardians.unlink_from_student',
  'guardians.relationship.remove',
] as const;

/** Full student record management (archive, accounts) — not limited registration edit. */
export function canManageStudentsFull(user: CurrentUser | null | undefined): boolean {
  return hasPermission(user ?? null, 'manage_students');
}

/** Create / register a student. */
export function canCreateStudents(user: CurrentUser | null | undefined): boolean {
  return canManageStudentsFull(user) || hasUserCapability(user, 'students.create');
}

/** Edit student profile / registration fields (limited or full). */
export function canUpdateStudents(user: CurrentUser | null | undefined): boolean {
  return (
    canManageStudentsFull(user) || hasAnyUserCapability(user, STUDENT_UPDATE_CAPABILITIES)
  );
}

/** Archive student — requires full manage_students, not limited update. */
export function canArchiveStudents(user: CurrentUser | null | undefined): boolean {
  return canManageStudentsFull(user);
}

/** Manage student login accounts — full manage_students only. */
export function canManageStudentAccounts(user: CurrentUser | null | undefined): boolean {
  return canManageStudentsFull(user);
}

export function canManageStudentGuardianLinks(user: CurrentUser | null | undefined): boolean {
  const u = user ?? null;
  return (
    hasPermission(u, 'manage_parents') ||
    canManageStudentsFull(user) ||
    hasAnyUserCapability(user, STUDENT_GUARDIAN_LINK_CAPABILITIES)
  );
}

/** Create guardian profile. */
export function canCreateGuardians(user: CurrentUser | null | undefined): boolean {
  return hasPermission(user ?? null, 'manage_parents') || hasUserCapability(user, 'guardians.create');
}

/** Limited guardian profile edit. */
export function canUpdateGuardiansLimited(user: CurrentUser | null | undefined): boolean {
  return (
    hasPermission(user ?? null, 'manage_parents') ||
    hasUserCapability(user, 'guardians.update_limited')
  );
}

export function canManageGuardianRelationships(user: CurrentUser | null | undefined): boolean {
  return (
    hasPermission(user ?? null, 'manage_parents') ||
    hasAnyUserCapability(user, [
      'guardians.link_to_student',
      'guardians.unlink_from_student',
      'guardians.relationship.remove',
      'students.link_guardians',
      'students.manage_guardian_links',
    ])
  );
}

/** Pedagogical teacher management — not staff account administration. */
export function canManageTeachersAcademic(user: CurrentUser | null | undefined): boolean {
  return (
    hasPermission(user ?? null, 'manage_teachers') || hasUserCapability(user, 'manage_teachers')
  );
}

export function canViewReports(user: CurrentUser | null | undefined): boolean {
  return hasPermission(user ?? null, 'view_reports') || hasUserCapability(user, 'view_reports');
}

/** No manage_reports capability in Odoo catalog today — keep false unless /me adds one. */
export function canManageReports(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, ['manage_reports', 'reports.manage']);
}

export function canShowAcademicListAdd(
  user: CurrentUser | null | undefined,
  options: {
    legacyPermission?: Permission;
    capability?: string;
  },
): boolean {
  if (options.capability && hasUserCapability(user, options.capability)) return true;
  if (options.legacyPermission && hasPermission(user ?? null, options.legacyPermission)) return true;
  if (
    options.legacyPermission &&
    hasUserCapability(user, options.legacyPermission)
  ) {
    return true;
  }
  return false;
}
