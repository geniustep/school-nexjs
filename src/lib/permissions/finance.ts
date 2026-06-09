import { hasAnyPermission, hasPermission } from '@/lib/permissions/permissions';
import type { CurrentUser } from '@/types/user';
import type { Permission } from '@/types/permissions';

export const FINANCE_VIEW: Permission = 'finance.view';

export const FINANCE_MANAGE_CATALOG: Permission = 'finance.manage_fee_catalog';
export const FINANCE_MANAGE_PLANS: Permission = 'finance.manage_fee_plans';
export const FINANCE_ASSIGN_FEES: Permission = 'finance.assign_fees';
export const FINANCE_MANAGE_DISCOUNTS: Permission = 'finance.manage_discounts';
export const FINANCE_COLLECT: Permission = 'finance.collect_payments';
export const FINANCE_CANCEL_PAYMENTS: Permission = 'finance.cancel_payments';
export const FINANCE_MANAGE_BILLING: Permission = 'finance.manage_billing_profile';
export const FINANCE_VIEW_BILLING: Permission = 'finance.view_billing_profile';
export const FINANCE_VIEW_PAYMENTS: Permission = 'finance.view_payments';
export const FINANCE_VIEW_STUDENT_BALANCE: Permission = 'finance.view_student_balance';

export function canViewFinance(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_VIEW);
}

export function canViewStudentBalance(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_VIEW_STUDENT_BALANCE);
}

export function canViewPayments(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_VIEW_PAYMENTS);
}

export function canManageFeeCatalog(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_MANAGE_CATALOG);
}

export function canManageFeePlans(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_MANAGE_PLANS);
}

export function canAssignFees(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_ASSIGN_FEES);
}

export function canManageDiscounts(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_MANAGE_DISCOUNTS);
}

export function canCollectPayments(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_COLLECT);
}

export function canCancelPayments(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_CANCEL_PAYMENTS);
}

export function canManageBillingProfile(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_MANAGE_BILLING);
}

export function canViewBillingProfile(user: CurrentUser | null): boolean {
  return hasAnyPermission(user, [FINANCE_VIEW_BILLING, FINANCE_MANAGE_BILLING]);
}

export function canViewFinanceSetup(user: CurrentUser | null): boolean {
  return hasAnyPermission(user, [FINANCE_MANAGE_CATALOG, FINANCE_MANAGE_PLANS]);
}
