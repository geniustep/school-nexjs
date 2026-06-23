// Teacher workspace routing — Smart Staff teachers may arrive with role=admin + teacher_id.

import type { AdminBinding, CurrentUser } from '@/types/user';

const ADMIN_MANAGEMENT_KINDS = new Set([
  'project_manager',
  'school_manager',
  'general_supervisor',
  'legacy_admin',
  'super_admin',
]);

function resolveTeacherProfileIdFromBindings(bindings?: AdminBinding[]): number | null {
  if (!bindings?.length) return null;
  for (const binding of bindings) {
    const candidate = binding.teacher_profile_id ?? binding.teacher_id;
    if (typeof candidate === 'number' && candidate > 0) return candidate;
  }
  return null;
}

export function resolveTeacherId(
  user: Pick<CurrentUser, 'teacher_id' | 'profile_id' | 'role' | 'bindings' | 'is_teacher'>,
): number | null {
  if (typeof user.teacher_id === 'number' && user.teacher_id > 0) return user.teacher_id;

  const fromBindings = resolveTeacherProfileIdFromBindings(user.bindings);
  if (fromBindings != null) return fromBindings;

  if (user.role === 'teacher' && typeof user.profile_id === 'number' && user.profile_id > 0) {
    return user.profile_id;
  }

  if (user.is_teacher === true && typeof user.profile_id === 'number' && user.profile_id > 0) {
    return user.profile_id;
  }

  return null;
}

/** True when the session is linked to a concrete teacher profile id. */
export function hasLinkedTeacherProfile(
  user: Pick<CurrentUser, 'teacher_id' | 'profile_id' | 'role' | 'bindings' | 'is_teacher'> | null,
): boolean {
  if (!user) return false;
  return resolveTeacherId(user) != null;
}

/** True when the account should use /teacher/* (not admin Staff Center). */
export function shouldUseTeacherWorkspace(user: CurrentUser | null): boolean {
  if (!user) return false;
  if (user.role === 'teacher') return true;
  if (user.role !== 'admin') return false;
  if (user.admin_kind && ADMIN_MANAGEMENT_KINDS.has(user.admin_kind)) return false;
  return hasLinkedTeacherProfile(user);
}

export function teacherProfilePath(_user: Pick<CurrentUser, 'teacher_id' | 'profile_id' | 'role'>): string {
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
