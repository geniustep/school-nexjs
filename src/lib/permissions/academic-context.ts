/**
 * Academic Context + Terms capability gates — honors Odoo school.admin.capability codes.
 * UX only; Backend remains the authority.
 */

import { hasUserCapability } from '@/lib/permissions/academic-capabilities';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import type { CurrentUser } from '@/types/user';

export const ACADEMIC_CONTEXT_VIEW_CAPABILITY = 'academic.context.view';
export const ACADEMIC_TERMS_MANAGE_CAPABILITY = 'academic.terms.manage';

export function canViewAcademicContext(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  if (hasUserCapability(user, ACADEMIC_CONTEXT_VIEW_CAPABILITY)) return true;
  // Operational pages already gated; allow context options when academic setup is visible.
  return canViewAcademicSetup(user);
}

export function canManageAcademicTerms(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, ACADEMIC_TERMS_MANAGE_CAPABILITY);
}

export function canViewAcademicTerms(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  return canManageAcademicTerms(user) || canViewAcademicContext(user) || canViewAcademicSetup(user);
}
