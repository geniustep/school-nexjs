import type { CurrentUser } from '@/types/user';

const REQUEST_TYPE_ADMIN_KINDS = new Set([
  'project_manager',
  'school_manager',
  'legacy_admin',
  'super_admin',
]);

/** Mirrors Odoo school.admin.request.type configuration gate. */
export function canViewAdminRequestTypeSettings(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (user.is_super_admin) return true;
  return !!user.admin_kind && REQUEST_TYPE_ADMIN_KINDS.has(user.admin_kind);
}
