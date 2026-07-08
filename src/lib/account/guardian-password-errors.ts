import type { ApiErrorBody } from '@/types/api';

export const GUARDIAN_PASSWORD_ERROR_KEYS: Record<string, string> = {
  password_required: 'admin.guardianAccount.password.errors.passwordRequired',
  password_confirmation_mismatch: 'admin.guardianAccount.password.errors.confirmationMismatch',
  password_policy_violation: 'admin.guardianAccount.password.errors.policyViolation',
  password_too_weak: 'admin.guardianAccount.password.errors.policyViolation',
  guardian_not_found: 'admin.guardianAccount.password.errors.guardianNotFound',
  guardian_account_identity_mismatch: 'admin.guardianAccount.password.errors.identityMismatch',
  forbidden: 'admin.pageForbidden',
  permission_denied: 'admin.pageForbidden',
  not_found: 'errors.notFound',
  validation_error: 'errors.validationFailed',
};

export function mapGuardianPasswordApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const code = String(error.code ?? '');
  const key = GUARDIAN_PASSWORD_ERROR_KEYS[code];
  if (key) {
    const msg = t(key);
    if (msg !== key) return msg;
  }
  if (code === 'unauthenticated') return t('errors.sessionExpired');
  const message = error.message?.trim();
  if (message && !message.includes('<') && !message.toLowerCase().includes('traceback')) {
    return message;
  }
  return t('errors.serverError');
}
