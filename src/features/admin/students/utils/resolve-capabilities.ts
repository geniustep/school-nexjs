import { hasPermission } from '@/lib/permissions/permissions';
import { canViewFinance } from '@/lib/permissions/finance';
import type { CurrentUser } from '@/types/user';
import type { StudentCapabilities } from '@/types/student-360';

function permissionFallback(user: CurrentUser | null): StudentCapabilities {
  return {
    can_manage: hasPermission(user, 'manage_students'),
    can_manage_guardians:
      hasPermission(user, 'manage_parents') || hasPermission(user, 'manage_students'),
    can_view_finance: canViewFinance(user),
    can_view_documents: false,
    can_manage_documents: false,
    can_view_health: false,
    can_manage_health: false,
  };
}

export function resolveStudentCapabilities(
  apiCaps: StudentCapabilities | undefined,
  user: CurrentUser | null,
): StudentCapabilities {
  const fallback = permissionFallback(user);
  if (!apiCaps) return fallback;
  return {
    ...fallback,
    ...apiCaps,
  };
}

export function canViewStudentDocuments(caps: StudentCapabilities): boolean {
  return caps.can_view_documents === true;
}

export function canManageStudentDocuments(caps: StudentCapabilities): boolean {
  return caps.can_manage_documents === true;
}

export function canViewStudentHealth(caps: StudentCapabilities): boolean {
  return caps.can_view_health === true;
}

export function canManageStudentHealth(caps: StudentCapabilities): boolean {
  return caps.can_manage_health === true;
}
