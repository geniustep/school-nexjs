/** Map agreement-amendment API error codes to i18n keys. */
export function agreementAmendmentErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'reason_required':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.reasonRequired';
    case 'agreement_not_found':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.agreementNotFound';
    case 'agreement_not_active':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.agreementNotActive';
    case 'agreement_cancelled':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.agreementCancelled';
    case 'cross_school_forbidden':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.crossSchoolForbidden';
    case 'billing_calendar_required':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.billingCalendarRequired';
    case 'no_open_periods':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.noOpenPeriods';
    case 'locked_financial_records':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.lockedFinancialRecords';
    case 'amendment_not_allowed':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.amendmentNotAllowed';
    case 'invalid_operation_type':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.invalidOperationType';
    case 'invalid_effective_period':
    case 'effective_period_not_found':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.invalidEffectivePeriod';
    case 'effective_period_required':
      return 'admin.student360.financeWorkspace.agreementAmendment.errors.effectivePeriodRequired';
    default:
      return null;
  }
}

export function resolveAgreementAmendmentErrorMessage(
  code: string | undefined,
  message: string | undefined,
  t: (key: string) => string,
): string {
  const key = agreementAmendmentErrorMessageKey(code);
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  if (message && message !== code) return message;
  return t('admin.student360.financeWorkspace.agreementAmendment.errors.generic');
}
