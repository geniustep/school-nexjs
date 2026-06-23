// Teacher workspace routing — Smart Staff teachers may arrive with role=admin + teacher_id.

import type { CurrentUser } from '@/types/user';

const ADMIN_MANAGEMENT_KINDS = new Set([
  'project_manager',
  'school_manager',
  'general_supervisor',
  'legacy_admin',
  'super_admin',
]);

export function resolveTeacherId(user: Pick<CurrentUser, 'teacher_id' | 'profile_id' | 'role'>): number | null {
  if (typeof user.teacher_id === 'number' && user.teacher_id > 0) return user.teacher_id;
  if (user.role === 'teacher' && typeof user.profile_id === 'number' && user.profile_id > 0) {
    return user.profile_id;
  }
  return null;
}

/** True when the session is linked to a concrete teacher profile id. */
export function hasLinkedTeacherProfile(
  user: Pick<CurrentUser, 'teacher_id' | 'profile_id' | 'role'> | null,
): boolean {
  if (!user) return false;
  return resolveTeacherId(user) != null;
}

function hasTeacherMeIndicator(user: CurrentUser): boolean {
  if (user.role === 'teacher') return true;
  if (typeof user.teacher_id === 'number' && user.teacher_id > 0) return true;
  if (user.is_teacher === true) return true;
  if (user.active_role === 'teacher') return true;
  if (user.roles?.includes('teacher')) return true;
  return false;
}

/** True when the account should use /teacher/* (not admin Staff Center). */
export function shouldUseTeacherWorkspace(user: CurrentUser | null): boolean {
  if (!user) return false;
  if (user.role === 'teacher') return true;
  if (user.role !== 'admin') return false;
  if (!hasTeacherMeIndicator(user)) return false;
  if (user.admin_kind && ADMIN_MANAGEMENT_KINDS.has(user.admin_kind)) return false;
  if (user.admin_kind === 'admin_staff') return true;
  return resolveTeacherId(user) != null;
}

export function teacherProfilePath(user: Pick<CurrentUser, 'teacher_id' | 'profile_id' | 'role'>): string {
  return '/teacher/profile';
}

export function isViewingOwnStaffUserId(
  sessionUser: Pick<CurrentUser, 'id'>,
  staffUserId: number,
): boolean {
  return sessionUser.id === staffUserId;
}

/** Admin-only HR/contact blocks — hidden from teachers viewing their own record. */
export function canViewStaffAdminPrivateFields(
  sessionUser: CurrentUser | null,
  staffUserId: number,
): boolean {
  if (!sessionUser) return false;
  if (shouldUseTeacherWorkspace(sessionUser) && isViewingOwnStaffUserId(sessionUser, staffUserId)) {
    return false;
  }
  if (sessionUser.role !== 'admin') return false;
  return true;
}

export function canViewTeacherAdminPrivateFields(
  sessionUser: CurrentUser | null,
  teacherId: number,
): boolean {
  if (!sessionUser) return false;
  if (shouldUseTeacherWorkspace(sessionUser) && resolveTeacherId(sessionUser) === teacherId) {
    return false;
  }
  if (sessionUser.role !== 'admin') return false;
  return true;
}
