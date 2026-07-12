import type { CurrentUser } from '@/types/user';

/** True only when Backend explicitly sent school_access_suspended on /me. */
export function isSchoolAccessSuspended(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  return user.school_access_suspended === true;
}

/** Stable Odoo/BFF error code for suspended admin access (when exposed). */
export function isSchoolAccessSuspendedErrorCode(code: string | null | undefined): boolean {
  return code === 'school_access_suspended' || code === 'admin_access_suspended';
}
