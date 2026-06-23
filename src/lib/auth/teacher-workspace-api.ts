// Teacher workspace BFF/UI helpers — detect Odoo blocks for Smart Staff admin sessions.

import type { ApiErrorBody } from '@/types/api';

const ODOO_ADMIN_ON_TEACHER_ENDPOINT =
  /admin accounts must use.*\/admin\/|admin accounts must use.*admin endpoints/i;

/** Odoo rejects role=admin sessions on /teacher/* even when roles[] includes teacher. */
export function isOdooAdminRoleTeacherEndpointBlock(message?: string | null): boolean {
  return ODOO_ADMIN_ON_TEACHER_ENDPOINT.test(message ?? '');
}

/**
 * Teacher workspace pages should show a linking/assignment state — not "الوصول مقيّد".
 * Applies to Odoo 403 on /teacher/* and our normalized BFF code.
 */
export function isTeacherWorkspaceLoadError(error: ApiErrorBody | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'teacher_workspace_unavailable') return true;
  if (error.code === 'forbidden' || error.code === 'permission_denied') {
    if (isOdooAdminRoleTeacherEndpointBlock(error.message)) return true;
    const status = error.details?.status;
    if (status === 403) return true;
  }
  return false;
}
