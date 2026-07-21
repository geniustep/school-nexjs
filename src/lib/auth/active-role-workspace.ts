/**
 * Workspace role resolution from Odoo-confirmed active_role / available_roles.
 * Client-safe — no cookie or server I/O.
 */

import { LEGAL_ACTIVE_ROLES, type LegalActiveRole } from '@/lib/auth/active-role-transport';
import type { CurrentUser, Role, UserRoleOption } from '@/types/user';

const LEGAL_SET = new Set<string>(LEGAL_ACTIVE_ROLES);

export function isLegalActiveRole(value: string | null | undefined): value is LegalActiveRole {
  if (value == null) return false;
  return LEGAL_SET.has(value.trim().toLowerCase());
}

export function normalizeRoleCode(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

/** True when Odoo exposed more than one switchable role. */
export function isMultiRoleUser(
  user: Pick<CurrentUser, 'available_roles'> | null | undefined,
): boolean {
  return Array.isArray(user?.available_roles) && user.available_roles.length > 1;
}

export function shouldShowRoleSwitcher(
  user: Pick<CurrentUser, 'available_roles'> | null | undefined,
): boolean {
  return isMultiRoleUser(user);
}

export function listAvailableRoles(
  user: Pick<CurrentUser, 'available_roles' | 'roles' | 'role'> | null | undefined,
): UserRoleOption[] {
  if (!user) return [];
  if (Array.isArray(user.available_roles) && user.available_roles.length > 0) {
    return user.available_roles.filter(
      (r): r is UserRoleOption =>
        !!r && typeof r.code === 'string' && isLegalActiveRole(r.code),
    );
  }
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles
      .map((code) => normalizeRoleCode(code))
      .filter((code): code is string => !!code && isLegalActiveRole(code))
      .map((code) => ({ code, label: code }));
  }
  return isLegalActiveRole(user.role) ? [{ code: user.role, label: user.role }] : [];
}

export function userOwnsRole(
  user: Pick<CurrentUser, 'available_roles' | 'roles' | 'role'> | null | undefined,
  role: string,
): boolean {
  const code = normalizeRoleCode(role);
  if (!user || !code || !isLegalActiveRole(code)) return false;
  const available = listAvailableRoles(user);
  if (available.length > 0) {
    return available.some((r) => normalizeRoleCode(r.code) === code);
  }
  return user.role === code;
}

/**
 * Effective portal role: prefer Odoo-confirmed `active_role`, else `role`.
 * Does not invent ownership from admin_kind / teacher_id.
 */
export function resolveEffectiveRole(user: CurrentUser): Role {
  const active = normalizeRoleCode(user.active_role);
  if (active && isLegalActiveRole(active)) {
    return active;
  }
  return user.role;
}

/** Confirmed active role string for headers / labels. */
export function resolveConfirmedActiveRole(user: CurrentUser): LegalActiveRole {
  const effective = resolveEffectiveRole(user);
  return effective as LegalActiveRole;
}
