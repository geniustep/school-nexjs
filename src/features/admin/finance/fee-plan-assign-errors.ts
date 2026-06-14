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

export function shouldReloadPlansOnAssignError(code: string | undefined): boolean {
  return code === 'invalid_fee_plan_state';
}

export function shouldReloadPlanLinesOnAssignError(code: string | undefined): boolean {
  return code === 'invalid_optional_line';
}
