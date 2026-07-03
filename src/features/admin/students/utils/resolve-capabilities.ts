import { canViewFinance } from '@/lib/permissions/finance';
import {
  canManageStudentGuardianLinks,
  canUpdateStudents,
  hasUserCapability,
} from '@/lib/permissions/academic-capabilities';
import type { CurrentUser } from '@/types/user';
import type { StudentCapabilities } from '@/types/student-360';
import type { StudentFinanceCapabilities } from '@/types/student-finance';

function permissionFallback(user: CurrentUser | null): StudentCapabilities {
  return {
    can_manage: canUpdateStudents(user),
    can_manage_guardians: canManageStudentGuardianLinks(user),
    can_view_finance: canViewFinance(user),
    can_view_documents:
      hasUserCapability(user, 'students.documents.view') ||
      hasUserCapability(user, 'students.documents.manage'),
    can_manage_documents: hasUserCapability(user, 'students.documents.manage'),
    can_view_health:
      hasUserCapability(user, 'students.health.view') ||
      hasUserCapability(user, 'students.health.manage'),
    can_manage_health: hasUserCapability(user, 'students.health.manage'),
  };
}

function mergeCapabilityFlag(apiValue: boolean | undefined, fallbackValue: boolean): boolean {
  return apiValue === true || fallbackValue;
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
    can_manage: mergeCapabilityFlag(apiCaps.can_manage, fallback.can_manage),
    can_manage_guardians: mergeCapabilityFlag(
      apiCaps.can_manage_guardians,
      fallback.can_manage_guardians,
    ),
    can_view_documents: mergeCapabilityFlag(
      apiCaps.can_view_documents,
      fallback.can_view_documents === true,
    ),
    can_manage_documents: mergeCapabilityFlag(
      apiCaps.can_manage_documents,
      fallback.can_manage_documents === true,
    ),
    can_view_health: mergeCapabilityFlag(apiCaps.can_view_health, fallback.can_view_health === true),
    can_manage_health: mergeCapabilityFlag(
      apiCaps.can_manage_health,
      fallback.can_manage_health === true,
    ),
    can_view_finance: mergeCapabilityFlag(apiCaps.can_view_finance, fallback.can_view_finance),
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
