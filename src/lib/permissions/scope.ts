// Admin scope helpers — mirrors API_REPORT.md §4.
//
// Security contract (do NOT weaken):
//   - Super admin (is_super_admin) OR scope.type === 'school'  -> full access.
//   - Scoped admin (levels/classes/level_group/custom)         -> restricted.
//   - 'channels' scope                                         -> messaging only,
//        no student/attendance data.
//   - Admin with NO scope and NOT super admin                  -> NO access
//        (the server returns permission_denied; the UI shows a blocked state).
//
// Never assume admin === full access.

import type { CurrentUser } from '@/types/user';
import type { AdminScope } from '@/types/scope';
import { hasPermission } from '@/lib/permissions/permissions';

export function isSuperAdmin(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (user.is_super_admin) return true;
  if (user.admin_kind === 'legacy_admin' || user.admin_kind === 'super_admin') return true;
  return user.scope?.type === 'school';
}

/** An admin who can use the admin portal (RBAC schools/permissions or legacy scope). */
export function isConfiguredAdmin(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (isSuperAdmin(user)) return true;
  if ((user.school_ids?.length ?? 0) > 0) return true;
  if (user.school) return true;
  if (user.scope || (user.scopes?.length ?? 0) > 0) return true;
  if ((user.permissions?.length ?? 0) > 0) return true;
  return false;
}

/** A scoped (non-super) admin restricted to part of the school. */
export function isScopedAdmin(user: CurrentUser | null): boolean {
  return (
    !!user &&
    user.role === 'admin' &&
    !isSuperAdmin(user) &&
    !!user.scope &&
    user.scope.type !== 'school'
  );
}

const STUDENT_DATA_SCOPES: AdminScope['type'][] = [
  'school',
  'level_group',
  'levels',
  'classes',
  'custom',
];

/** Whether this admin can see student / attendance / class data at all. */
export function canSeeStudentData(user: CurrentUser | null): boolean {
  if (!isConfiguredAdmin(user)) return false;
  if (isSuperAdmin(user)) return true;
  if (
    hasPermission(user, 'view_students') ||
    hasPermission(user, 'view_parents') ||
    hasPermission(user, 'view_teachers') ||
    hasPermission(user, 'view_classes') ||
    hasPermission(user, 'view_attendance')
  ) {
    return true;
  }
  const type = user?.scope?.type;
  return !!type && STUDENT_DATA_SCOPES.includes(type);
}

/** Whether this admin can see channels/messaging. */
export function canSeeChannels(user: CurrentUser | null): boolean {
  if (!isConfiguredAdmin(user)) return false;
  return hasPermission(user, 'view_channels');
}

/** Is a given class id within the admin's scope? (UX pre-filter only.) */
export function isClassInScope(user: CurrentUser | null, classId: number): boolean {
  if (isSuperAdmin(user)) return true;
  const scope = user?.scope;
  if (!scope) return false;
  if (scope.allowed_class_ids?.includes(classId)) return true;
  // When only levels are set the server derives classes — we can't fully
  // resolve that here, so don't over-restrict: allow and let the API decide.
  if (scope.allowed_class_ids?.length === 0 && scope.allowed_level_ids?.length > 0) {
    return true;
  }
  return false;
}

export function isLevelInScope(user: CurrentUser | null, levelId: number): boolean {
  if (isSuperAdmin(user)) return true;
  return user?.scope?.allowed_level_ids?.includes(levelId) ?? false;
}

export function isChannelInScope(user: CurrentUser | null, channelId: number): boolean {
  if (isSuperAdmin(user)) return true;
  const allowed = user?.scope?.allowed_channel_ids;
  // Empty list means "not restricted by channel" for that scope dimension.
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(channelId);
}
