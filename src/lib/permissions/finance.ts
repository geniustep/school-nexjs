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

export const FINANCE_VIEW_CHEQUES: Permission = 'finance.view_cheques';
export const FINANCE_MANAGE_CHEQUES: Permission = 'finance.manage_cheques';
export const FINANCE_DEPOSIT_CHEQUES: Permission = 'finance.deposit_cheques';
export const FINANCE_CLEAR_CHEQUES: Permission = 'finance.clear_cheques';
export const FINANCE_REJECT_CHEQUES: Permission = 'finance.reject_cheques';
export const FINANCE_CANCEL_CHEQUES: Permission = 'finance.cancel_cheques';

export const FINANCE_VIEW_CASH_SESSIONS: Permission = 'finance.view_cash_sessions';
export const FINANCE_OPEN_CASH_SESSION: Permission = 'finance.open_cash_session';
export const FINANCE_CLOSE_CASH_SESSION: Permission = 'finance.close_cash_session';
export const FINANCE_REOPEN_CASH_SESSION: Permission = 'finance.reopen_cash_session';
export const FINANCE_MANAGE_CASH_MOVEMENTS: Permission = 'finance.manage_cash_movements';
export const FINANCE_APPROVE_CASH_DIFFERENCE: Permission = 'finance.approve_cash_difference';
export const FINANCE_PRINT_CASH_CLOSURE: Permission = 'finance.print_cash_closure';

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

export function canViewCheques(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_VIEW_CHEQUES);
}

export function canDepositCheques(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_DEPOSIT_CHEQUES);
}

export function canClearCheques(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_CLEAR_CHEQUES);
}

export function canRejectCheques(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_REJECT_CHEQUES);
}

export function canCancelCheques(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_CANCEL_CHEQUES);
}

export function canViewFinanceAgreements(user: CurrentUser | null): boolean {
  return hasAnyPermission(user, [FINANCE_VIEW, FINANCE_VIEW_STUDENT_BALANCE]);
}

export function canViewFinanceInstallments(user: CurrentUser | null): boolean {
  return hasAnyPermission(user, [FINANCE_VIEW, FINANCE_VIEW_STUDENT_BALANCE]);
}

export function canViewFinanceServices(user: CurrentUser | null): boolean {
  return hasAnyPermission(user, [
    FINANCE_VIEW,
    FINANCE_MANAGE_CATALOG,
    FINANCE_MANAGE_PLANS,
  ]);
}

export function canViewCashSessions(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_VIEW_CASH_SESSIONS);
}

export function canOpenCashSession(user: CurrentUser | null): boolean {
  return hasPermission(user, FINANCE_OPEN_CASH_SESSION);
}
