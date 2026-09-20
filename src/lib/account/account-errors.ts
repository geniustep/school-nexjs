import type { ApiErrorBody } from '@/types/api';
import type { AccountWarning } from '@/types/account';
import type { AccountPasswordFieldErrors } from '@/lib/account/account-password-utils';

export const ACCOUNT_ERROR_KEYS: Record<string, string> = {
  duplicate_login: 'admin.account.errors.duplicateLogin',
  login_required: 'admin.account.errors.loginRequired',
  email_required_for_invite: 'admin.account.errors.emailRequiredForInvite',
  account_not_available: 'admin.account.errors.accountNotAvailable',
  invalid_email: 'admin.account.errors.invalidEmail',
  invalid_login: 'admin.account.errors.invalidLogin',
  invalid_password: 'admin.account.errors.invalidPassword',
  password_required: 'admin.account.errors.passwordRequired',
  password_too_weak: 'admin.account.errors.passwordTooWeak',
  weak_password: 'admin.account.errors.passwordTooWeak',
  password_policy_violation: 'admin.account.errors.passwordTooWeak',
  password_confirmation_mismatch: 'admin.account.errors.passwordMismatch',
  password_mismatch: 'admin.account.errors.passwordMismatch',
  account_already_exists: 'admin.account.errors.accountAlreadyExists',
  forbidden: 'admin.pageForbidden',
  permission_denied: 'admin.pageForbidden',
  not_found: 'errors.notFound',
  validation_error: 'errors.validationFailed',
};

export const ACCOUNT_WARNING_KEYS: Record<string, string> = {
  custom_login_preserved: 'admin.account.warnings.customLoginPreserved',
  invite_not_sent: 'admin.account.warnings.inviteNotSent',
};

export function mapAccountApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const code = String(error.code ?? '');
  const key = ACCOUNT_ERROR_KEYS[code];
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
\nexport function mapAccountApiFieldErrors(\n  error: ApiErrorBody,\n  t: (key: string) => string,\n): AccountPasswordFieldErrors {\n  const code = String(error.code ?? '');\n  const message = mapAccountApiError(error, t);\n\n  if (code === 'invalid_email' || code === 'email_required_for_invite') {\n    return { email: message };\n  }\n  if (code === 'duplicate_login' || code === 'invalid_login' || code === 'login_required') {\n    return { login: message };\n  }\n  if (\n    code === 'password_required' ||\n    code === 'invalid_password' ||\n    code === 'password_too_weak' ||\n    code === 'weak_password' ||\n    code === 'password_policy_violation'\n  ) {\n    return { password: message };\n  }\n  if (code === 'password_confirmation_mismatch' || code === 'password_mismatch') {\n    return { confirmPassword: message };\n  }\n  return {};\n}\n
export function mapAccountWarning(
  warning: AccountWarning,
  t: (key: string) => string,
): string {
  const key = ACCOUNT_WARNING_KEYS[warning.code];
  if (key) {
    const msg = t(key);
    if (msg !== key) return msg;
  }
  return warning.message?.trim() || warning.code;
}
