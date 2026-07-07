export function billingAuthorityChangeErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'billing_authority_target_invalid':
      return 'admin.student360.financeWorkspace.billingAuthorityChange.errors.targetInvalid';
    case 'billing_authority_confirmation_required':
      return 'admin.student360.financeWorkspace.billingAuthorityChange.errors.confirmationRequired';
    case 'billing_authority_reason_required':
      return 'admin.student360.financeWorkspace.billingAuthorityChange.errors.reasonRequired';
    case 'billing_authority_unresolved':
      return 'admin.student360.financeWorkspace.billingAuthorityChange.errors.unresolved';
    case 'billing_authority_change_blocked':
      return 'admin.student360.financeWorkspace.billingAuthorityChange.errors.changeBlocked';
    case 'forbidden':
      return 'admin.student360.financeWorkspace.billingAuthorityChange.errors.forbidden';
    case 'unauthorized':
      return 'admin.student360.financeWorkspace.billingAuthorityChange.errors.unauthorized';
    default:
      return null;
  }
}

export function resolveBillingAuthorityChangeErrorMessage(
  code: string | undefined,
  message: string | undefined,
  t: (key: string) => string,
): string {
  const key = billingAuthorityChangeErrorMessageKey(code);
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  return message && message !== code
    ? message
    : t('admin.student360.financeWorkspace.billingAuthorityChange.errors.generic');
}
