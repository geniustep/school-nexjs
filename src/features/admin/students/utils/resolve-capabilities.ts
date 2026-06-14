import { hasPermission } from '@/lib/permissions/permissions';
import { canViewFinance } from '@/lib/permissions/finance';
import type { CurrentUser } from '@/types/user';
import type { StudentCapabilities } from '@/types/student-360';
import type { StudentFinanceCapabilities } from '@/types/student-finance';

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

export function canViewStudentFinance(caps: StudentCapabilities): boolean {
  return caps.can_view_finance === true;
}

export function canViewStudentPayments(
  caps: StudentCapabilities,
  financeCaps?: StudentFinanceCapabilities | null,
): boolean {
  if (financeCaps) return financeCaps.can_view_payments === true;
  return caps.can_view_payments === true;
}

export function canCollectStudentPayments(
  caps: StudentCapabilities,
  financeCaps?: StudentFinanceCapabilities | null,
): boolean {
  if (financeCaps) return financeCaps.can_collect === true;
  return caps.can_collect_payments === true;
}

export function canAssignStudentFees(
  caps: StudentCapabilities,
  financeCaps?: StudentFinanceCapabilities | null,
): boolean {
  if (financeCaps) return financeCaps.can_assign_fees === true;
  return caps.can_assign_fees === true;
}

export function canManageStudentBillingProfile(
  caps: StudentCapabilities,
  financeCaps?: StudentFinanceCapabilities | null,
): boolean {
  if (financeCaps) return financeCaps.can_manage_billing_profile === true;
  return caps.can_manage_billing_profile === true;
}
