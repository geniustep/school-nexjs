/** Map reset-financial-agreement API error codes to i18n keys. */
export function resetFinancialAgreementErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'reset_reason_required':
      return 'admin.student360.financeWorkspace.agreementContext.reset.errors.reasonRequired';
    case 'financial_impact_exists':
      return 'admin.student360.financeWorkspace.agreementContext.reset.errors.financialImpactExists';
    case 'fee_plan_not_found':
      return 'admin.student360.financeWorkspace.agreementContext.reset.errors.feePlanNotFound';
    case 'agreement_not_found':
      return 'admin.student360.financeWorkspace.agreementContext.reset.errors.agreementNotFound';
    case 'agreement_reset_not_allowed':
      return 'admin.student360.financeWorkspace.agreementContext.reset.errors.notAllowed';
    default:
      return null;
  }
}

export function resolveResetFinancialAgreementErrorMessage(
  code: string | undefined,
  message: string | undefined,
  t: (key: string) => string,
): string {
  const key = resetFinancialAgreementErrorMessageKey(code);
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  if (message && message !== code) return message;
  return t('admin.student360.financeWorkspace.agreementContext.reset.errors.generic');
}
