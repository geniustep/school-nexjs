/**
 * Effective admin permissions — honors permissions_mode and effective_permissions
 * from /me before falling back to explicit capability grants.
 *
 * Priority: effective_permissions (when present) → permissions[] → full_school /
 * full_platform compatibility for school-scoped codes.
 */

import type { PermissionsMode } from '@/types/academic-setup';
import type { Permission } from '@/types/permissions';
import type { AdminKind, CurrentUser } from '@/types/user';

/** Finance permissions that belong to the school tenant — granted by full_school. */
export const SCHOOL_FINANCE_PERMISSIONS: readonly Permission[] = [
  'finance.view',
  'finance.manage_fee_catalog',
  'finance.manage_fee_plans',
  'finance.assign_fees',
  'finance.manage_discounts',
  'finance.approve_discounts',
  'finance.collect_payments',
  'finance.cancel_payments',
  'finance.manage_billing_profile',
  'finance.view_billing_profile',
  'finance.view_payments',
  'finance.view_student_balance',
  'finance.view_cheques',
  'finance.manage_cheques',
  'finance.deposit_cheques',
  'finance.clear_cheques',
  'finance.reject_cheques',
  'finance.cancel_cheques',
] as const;

/** Platform / provider finance — never inferred from full_school on the frontend. */
export const FINANCE_PLATFORM_ONLY_PERMISSIONS: readonly Permission[] = [
  'finance.manage_settings',
] as const;

/** Known platform-only codes that may appear in effective_permissions before types catch up. */
export const FINANCE_PLATFORM_ONLY_ALIASES = [
  'finance.manage_payment_provider',
  'finance.manage_platform_gateway',
  'finance.manage_all_tenants',
  'finance.platform_reconciliation',
] as const;

const LEGACY_ADMIN_KIND_PERMISSIONS_MODE: Partial<Record<AdminKind, PermissionsMode>> = {
  school_manager: 'full_school',
  project_manager: 'full_platform',
  pedagogical_director: 'scoped',
  general_supervisor: 'scoped',
  admin_staff: 'assigned',
};

const SCHOOL_FINANCE_SET = new Set<string>(SCHOOL_FINANCE_PERMISSIONS);
const PLATFORM_FINANCE_SET = new Set<string>([
  ...FINANCE_PLATFORM_ONLY_PERMISSIONS,
  ...FINANCE_PLATFORM_ONLY_ALIASES,
]);

export function resolvePermissionsMode(
  user: Pick<CurrentUser, 'permissions_mode' | 'admin_kind'> | null | undefined,
): PermissionsMode | undefined {
  if (!user) return undefined;
  if (user.permissions_mode) return user.permissions_mode;
  if (!user.admin_kind) return undefined;
  return LEGACY_ADMIN_KIND_PERMISSIONS_MODE[user.admin_kind];
}

export function isPlatformOnlyPermission(permission: string): boolean {
  return PLATFORM_FINANCE_SET.has(permission);
}

export function isSchoolScopedFinancePermission(permission: string): boolean {
  return SCHOOL_FINANCE_SET.has(permission);
}

export function isSchoolScopedPermission(permission: string): boolean {
  return isSchoolScopedFinancePermission(permission);
}

export function resolveEffectiveAdminPermissions(
  user: CurrentUser | null | undefined,
): ReadonlySet<Permission> {
  const effective = new Set<Permission>();
  if (!user) return effective;

  const mode = resolvePermissionsMode(user);

  if (user.effective_permissions !== undefined) {
    for (const code of user.effective_permissions) {
      effective.add(code);
    }
    return effective;
  }

  for (const perm of user.permissions ?? []) {
    effective.add(perm);
  }

  if (mode === 'full_school') {
    for (const perm of SCHOOL_FINANCE_PERMISSIONS) {
      effective.add(perm);
    }
  }

  if (mode === 'full_platform') {
    for (const perm of SCHOOL_FINANCE_PERMISSIONS) {
      effective.add(perm);
    }
  }

  return effective;
}

export function hasEffectivePermission(
  user: CurrentUser | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;

  if (isPlatformOnlyPermission(permission)) {
    const mode = resolvePermissionsMode(user);
    if (mode === 'full_school') return false;
  }

  return resolveEffectiveAdminPermissions(user).has(permission);
}

export function canAccessFinanceDomain(user: CurrentUser | null | undefined): boolean {
  if (!user || user.role !== 'admin') return false;
  return hasEffectivePermission(user, 'finance.view');
}
