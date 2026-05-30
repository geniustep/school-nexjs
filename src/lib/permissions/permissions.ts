// Permission helpers. Frontend permission checks are for UX only — the API
// enforces security server-side (API_REPORT.md §6, "Never rely on permissions
// alone for security").

import type { CurrentUser } from '@/types/user';
import type { Permission } from '@/types/permissions';

export function hasPermission(user: CurrentUser | null, perm: Permission): boolean {
  if (!user) return false;
  return user.permissions?.includes(perm) ?? false;
}

export function hasAnyPermission(
  user: CurrentUser | null,
  perms: Permission[],
): boolean {
  if (!user) return false;
  return perms.some((p) => hasPermission(user, p));
}

export function hasAllPermissions(
  user: CurrentUser | null,
  perms: Permission[],
): boolean {
  if (!user) return false;
  return perms.every((p) => hasPermission(user, p));
}
