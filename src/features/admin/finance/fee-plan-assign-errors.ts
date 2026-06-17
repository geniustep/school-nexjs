/** Map assign-fee-plan API error codes to i18n keys under admin.finance.assignErrors. */
export function feePlanAssignErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'invalid_fee_plan':
      return 'admin.finance.assignErrors.invalidFeePlan';
    case 'invalid_fee_plan_state':
      return 'admin.finance.assignErrors.invalidFeePlanState';
    case 'invalid_optional_line':
      return 'admin.finance.assignErrors.invalidOptionalLine';
    case 'optional_line_plan_mismatch':
      return 'admin.finance.assignErrors.optionalLinePlanMismatch';
    case 'fee_plan_already_assigned':
      return 'admin.finance.assignErrors.feePlanAlreadyAssigned';
    case 'billing_profile_creation_failed':
      return 'admin.finance.assignErrors.billingProfileCreationFailed';
    case 'billing_partner_ambiguous':
      return 'admin.finance.assignErrors.billingPartnerAmbiguous';
    case 'billing_partner_invalid':
      return 'admin.finance.assignErrors.billingPartnerInvalid';
    case 'student_billing_scope_mismatch':
      return 'admin.finance.assignErrors.studentBillingScopeMismatch';
    case 'fee_plan_not_assignable':
      return 'admin.finance.assignErrors.feePlanNotAssignable';
    case 'student_not_eligible':
      return 'admin.finance.assignErrors.studentNotEligible';
    case 'fee_plan_line_pricing_inconsistent':
      return 'admin.finance.assignErrors.feePlanLinePricingInconsistent';
    case 'invalid_installment_schedule':
      return 'admin.finance.assignErrors.invalidInstallmentSchedule';
    case 'validation_error':
      return 'admin.finance.assignErrors.validationError';
    case 'forbidden':
      return 'admin.finance.assignErrors.forbidden';
    case 'not_found':
      return 'admin.finance.assignErrors.notFound';
    default:
      return null;
  }
}

const ALREADY_ASSIGNED_PATTERNS = [
  'already assigned',
  'already_assigned',
  'fee_plan_already_assigned',
  'مسند',
  'مسبق',
];

export function resolveAssignErrorMessage(
  code: string | undefined,
  message: string | undefined,
  t: (key: string) => string,
): string {
  const key = feePlanAssignErrorMessageKey(code);
  if (key) return t(key);

  if (code === 'business_error') {
    const normalized = (message ?? '').toLowerCase();
    if (ALREADY_ASSIGNED_PATTERNS.some((pattern) => normalized.includes(pattern))) {
      return t('admin.finance.assignErrors.feePlanAlreadyAssigned');
    }
  }

  return message && message !== 'business_error' ? message : t('admin.finance.assignFlow.assignFailed');
}

export function shouldReloadPlansOnAssignError(code: string | undefined): boolean {
  return code === 'invalid_fee_plan_state';
}

export function shouldReloadPlanLinesOnAssignError(code: string | undefined): boolean {
  return code === 'invalid_optional_line';
}
