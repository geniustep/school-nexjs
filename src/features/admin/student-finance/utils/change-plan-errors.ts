/** Map change-plan API error codes to i18n keys under admin.student360.financeWorkspace.changePlan.errors. */
export function changePlanErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'no_active_agreement':
      return 'admin.student360.financeWorkspace.changePlan.errors.noActiveAgreement';
    case 'effective_date_required':
      return 'admin.student360.financeWorkspace.changePlan.errors.effectiveDateRequired';
    case 'effective_date_outside_academic_year':
      return 'admin.student360.financeWorkspace.changePlan.errors.effectiveDateOutsideAcademicYear';
    case 'affected_periods_required':
      return 'admin.student360.financeWorkspace.changePlan.errors.affectedPeriodsRequired';
    case 'social_case_reason_required':
      return 'admin.student360.financeWorkspace.changePlan.errors.socialCaseReasonRequired';
    case 'confirm_replace_required':
      return 'admin.student360.financeWorkspace.changePlan.errors.confirmReplaceRequired';
    case 'confirm_financial_impact_required':
      return 'admin.student360.financeWorkspace.changePlan.errors.confirmFinancialImpactRequired';
    case 'same_fee_plan_no_discount':
      return 'admin.student360.financeWorkspace.changePlan.errors.sameFeePlanNoDiscount';
    case 'fee_plan_not_assignable':
      return 'admin.student360.financeWorkspace.changePlan.errors.feePlanNotAssignable';
    case 'fee_type_not_in_agreement':
      return 'admin.student360.financeWorkspace.changePlan.errors.feeTypeNotInAgreement';
    case 'no_future_periods_to_affect':
      return 'admin.student360.financeWorkspace.changePlan.errors.noFuturePeriodsToAffect';
    case 'plan_change_blocked_by_payments':
      return 'admin.student360.financeWorkspace.changePlan.errors.planChangeBlockedByPayments';
    case 'plan_change_blocked_by_receipts':
      return 'admin.student360.financeWorkspace.changePlan.errors.planChangeBlockedByReceipts';
    case 'plan_change_blocked_by_pending_cheques':
      return 'admin.student360.financeWorkspace.changePlan.errors.planChangeBlockedByPendingCheques';
    case 'legacy_special_adjustment_retired':
      return 'admin.student360.financeWorkspace.changePlan.errors.legacySpecialAdjustmentRetired';
    case 'agreement_change_forbidden':
      return 'admin.student360.financeWorkspace.changePlan.errors.agreementChangeForbidden';
    case 'agreement_activation_forbidden':
      return 'admin.student360.financeWorkspace.changePlan.errors.agreementActivationForbidden';
    case 'discount_exceeds_remaining':
      return 'admin.student360.financeWorkspace.changePlan.errors.discountExceedsRemaining';
    case 'agreement_totals_mismatch':
      return 'admin.student360.financeWorkspace.changePlan.errors.agreementTotalsMismatch';
    case 'forbidden':
      return 'admin.student360.financeWorkspace.changePlan.errors.forbidden';
    case 'unauthorized':
      return 'admin.student360.financeWorkspace.changePlan.errors.unauthorized';
    default:
      return null;
  }
}

export function resolveChangePlanErrorMessage(
  code: string | undefined,
  message: string | undefined,
  t: (key: string) => string,
): string {
  const key = changePlanErrorMessageKey(code);
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  return message && message !== code ? message : t('admin.student360.financeWorkspace.changePlan.errors.generic');
}
