// Server-side admin permission gates — run before sensitive data fetch.
// Client AdminPageGuard remains UX-only; Odoo remains final authorization.

import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import {
  isSchoolAccessSuspended,
} from '@/lib/auth/admin-access-status';
import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';
import { hasEffectivePermission } from '@/lib/permissions/effective-permissions';
import { homeForUser } from '@/lib/routes/role-routes';
import type { CurrentUser } from '@/types/user';
import type { Permission } from '@/types/permissions';

export { isSchoolAccessSuspended, isSchoolAccessSuspendedErrorCode } from '@/lib/auth/admin-access-status';


export type RequireAdminPermissionOptions = {
  /** When true (default), redirect teachers using workspace away from admin. */
  blockTeacherWorkspace?: boolean;
};

/**
 * Authenticated admin + effective permission (Default DENY).
 * Call before any sensitive server fetch in layouts/pages.
 */
export async function requireAdminPermission(
  permission: Permission,
  opts?: RequireAdminPermissionOptions,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (opts?.blockTeacherWorkspace !== false && shouldUseTeacherWorkspace(user)) {
    redirect(homeForUser(user));
  }

  if (user.role !== 'admin') {
    redirect(homeForUser(user));
  }

  if (isSchoolAccessSuspended(user)) {
    redirect('/admin/access-suspended');
  }

  if (!hasEffectivePermission(user, permission)) {
    redirect('/admin/forbidden');
  }

  return user;
}

/** Require any one of the listed effective permissions (Default DENY if none match). */
export async function requireAdminAnyPermission(
  permissions: readonly Permission[],
  opts?: RequireAdminPermissionOptions,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (opts?.blockTeacherWorkspace !== false && shouldUseTeacherWorkspace(user)) {
    redirect(homeForUser(user));
  }

  if (user.role !== 'admin') {
    redirect(homeForUser(user));
  }

  if (isSchoolAccessSuspended(user)) {
    redirect('/admin/access-suspended');
  }

  const allowed = permissions.some((p) => hasEffectivePermission(user, p));
  if (!allowed) {
    redirect('/admin/forbidden');
  }

  return user;
}

/** Predicate for custom capability checks (staff center, branding, etc.). */
export async function requireAdminAccess(
  predicate: (user: CurrentUser) => boolean,
  opts?: RequireAdminPermissionOptions,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (opts?.blockTeacherWorkspace !== false && shouldUseTeacherWorkspace(user)) {
    redirect(homeForUser(user));
  }

  if (user.role !== 'admin') {
    redirect(homeForUser(user));
  }

  if (isSchoolAccessSuspended(user)) {
    redirect('/admin/access-suspended');
  }

  if (!predicate(user)) {
    redirect('/admin/forbidden');
  }

  return user;
}
