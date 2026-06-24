import type { AdminSchoolBrandingSettingsSource } from '@/types/admin-school-branding';
import { hasEffectivePermission } from '@/lib/permissions/effective-permissions';
import type { CurrentUser } from '@/types/user';
import type { Permission } from '@/types/permissions';

/** Admin kinds allowed when school.manage_branding is not yet in /me. */
const SCHOOL_BRANDING_ADMIN_KINDS = new Set([
  'project_manager',
  'school_manager',
  'legacy_admin',
  'super_admin',
]);

export const SCHOOL_BRANDING_MANAGE_PERMISSION = 'school.manage_branding' as Permission;

export const SCHOOL_BRANDING_SAVE_AVAILABLE = true;

function hasBrandingAdminKindFallback(user: CurrentUser): boolean {
  if (user.is_super_admin) return true;
  const kind = user.admin_kind;
  return !!kind && SCHOOL_BRANDING_ADMIN_KINDS.has(kind);
}

export function canViewSchoolBrandingSettings(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (hasEffectivePermission(user, SCHOOL_BRANDING_MANAGE_PERMISSION)) return true;
  return hasBrandingAdminKindFallback(user);
}

export function canManageSchoolBrandingSettings(user: CurrentUser | null): boolean {
  return canViewSchoolBrandingSettings(user);
}

/** Save UI/API only when the admin Odoo contract responded (not public fallback). */
export function resolveSchoolBrandingSaveAvailable(
  user: CurrentUser | null,
  source: AdminSchoolBrandingSettingsSource,
): boolean {
  if (!user || source !== 'admin') return false;
  return SCHOOL_BRANDING_SAVE_AVAILABLE && canManageSchoolBrandingSettings(user);
}

export function isSchoolBrandingSettingsPath(pathname: string): boolean {
  return pathname.split('?')[0] === '/admin/settings/school-branding';
}
